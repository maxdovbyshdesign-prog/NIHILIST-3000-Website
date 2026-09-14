import { Canvas, type ThreeEvent, useFrame, useLoader } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ACESFilmicToneMapping,
  BufferAttribute,
  ClampToEdgeWrapping,
  DoubleSide,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  SRGBColorSpace,
  TextureLoader,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { Track } from "../content/releases";
import { useRetroEnvelopeAudio, type EnvelopeSoundUrls } from "./useRetroEnvelopeAudio";

type Props = {
  modelUrl: string;
  textureUrl: string;
  paperTextureUrls: string[];
  sounds: EnvelopeSoundUrls;
  tracks: Track[];
  hint: string;
  touchHint: string;
  closeText: string;
};

type EnvelopeProps = {
  modelUrl: string;
  textureUrl: string;
  paperTextureUrls: string[];
  desktopLayout: boolean;
  tabletLayout: boolean;
  open: boolean;
  activeTrack: number | null;
  onEnvelopeEnter: () => void;
  onToggleOpen: () => void;
  onPaperHover: (index: number) => void;
  onPaperClick: (index: number) => void;
  onPaperTap: (index: number) => void;
};

function damp(current: number, target: number, speed: number, delta: number) {
  return MathUtils.damp(current, target, speed, delta);
}

function applyEnvelopeAtlasUv(mesh: Mesh, region: "body" | "valve") {
  const geometry = mesh.geometry;
  const position = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  if (!position || !normal) return;

  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (!bounds) return;

  const xRange = bounds.max.x - bounds.min.x;
  const zRange = bounds.max.z - bounds.min.z;
  const yMiddle = (bounds.min.y + bounds.max.y) * 0.5;
  const uv = new Float32Array(position.count * 2);

  const frontU = { min: 1 / 800, max: 404 / 800 };
  const backU = { min: 408 / 800, max: 799 / 800 };
  const bodyV = { min: 1 / 676, max: (676 - 65) / 676 };
  const valveV = { min: (676 - 61) / 676, max: (676 - 1) / 676 };
  const vRange = region === "body" ? bodyV : valveV;

  for (let index = 0; index < position.count; index += 1) {
    const normalY = normal.getY(index);
    const isFront = normalY < -0.5 || (Math.abs(normalY) <= 0.5 && position.getY(index) < yMiddle);
    const uRange = isFront ? frontU : backU;
    const horizontal = (bounds.max.x - position.getX(index)) / xRange;
    const vertical = (bounds.max.z - position.getZ(index)) / zRange;
    uv[index * 2] = MathUtils.lerp(uRange.min, uRange.max, horizontal);
    uv[index * 2 + 1] = MathUtils.lerp(vRange.min, vRange.max, vertical);
  }

  geometry.setAttribute("uv", new BufferAttribute(uv, 2));
  geometry.attributes.uv.needsUpdate = true;
}

