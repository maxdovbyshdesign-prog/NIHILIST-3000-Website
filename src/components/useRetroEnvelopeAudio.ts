import { useCallback, useEffect, useRef } from "react";

export type EnvelopeSoundUrls = {
  open: string;
  pageSwitch: [string, string];
};

type SoundKey = "open" | "page-1" | "page-2";
type PreparedSound = { buffer: AudioBuffer; volume: number };
type AudioState = {
  context: AudioContext;
  sounds: Map<SoundKey, PreparedSound>;
  disposed: boolean;
};

const RETRO_SAMPLE_RATE = 18_000;
const AMBIENT_VOLUME = 0.65;

async function prepareSound(
  context: AudioContext,
  response: Response,
  key: SoundKey,
): Promise<PreparedSound> {
  if (!response.ok) throw new Error(`Sound request failed: ${response.status}`);

  const decoded = await context.decodeAudioData(await response.arrayBuffer());
  const offline = new OfflineAudioContext(
    1,
    Math.max(1, Math.ceil(decoded.duration * RETRO_SAMPLE_RATE)),
    RETRO_SAMPLE_RATE,
  );
  const source = offline.createBufferSource();
  source.buffer = decoded;

  const highPass = offline.createBiquadFilter();
  highPass.type = "highpass";
  highPass.frequency.value = 170;

  const lowPass = offline.createBiquadFilter();
  lowPass.type = "lowpass";
  lowPass.frequency.value = 4_300;

  // A little quantisation on a mono, low-rate render gives the paper a
  // deliberately crunchy game-audio texture without obscuring the sample.
  const quantiser = offline.createWaveShaper();
  const curve = new Float32Array(2_048);
  for (let i = 0; i < curve.length; i += 1) {
    const input = (i / (curve.length - 1)) * 2 - 1;
    const saturated = Math.tanh(input * 1.2) / Math.tanh(1.2);
    curve[i] = Math.round(saturated * 64) / 64;
  }
  quantiser.curve = curve;
  quantiser.oversample = "none";

  const compressor = offline.createDynamicsCompressor();
  compressor.threshold.value = -28;
  compressor.knee.value = 12;
  compressor.ratio.value = 3;
  compressor.attack.value = 0.004;
  compressor.release.value = 0.15;

  source.connect(highPass);
  highPass.connect(lowPass);
  lowPass.connect(quantiser);
  quantiser.connect(compressor);
  compressor.connect(offline.destination);
  source.start();

  const buffer = await offline.startRendering();
  const samples = buffer.getChannelData(0);
  let sumOfSquares = 0;
  let peak = 0;
  for (const sample of samples) {
    sumOfSquares += sample * sample;
    peak = Math.max(peak, Math.abs(sample));
  }

  const rms = Math.sqrt(sumOfSquares / samples.length);
  const targetRms = key === "open" ? 0.047 : 0.036;
  const volume = AMBIENT_VOLUME * Math.min(0.8, targetRms / Math.max(rms, 0.001), 0.3 / Math.max(peak, 0.001));
  return { buffer, volume };
}

export function useRetroEnvelopeAudio(urls: EnvelopeSoundUrls) {
  const stateRef = useRef<AudioState | null>(null);

  useEffect(() => {
    if (typeof AudioContext === "undefined" || typeof OfflineAudioContext === "undefined") return;

    const context = new AudioContext({ latencyHint: "interactive" });
    const controller = new AbortController();
    const state: AudioState = { context, sounds: new Map(), disposed: false };
    stateRef.current = state;

    const files: Array<[SoundKey, string]> = [
      ["open", urls.open],
      ["page-1", urls.pageSwitch[0]],
      ["page-2", urls.pageSwitch[1]],
    ];
    for (const [key, url] of files) {
      void fetch(url, { signal: controller.signal })
        .then((response) => prepareSound(context, response, key))
        .then((sound) => {
          if (!state.disposed) state.sounds.set(key, sound);
        })
        .catch((error: unknown) => {
          if (!state.disposed) console.warn(`Could not load ${key} sound`, error);
        });
    }

    return () => {
      state.disposed = true;
      controller.abort();
      if (stateRef.current === state) stateRef.current = null;
      void context.close();
    };
  }, [urls.open, urls.pageSwitch[0], urls.pageSwitch[1]]);

  return useCallback((key: SoundKey, onStarted?: () => void) => {
    const state = stateRef.current;
    const sound = state?.sounds.get(key);
    if (!state || !sound || state.disposed) return;

    const requestedAt = performance.now();
    const start = () => {
      // A hover may be blocked by browser autoplay policy. Never replay it
      // later, out of sync with the actual envelope or paper movement.
      if (state.disposed || state.context.state !== "running" || performance.now() - requestedAt > 300) return;

      const { context } = state;
      const source = context.createBufferSource();
      const gain = context.createGain();
      const now = context.currentTime;
      const end = now + sound.buffer.duration;
      source.buffer = sound.buffer;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(sound.volume, now + 0.006);
      gain.gain.setValueAtTime(sound.volume, Math.max(now + 0.006, end - 0.025));
      gain.gain.linearRampToValueAtTime(0, end);
      source.connect(gain);
      gain.connect(context.destination);
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
      };
      source.start(now);
      onStarted?.();
    };

    if (state.context.state === "running") start();
    else void state.context.resume().then(start).catch(() => {});
  }, []);
}
