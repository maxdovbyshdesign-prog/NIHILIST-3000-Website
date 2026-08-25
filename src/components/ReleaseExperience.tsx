import { Canvas, type ThreeEvent, useFrame, useLoader } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  ACESFilmicToneMapping,
  BufferAttribute,
  ClampToEdgeWrapping,
  DoubleSide,
  EdgesGeometry,
  Group,
  CanvasTexture,
  LineBasicMaterial,
  LineSegments,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { Track } from "../content/releases";

type Props = {
  modelUrl: string;
  textureUrl: string;
  tracks: Track[];
  hint: string;
  closeText: string;
};

type EnvelopeProps = {
  modelUrl: string;
  textureUrl: string;
  tracks: Track[];
  desktopLayout: boolean;
  open: boolean;
  activeTrack: number | null;
  onEnvelopeEnter: () => void;
  onToggleOpen: () => void;
  onPaperHover: (index: number) => void;
  onPaperClick: (index: number) => void;
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
  tracks,
  desktopLayout,
  open,
  activeTrack,
  onEnvelopeEnter,
  onToggleOpen,
  onPaperHover,
  onPaperClick,
}: EnvelopeProps) {
  const gltf = useLoader(GLTFLoader, modelUrl);
  const envelopeTexture = useLoader(TextureLoader, textureUrl);
  const interactiveGroup = useRef<Group>(null);
  const drag = useRef({
    active: false,
    moved: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    rotationX: 0,
    rotationY: 0,
  });
  const rotationTarget = useRef({ x: 0, y: 0 });
  const paperPressStartedOpen = useRef(false);

  const scene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((object) => {
      if (object instanceof Mesh) object.geometry = object.geometry.clone();
    });
    return clone;
  }, [gltf.scene]);
  const body = useMemo(() => scene.getObjectByName("body") as Mesh | null, [scene]);
  const valve = useMemo(() => scene.getObjectByName("valve") as Mesh | null, [scene]);
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
      ["#f0f0e9", "#d8d8d1", "#c1c1bb", "#aaaaa4"].map(
        (color) =>
          new MeshStandardMaterial({
            color,
            roughness: 0.98,
            metalness: 0,
            side: DoubleSide,
          }),
      ),
    [],
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
      valve.castShadow = true;
      valve.receiveShadow = true;
    }
    if (paperTemplate) paperTemplate.visible = false;

    const paperTextures: CanvasTexture[] = [];
    paperMaterials.forEach((material, index) => {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 576;
      const context = canvas.getContext("2d");
      if (!context) return;

      const backgrounds = ["#f0f0e9", "#d8d8d1", "#c1c1bb", "#aaaaa4"];
      context.fillStyle = backgrounds[index % backgrounds.length];
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.translate(canvas.width, canvas.height);
      context.rotate(Math.PI);
      context.fillStyle = "#151514";
      context.textBaseline = "top";
      context.font = '700 18px Arial, sans-serif';
      context.letterSpacing = "3px";
      context.fillText("NIHILIST3000", 38, 36);
      context.font = '700 104px Arial, sans-serif';
      context.fillText(tracks[index]?.number ?? String(index + 1).padStart(2, "0"), 32, 86);

      const title = tracks[index]?.title ?? "";
      const words = title.split(/\s+/);
      const lines: string[] = [];
      let line = "";
      context.font = '700 42px "Dela Gothic One", Arial, sans-serif';
      words.forEach((word) => {
        const candidate = line ? `${line} ${word}` : word;
        if (context.measureText(candidate).width > 430 && line) {
          lines.push(line);
          line = word;
        } else {
          line = candidate;
        }
      });
      if (line) lines.push(line);
      lines.slice(0, 3).forEach((titleLine, lineIndex) => {
        context.fillText(titleLine, 38, 390 + lineIndex * 54);
      });

      const texture = new CanvasTexture(canvas);
      texture.colorSpace = SRGBColorSpace;
      texture.wrapS = RepeatWrapping;
      texture.repeat.x = -1;
      texture.offset.x = 1;
      material.color.set("#ffffff");
      material.map = texture;
      material.needsUpdate = true;
      const paper = paperCopies[index];
      if (paper) {
        paper.castShadow = true;
        paper.receiveShadow = true;
      }
      paperTextures.push(texture);
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
      paperTextures.forEach((texture) => texture.dispose());
      outlines.forEach((outline) => {
        outline.parent?.remove(outline);
        outline.geometry.dispose();
        (outline.material as LineBasicMaterial).dispose();
      });
    };
  }, [body, envelopeMaterial, envelopeTexture, paperCopies, paperMaterials, paperTemplate, scene, valve, valveMaterial]);

  useFrame((_, delta) => {
    const group = interactiveGroup.current;
    if (group) {
      group.rotation.x = damp(group.rotation.x, rotationTarget.current.x, 8, delta);
      group.rotation.y = damp(group.rotation.y, rotationTarget.current.y, 8, delta);
    }

    if (valve) {
      valve.rotation.x = damp(valve.rotation.x, open ? 0 : 2.55, 9, delta);
    }

    paperCopies.forEach((paper, index) => {
      const isActive = activeTrack === index;
      const fan = index - (paperCopies.length - 1) / 2;
      const desktopPaperOffset = desktopLayout ? 0.014 : 0;
      const targetRise = open
        ? (isActive ? -0.045 : -0.018 - index * 0.004) + desktopPaperOffset
        : 0;
      const targetX = open ? fan * 0.028 : 0;
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
    drag.current.startX = event.clientX;
    drag.current.startY = event.clientY;
    drag.current.rotationX = rotationTarget.current.x;
    drag.current.rotationY = rotationTarget.current.y;
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!drag.current.active || drag.current.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.current.startX;
    const deltaY = event.clientY - drag.current.startY;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 4) drag.current.moved = true;
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
    if (!drag.current.active) return;
    if (!drag.current.moved) onToggleOpen();
    drag.current.active = false;
    (event.target as HTMLElement).releasePointerCapture?.(event.pointerId);
  };

  return (
    <group
      position={desktopLayout ? [0.13, 0.03, 0] : [0, -0.08, 0]}
      scale={desktopLayout ? 4.44 : 3.7}
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
                if (!open) return;
                event.stopPropagation();
                onPaperHover(paperCopies.indexOf(paper));
              }}
              onPointerDown={(event: ThreeEvent<PointerEvent>) => {
                paperPressStartedOpen.current = open;
                if (open) event.stopPropagation();
              }}
              onClick={(event: ThreeEvent<MouseEvent>) => {
                if (!paperPressStartedOpen.current) return;
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
  tracks,
  hint,
  closeText,
}: Props) {
  const [hovered, setHovered] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const [activeTrack, setActiveTrack] = useState<number | null>(null);
  const [modalTrack, setModalTrack] = useState<number | null>(null);
  const [desktopLayout, setDesktopLayout] = useState(false);
  const open = pinnedOpen || hovered;

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 761px)");
    const syncDesktopLayout = () => setDesktopLayout(desktopQuery.matches);
    syncDesktopLayout();
    desktopQuery.addEventListener("change", syncDesktopLayout);
    return () => desktopQuery.removeEventListener("change", syncDesktopLayout);
  }, []);

  useEffect(() => {
    if (modalTrack === null) return;
    setHovered(false);
    setPinnedOpen(false);
    setActiveTrack(null);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModalTrack(null);
      if (event.key === "ArrowRight") {
        setModalTrack((value) => (value === null ? null : (value + 1) % tracks.length));
      }
      if (event.key === "ArrowLeft") {
        setModalTrack((value) =>
          value === null ? null : (value - 1 + tracks.length) % tracks.length,
        );
      }
    };
    document.body.classList.add("lyrics-open");
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("lyrics-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [modalTrack, tracks.length]);

  const selectedTrack = modalTrack === null ? null : tracks[modalTrack];

  return (
    <div className={`experience ${open ? "is-open" : ""}`}>
      <div
        className="experience__canvas"
        aria-hidden="true"
        onPointerLeave={(event) => {
          if (event.pointerType !== "mouse") return;
          setHovered(false);
          if (!pinnedOpen) setActiveTrack(null);
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
              tracks={tracks}
              desktopLayout={desktopLayout}
              open={open}
              activeTrack={activeTrack}
              onEnvelopeEnter={() => setHovered(true)}
              onToggleOpen={() => setPinnedOpen((value) => !value)}
              onPaperHover={setActiveTrack}
              onPaperClick={(index) => {
                setPinnedOpen(true);
                setActiveTrack(index);
                setModalTrack(index);
              }}
            />
          </Suspense>
        </Canvas>
      </div>

      <p className="experience__hint">{hint}</p>

      <div className="sr-only" aria-label="Track selection">
        {tracks.map((track, index) => (
          <button type="button" key={track.id} onClick={() => setModalTrack(index)}>
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
          <div className="lyrics-modal__body">
            <article className="lyrics-modal__content">
              <p>NIHILIST3000</p>
              <h2 id="lyrics-title">{selectedTrack.title}</h2>
              <InteractiveLyrics lyrics={selectedTrack.lyrics} />
            </article>
            <div className="lyrics-modal__pager">
              <button type="button" onClick={() => setModalTrack((value) => value === null ? 0 : (value - 1 + tracks.length) % tracks.length)}>
                <img src="/assets/ui/release-arrow.png" alt="" width="2105" height="2000" />
                <span className="sr-only">←</span>
              </button>
              <button type="button" onClick={() => setModalTrack((value) => value === null ? 0 : (value + 1) % tracks.length)}>
                <img src="/assets/ui/release-arrow.png" alt="" width="2105" height="2000" />
                <span className="sr-only">→</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