function EnvelopeModel({
  modelUrl,
  textureUrl,
  paperTextureUrls,
  desktopLayout,
  tabletLayout,
  open,
  activeTrack,
  onEnvelopeEnter,
  onToggleOpen,
  onPaperHover,
  onPaperClick,
  onPaperTap,
}: EnvelopeProps) {
  const gltf = useLoader(GLTFLoader, modelUrl);
  const envelopeTexture = useLoader(TextureLoader, textureUrl);
  const paperTextures = useLoader(TextureLoader, paperTextureUrls);
  const interactiveGroup = useRef<Group>(null);
  const drag = useRef({
    active: false,
    moved: false,
    pointerId: -1,
    paperIndex: null as number | null,
    startedOpen: false,
    pointerType: "mouse",
    startX: 0,
    startY: 0,
    rotationX: 0,
    rotationY: 0,
  });
  const rotationTarget = useRef({ x: 0, y: 0 });
  const paperPressStartedOpen = useRef(false);
  const lastPointerWasTouch = useRef(false);
  const foldProgress = useRef(0);

  const scene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((object) => {
      if (object instanceof Mesh) object.geometry = object.geometry.clone();
    });
    return clone;
  }, [gltf.scene]);
  const body = useMemo(() => scene.getObjectByName("body") as Mesh | null, [scene]);
  const valve = useMemo(() => scene.getObjectByName("valve") as Mesh | null, [scene]);
  const valvePivotZ = useMemo(() => valve?.position.z ?? 0, [valve]);
  const paperTemplate = useMemo(
    () => scene.getObjectByName("paper") as Mesh | null,
    [scene],
  );

  const envelopeMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#ffffff",
        emissive: "#000000",
        emissiveIntensity: 0,
        roughness: 0.9,
        metalness: 0,
        map: envelopeTexture,
        side: DoubleSide,
      }),
    [envelopeTexture],
  );
  const valveMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#ffffff",
        emissive: "#000000",
        emissiveIntensity: 0,
        roughness: 0.9,
        metalness: 0,
        map: envelopeTexture,
        side: DoubleSide,
      }),
    [envelopeTexture],
  );
  const paperMaterials = useMemo(
    () =>
      paperTextures.map(
        (texture) =>
          new MeshStandardMaterial({
            color: "#ffffff",
            roughness: 0.98,
            metalness: 0,
            map: texture,
            transparent: true,
            alphaTest: 0.02,
            side: DoubleSide,
          }),
      ),
    [paperTextures],
  );

  const paperCopies = useMemo(() => {
    if (!paperTemplate) return [];
    return paperMaterials.map((material, index) => {
      const copy = paperTemplate.clone() as Mesh;
      copy.name = `track-paper-${index + 1}`;
      copy.material = material;
      copy.visible = true;
      copy.renderOrder = 3 + index;
      return copy;
    });
  }, [paperMaterials, paperTemplate]);

  useEffect(() => {
    envelopeTexture.colorSpace = SRGBColorSpace;
    envelopeTexture.wrapS = ClampToEdgeWrapping;
    envelopeTexture.wrapT = ClampToEdgeWrapping;
    envelopeTexture.needsUpdate = true;

    paperTextures.forEach((texture) => {
      texture.colorSpace = SRGBColorSpace;
      texture.wrapS = ClampToEdgeWrapping;
      texture.wrapT = ClampToEdgeWrapping;
      texture.repeat.set(1 / 0.8881596326828003, -1);
      texture.offset.set(0, 1);
      texture.needsUpdate = true;
    });

    if (body) {
      applyEnvelopeAtlasUv(body, "body");
      body.material = envelopeMaterial;
      body.rotation.z = Math.PI;
      body.castShadow = true;
      body.receiveShadow = true;
    }
    if (valve) {
      applyEnvelopeAtlasUv(valve, "valve");
      valve.material = valveMaterial;
      valve.rotation.x = 2.55;
      valve.rotation.z = Math.PI;
      valve.position.z = valvePivotZ;
      valve.castShadow = true;
      valve.receiveShadow = true;
    }
    if (paperTemplate) paperTemplate.visible = false;
    paperCopies.forEach((paper) => {
      paper.castShadow = true;
      paper.receiveShadow = true;
    });

    const outlines: LineSegments[] = [];
    [body, valve].forEach((mesh) => {
      if (!mesh) return;
      const outline = new LineSegments(
        new EdgesGeometry(mesh.geometry, 12),
        new LineBasicMaterial({ color: "#161615", transparent: true, opacity: 0.72 }),
      );
      outline.raycast = () => {};
      outline.renderOrder = 10;
      mesh.add(outline);
      outlines.push(outline);
    });
    scene.traverse((object: Object3D) => {
      if (object instanceof Mesh && object.material instanceof MeshStandardMaterial) {
        object.material.map?.colorSpace &&
          (object.material.map.colorSpace = SRGBColorSpace);
      }
    });

    return () => {
      envelopeMaterial.dispose();
      valveMaterial.dispose();
      paperMaterials.forEach((material) => material.dispose());
      outlines.forEach((outline) => {
        outline.parent?.remove(outline);
        outline.geometry.dispose();
        (outline.material as LineBasicMaterial).dispose();
      });
    };
  }, [body, envelopeMaterial, envelopeTexture, paperCopies, paperMaterials, paperTemplate, paperTextures, scene, valve, valveMaterial, valvePivotZ]);

  useFrame((_, delta) => {
    foldProgress.current = damp(foldProgress.current, open ? 1 : 0, 8, delta);
    const paperOpacity = open ? 1 : MathUtils.smoothstep(foldProgress.current, 0.05, 0.22);
    const group = interactiveGroup.current;
    if (group) {
      group.rotation.x = damp(group.rotation.x, rotationTarget.current.x, 8, delta);
      group.rotation.y = damp(group.rotation.y, rotationTarget.current.y, 8, delta);
    }

    if (valve) {
      valve.rotation.x = damp(valve.rotation.x, open ? 0 : 2.55, 9, delta);
      // The open flap needs a slight overlap; keep the original hinge when shut.
      const unfolded = 1 - MathUtils.smoothstep(valve.rotation.x, 0, 2.55);
      valve.position.z = valvePivotZ + 0.005 * unfolded;
      valve.castShadow = valve.rotation.x > 0.12;
    }

    paperCopies.forEach((paper, index) => {
      paperMaterials[index].opacity = paperOpacity;
      paper.visible = paperOpacity > 0.02;
      paper.castShadow = paperOpacity > 0.1;
      const isActive = activeTrack === index;
      const fan = index - (paperCopies.length - 1) / 2;
      const desktopPaperOffset = desktopLayout ? 0.014 : 0;
      const targetRise = open
        ? (isActive ? -0.028 : -0.001 - index * 0.004) + desktopPaperOffset
        : 0;
      const targetX = open ? fan * (desktopLayout ? 0.048 : 0.034) : 0;
      const targetDepth = open ? 0.018 + index * 0.004 + (isActive ? 0.045 : 0) : -0.012;
      const targetRotation = open ? (isActive ? 0 : fan * -0.075) : 0;

      paper.position.x = damp(paper.position.x, targetX, 8, delta);
      paper.position.y = damp(paper.position.y, targetDepth, 8, delta);
      paper.position.z = damp(paper.position.z, targetRise, 8, delta);
      paper.rotation.y = damp(paper.rotation.y, targetRotation, 8, delta);
      const scale = damp(paper.scale.x, open && isActive ? 1.035 : 1, 8, delta);
      paper.scale.setScalar(scale);
    });
  });

  const onPointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    drag.current.active = true;
    drag.current.moved = false;
    drag.current.pointerId = event.pointerId;
    drag.current.pointerType = event.pointerType;
    drag.current.startedOpen = open;
    drag.current.paperIndex = paperCopies.indexOf(event.object as Mesh);
    if (drag.current.paperIndex < 0) drag.current.paperIndex = null;
    lastPointerWasTouch.current = event.pointerType !== "mouse";
    drag.current.startX = event.clientX;
    drag.current.startY = event.clientY;
    drag.current.rotationX = rotationTarget.current.x;
    drag.current.rotationY = rotationTarget.current.y;
    if (event.pointerType === "mouse") (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!drag.current.active || drag.current.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.current.startX;
    const deltaY = event.clientY - drag.current.startY;
    if (Math.hypot(deltaX, deltaY) > (drag.current.pointerType === "mouse" ? 4 : 10)) drag.current.moved = true;
    if (drag.current.pointerType !== "mouse") return;
    rotationTarget.current.y = MathUtils.clamp(
      drag.current.rotationY + deltaX * 0.006,
      -0.72,
      0.72,
    );
    rotationTarget.current.x = MathUtils.clamp(
      drag.current.rotationX + deltaY * 0.004,
      -0.36,
      0.36,
    );
  };

  const onPointerUp = (event: ThreeEvent<PointerEvent>) => {
    if (!drag.current.active || drag.current.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - drag.current.startX, event.clientY - drag.current.startY) > 10) drag.current.moved = true;
    if (!drag.current.moved) {
      if (drag.current.pointerType !== "mouse" && drag.current.startedOpen && drag.current.paperIndex !== null) {
        onPaperTap(drag.current.paperIndex);
      } else if (drag.current.paperIndex === null || drag.current.pointerType !== "mouse") {
        onToggleOpen();
      }
    }
    drag.current.active = false;
    if (drag.current.pointerType === "mouse") (event.target as HTMLElement).releasePointerCapture?.(event.pointerId);
  };

  return (
    <group
      position={desktopLayout ? [0.13, 0.03, 0] : [0, -0.08, 0]}
      scale={desktopLayout ? 4.44 : tabletLayout ? 4.2 : 3.7}
    >
      <group rotation={[Math.PI / 2, 0, 0]}>
        <group
          ref={interactiveGroup}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (drag.current.active = false)}
        >
          <mesh
            position={[0, 0.004, 0]}
            onPointerEnter={(event: ThreeEvent<PointerEvent>) => {
              if (event.pointerType !== "mouse") return;
              event.stopPropagation();
              onEnvelopeEnter();
            }}
          >
            <boxGeometry args={[0.229, 0.008, 0.323]} />
            <meshBasicMaterial
              transparent
              opacity={0}
              depthWrite={false}
              colorWrite={false}
            />
          </mesh>
          <primitive object={scene} />
          {paperCopies.map((paper) => (
            <primitive
              key={paper.name}
              object={paper as Object3D}
              onPointerEnter={(event: ThreeEvent<PointerEvent>) => {
                if (!open || event.pointerType !== "mouse") return;
                event.stopPropagation();
                onPaperHover(paperCopies.indexOf(paper));
              }}
              onPointerDown={(event: ThreeEvent<PointerEvent>) => {
                paperPressStartedOpen.current = open;
                if (open && event.pointerType === "mouse") event.stopPropagation();
              }}
              onClick={(event: ThreeEvent<MouseEvent>) => {
                if (!paperPressStartedOpen.current || lastPointerWasTouch.current) return;
                event.stopPropagation();
                onPaperClick(paperCopies.indexOf(paper));
              }}
            />
          ))}
        </group>
      </group>
    </group>
  );
}

function LoadingEnvelope() {
  return (
    <mesh rotation={[0, 0, 0]}>
      <planeGeometry args={[1.15, 1.48]} />
      <meshBasicMaterial color="#b7b7b1" wireframe />
    </mesh>
  );
}

const egyptianTerms = /(Кемета|Кемет|Дешрет|Kemet|Deshret)/g;
const egyptianTermExact = /^(Кемета|Кемет|Дешрет|Kemet|Deshret)$/;

function EgyptianTerm({ term }: { term: string }) {
  const isKemet = /кемет|kemet/i.test(term);
  const glyphs = isKemet ? "𓆎𓅓𓏏𓊖" : "𓂧𓈙𓂋𓏏𓋔";
  const [revealed, setRevealed] = useState(false);

  return (
    <button
      type="button"
      className={`egyptian-term ${revealed ? "is-revealed" : ""}`}
      aria-label={term}
      aria-pressed={revealed}
      onClick={() => setRevealed((value) => !value)}
      onBlur={() => setRevealed(false)}
    >
      <span className="egyptian-term__glyphs" aria-hidden="true">{glyphs}</span>
      <span className="egyptian-term__label" aria-hidden="true">{term}</span>
    </button>
  );
}

function InteractiveLyrics({ lyrics }: { lyrics: string }) {
  return (
    <div className="lyrics-modal__text">
      {lyrics.split(egyptianTerms).map((part, index) =>
        egyptianTermExact.test(part) ? (
          <EgyptianTerm key={`${part}-${index}`} term={part} />
        ) : (
          part
        ),
      )}
    </div>
  );
}

export default function ReleaseExperience({
  modelUrl,
  textureUrl,
  paperTextureUrls,
  sounds,
  tracks,
  hint,
  touchHint,
  closeText,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [activeTrack, setActiveTrack] = useState<number | null>(null);
  const [modalTrack, setModalTrack] = useState<number | null>(null);
  const modalBodyRef = useRef<HTMLDivElement>(null);
  const [desktopLayout, setDesktopLayout] = useState(false);
  const [tabletLayout, setTabletLayout] = useState(false);
  const open = pinnedOpen || hovered;
  const playSound = useRetroEnvelopeAudio(sounds);
  const openSoundPlayed = useRef(false);
  const openSoundRequestedAt = useRef(-Infinity);
  const lastPageSelection = useRef<number | null>(null);
  const lastPageSoundPlayed = useRef<number | null>(null);
  const pageSoundRequestedAt = useRef(-Infinity);

  const playOpeningSound = useCallback(() => {
    if (openSoundPlayed.current || performance.now() - openSoundRequestedAt.current < 120) return;
    openSoundRequestedAt.current = performance.now();
    playSound("open", () => { openSoundPlayed.current = true; });
  }, [playSound]);

  const playPageSound = useCallback((index: number) => {
    const changed = lastPageSelection.current !== index;
    lastPageSelection.current = index;
    if (!changed && lastPageSoundPlayed.current === index) return;
    if (performance.now() - pageSoundRequestedAt.current < 110) return;
    pageSoundRequestedAt.current = performance.now();
    playSound(Math.random() < 0.5 ? "page-1" : "page-2", () => {
      lastPageSoundPlayed.current = index;
    });
  }, [playSound]);

  useEffect(() => {
    if (open) return;
    openSoundPlayed.current = false;
    lastPageSelection.current = null;
    lastPageSoundPlayed.current = null;
  }, [open]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1101px)");
    const tabletQuery = window.matchMedia("(min-width: 761px) and (max-width: 1100px)");
    const syncLayout = () => {
      setDesktopLayout(desktopQuery.matches);
      setTabletLayout(tabletQuery.matches);
    };
    syncLayout();
    desktopQuery.addEventListener("change", syncLayout);
    tabletQuery.addEventListener("change", syncLayout);
    return () => {
      desktopQuery.removeEventListener("change", syncLayout);
      tabletQuery.removeEventListener("change", syncLayout);
    };
  }, []);

  useEffect(() => {
    if (modalTrack === null) return;
    setHovered(false);
    setPinnedOpen(false);
    setActiveTrack(null);
    lastPageSelection.current = null;
    lastPageSoundPlayed.current = null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModalTrack(null);
      if (event.key === "ArrowRight") {
        const next = (modalTrack + 1) % tracks.length;
        playPageSound(next);
        setModalTrack(next);
      }
      if (event.key === "ArrowLeft") {
        const next = (modalTrack - 1 + tracks.length) % tracks.length;
        playPageSound(next);
        setModalTrack(next);
      }
    };
    document.body.classList.add("lyrics-open");
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("lyrics-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [modalTrack, tracks.length, playPageSound]);

  const selectedTrack = modalTrack === null ? null : tracks[modalTrack];

  useEffect(() => {
    if (modalTrack !== null && modalBodyRef.current) modalBodyRef.current.scrollTop = 0;
  }, [modalTrack]);

  return (
    <div className={`experience ${open ? "is-open" : ""}`}>
      <div
        className="experience__canvas"
        aria-hidden="true"
        onPointerLeave={(event) => {
          if (event.pointerType !== "mouse") return;
          setHovered(false);
          if (!pinnedOpen) {
            setActiveTrack(null);
            lastPageSelection.current = null;
            lastPageSoundPlayed.current = null;
          }
        }}
      >
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [0, 0, 3.4], fov: 32 }}
          shadows="soft"
          gl={{
            antialias: true,
            alpha: true,
            toneMapping: ACESFilmicToneMapping,
            toneMappingExposure: 0.98,
          }}
        >
          <ambientLight intensity={0.25} />
          <hemisphereLight
            color="#eef1f4"
            groundColor="#1b1d23"
            intensity={0.42}
          />
          <directionalLight
            color="#f7f5ef"
            position={[-3.2, 4.5, 5]}
            intensity={2.05}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-camera-near={0.5}
            shadow-camera-far={12}
            shadow-camera-left={-2}
            shadow-camera-right={2}
            shadow-camera-top={2}
            shadow-camera-bottom={-2}
            shadow-bias={-0.0002}
          />
          <directionalLight
            color="#aebfd3"
            position={[3.5, -1.5, 2.5]}
            intensity={0.4}
          />
          <directionalLight
            color="#d5e0f5"
            position={[2.5, 2, -4]}
            intensity={0.66}
          />
          <Suspense fallback={<LoadingEnvelope />}>
            <EnvelopeModel
              modelUrl={modelUrl}
              textureUrl={textureUrl}
              paperTextureUrls={paperTextureUrls}
              desktopLayout={desktopLayout}
              tabletLayout={tabletLayout}
              open={open}
              activeTrack={activeTrack}
              onEnvelopeEnter={() => {
                if (!open) playOpeningSound();
                setHovered(true);
              }}
              onToggleOpen={() => {
                if (!pinnedOpen) playOpeningSound();
                setPinnedOpen((value) => !value);
              }}
              onPaperHover={(index) => {
                setActiveTrack(index);
                playPageSound(index);
              }}
              onPaperClick={(index) => {
                setPinnedOpen(true);
                setActiveTrack(index);
                playPageSound(index);
                setModalTrack(index);
              }}
              onPaperTap={(index) => {
                if (activeTrack === index) {
                  setModalTrack(index);
                } else {
                  setActiveTrack(index);
                  playPageSound(index);
                }
              }}
            />
          </Suspense>
        </Canvas>
      </div>

      <p className="experience__hint experience__hint--mouse">{hint}</p>
      <p className="experience__hint experience__hint--touch">{touchHint}</p>

      <div className="sr-only" aria-label="Track selection">
        {tracks.map((track, index) => (
          <button type="button" key={track.id} onClick={() => {
            playPageSound(index);
            setModalTrack(index);
          }}>
            {track.number} {track.title}
          </button>
        ))}
      </div>

      {selectedTrack && (
        <div className="lyrics-modal" role="dialog" aria-modal="true" aria-labelledby="lyrics-title">
          <div className="lyrics-modal__topbar">
            <span>{selectedTrack.number} / {String(tracks.length).padStart(2, "0")}</span>
            <button type="button" onClick={() => setModalTrack(null)} autoFocus>
              {closeText} ×
            </button>
          </div>
          <div className="lyrics-modal__body" ref={modalBodyRef}>
            <article className="lyrics-modal__content">
              <p>NIHILIST3000</p>
              <h2 id="lyrics-title">{selectedTrack.title}</h2>
              <InteractiveLyrics lyrics={selectedTrack.lyrics} />
            </article>
          </div>
          <div className="lyrics-modal__pager">
            <button type="button" onClick={() => {
              const next = modalTrack === null ? 0 : (modalTrack - 1 + tracks.length) % tracks.length;
              playPageSound(next);
              setModalTrack(next);
            }}>
              <img src="/assets/ui/release-arrow.png" alt="" width="2105" height="2000" />
              <span className="sr-only">←</span>
            </button>
            <button type="button" onClick={() => {
              const next = modalTrack === null ? 0 : (modalTrack + 1) % tracks.length;
              playPageSound(next);
              setModalTrack(next);
            }}>
              <img src="/assets/ui/release-arrow.png" alt="" width="2105" height="2000" />
              <span className="sr-only">→</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
