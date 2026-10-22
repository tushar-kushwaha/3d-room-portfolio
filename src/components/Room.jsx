import React, { useEffect, useMemo, useRef, useState } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/* -------------------------------------------------------------------------- */
/*  Assets                                                                    */
/* -------------------------------------------------------------------------- */

const MODEL_PATH = "/Models/The_Room_Portfolio.glb";
const DRACO_URL = "https://www.gstatic.com/draco/versioned/decoders/1.5.6/";
const VIDEO_PATH = "/video/monitorWallpaper.mp4";

const TEXTURE_PATHS = {
  background: "/texture/background.webp",
  pcAndText: "/texture/final PC AND TEXT.webp",
  smallFurni: "/texture/FINAL small furni.webp",
  deskFurniture: "/texture/FINALdesk furniture.webp",
  mainFurniture: "/texture/finalMainfurniture.webp",
  plantsAndFlower: "/texture/finalPlantsAnd flower.webp",
  outside: "/texture/outside.webp",
  smallFurni2: "/texture/small furni 2.webp",
  catBlender: "/images/cat blender.png",
};

// Each photo frame has its own image. Keys match the frame interaction keys.
const PHOTO_FRAME_IMAGE_PATHS = {
  photoframe1: "/images/PhotoFrame1_Photo.webp",
  photoframe2: "/images/PhotoFrame2_Photo.webp",
  photoframe3: "/images/PhotoFrame3_Photo.webp",
  photoframe4: "/images/PhotoFrame4_Photo.webp",
  photoframe5: "/images/PhotoFrame5_Photo.webp",
};

/* -------------------------------------------------------------------------- */
/*  Mesh-name conventions (must match the object names in Blender)            */
/* -------------------------------------------------------------------------- */

// A mesh whose name contains one of these is an interactive prop.
const TARGET_KEYS = [
  "batman",
  "boba",
  "tegithub",
  "github",
  "code",
  "tushar",
  "mug",
  "about",
  "my work",
  "contact",
];

// Which shared material each key renders with. "tushar" is intentionally
// missing: it gets its own cloned material so recoloring it on click does
// not recolor every other prop sharing `smallFurni`.
const KEY_TO_MATERIAL = {
  batman: "smallFurni",
  boba: "smallFurni",
  tegithub: "smallFurni",
  github: "smallFurni",
  code: "smallFurni",
  mug: "deskFurniture",
  about: "pcAndText",
  "my work": "pcAndText",
  contact: "pcAndText",
};

// Signboards are navigable. Their plaque is found through a Blender Empty
// named Sign_About / Sign_MyWork / Sign_Contact that groups text + plaque.
const SIGN_KEYS = ["about", "my work", "contact"];
const SIGN_EMPTY_PATTERN = /^sign_(about|mywork|contact)$/;

// Photo frames: "PhotoFrameN_Frame" with a child "PhotoFrameN_Photo".
// Scaling the frame scales the photo automatically (real parent/child).
const PHOTO_FRAME_PATTERN = /photoframe(\d+)_(frame|photo)/;

// Fish clusters inside the tank: an Empty named SPIN_Fish1, SPIN_Fish2, ...
// Child meshes must NOT also match this pattern, or they would bob twice.
const FISH_GROUP_PATTERN = /^spin_fish\d*$/;

// The PC parts that trigger the plushy's grow animation when hovered.
const PC_NAME_FRAGMENTS = ["plane.043", "plane.120", "pc and text", "pc glass", "wallpaper screen"];

// "chai cusion" is spelled that way in the model, so it is listed explicitly.
const CHAIR_NAME_FRAGMENTS = ["chai cusion", "chair frame", "chair", "cusion", "cushion"];

const TANK_NAME_FRAGMENTS = [
  "aq glass", "aq_glass", "aq water", "aq_water", "aq ", "aq_",
  "aquarium", "fish tank", "tank", "water",
];

// Names that mean "this mesh uses the plants/leaves texture".
const PLANT_NAME_FRAGMENTS = [
  "plant", "flower", "petal", "leaf", "basket", "pot", "fish",
  "007", "053", "144", "100", "cube.053", "009", "cylinder.009", "beziercurve",
];

/* -------------------------------------------------------------------------- */
/*  Animation settings                                                        */
/* -------------------------------------------------------------------------- */

const HOVER_SCALE = { mug: 1.6, pc: 1.5, default: 1.25 };

const CHAIR_SPIN_DURATION = 3; // seconds for one 360° spin

const TUSHAR_DEFAULT_COLOR = "#ffffff";
const TUSHAR_ACTIVE_COLOR = "#ff5555";

const FISH_BOB_AMPLITUDE = 0.025; // scene units
const FISH_BOB_SPEED = 1.6; // radians per second
const FISH_BOB_PHASE_STEP = 0.9; // offset between fish groups
const FISH_BOB_FADE_RATE = 4; // how quickly the bob eases in and out

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const isSignKey = (key) => SIGN_KEYS.includes(key);
const includesAny = (text, fragments) => fragments.some((f) => text.includes(f));

const isChairPart = (name) => includesAny(name, CHAIR_NAME_FRAGMENTS);
const isTankPart = (name) => includesAny(name, TANK_NAME_FRAGMENTS);
const isPcPart = (name) => !name.includes("plushy") && includesAny(name, PC_NAME_FRAGMENTS);

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Scratch vector reused every frame to avoid allocations.
const _scale = new THREE.Vector3();

function parsePhotoFrameName(name) {
  const match = name.match(PHOTO_FRAME_PATTERN);
  return match ? { key: `photoframe${match[1]}`, part: match[2] } : null;
}

function resolveTargetKey(name) {
  const frame = parsePhotoFrameName(name);
  return (frame && frame.key) || TARGET_KEYS.find((k) => name.includes(k)) || null;
}

// True if the object, or any ancestor, has a (lowercased) name that matches.
// Needed because the clicked mesh is often a leaf and the useful name sits on
// one of its parent groups.
function hasMatchingAncestor(object, matchFn) {
  for (let o = object; o; o = o.parent) {
    if (o.name && matchFn(o.name.toLowerCase())) return true;
  }
  return false;
}

function getSignKeyFromAncestor(object) {
  for (let o = object; o; o = o.parent) {
    const match = o.name && o.name.toLowerCase().match(SIGN_EMPTY_PATTERN);
    if (match) return match[1] === "mywork" ? "my work" : match[1];
  }
  return null;
}

function configureTexture(texture) {
  texture.flipY = false; // glTF convention
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
}

// Cheap fake glass/water. Real `transmission` re-renders the scene per object
// every frame, which is far too expensive for small props.
function createGlassMaterial({ roughness, opacity, color = 0xffffff }) {
  return new THREE.MeshPhysicalMaterial({
    roughness,
    metalness: 0,
    color: new THREE.Color(color),
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.FrontSide,
  });
}

function createMaterials(textures, photoTextures) {
  const mats = {};

  Object.entries(textures).forEach(([key, texture]) => {
    configureTexture(texture);
    const isPlant = key === "plantsAndFlower";
    mats[key] = new THREE.MeshBasicMaterial({
      map: texture,
      side: isPlant ? THREE.DoubleSide : THREE.FrontSide, // only leaves need both sides
      transparent: isPlant,
      alphaTest: isPlant ? 0.1 : 0,
      depthWrite: true,
    });
  });

  Object.entries(photoTextures).forEach(([key, texture]) => {
    configureTexture(texture);
    mats[key] = new THREE.MeshBasicMaterial({ map: texture, side: THREE.FrontSide });
  });

  // Monitor screen: black until the video texture is attached (see effect below).
  mats.pcWallpaper = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.FrontSide });

  mats.glassMaterial = createGlassMaterial({ roughness: 0.15, opacity: 0.35 });
  mats.pcglassMaterial = createGlassMaterial({ roughness: 0.1, opacity: 0.3 });
  mats.waterMaterial = createGlassMaterial({ roughness: 0.2, opacity: 0.55, color: 0xe0f7fa });

  return mats;
}

// Chooses a material from the mesh name. The ORDER MATTERS: the first match wins.
function pickMaterial(name, parentName, m) {
  if (includesAny(name, ["aq glass", "aq_glass"])) return m.glassMaterial;
  if (name.includes("water")) return m.waterMaterial;
  if (name.includes("pc")) return m.pcglassMaterial;
  if (includesAny(name, ["cat blender", "cat_blender"])) return m.catBlender;
  if (includesAny(name, ["wallpaper screen", "wallpaper_screen"])) return m.pcWallpaper;
  if (includesAny(name, PLANT_NAME_FRAGMENTS) || includesAny(parentName, ["plant", "flower"])) {
    return m.plantsAndFlower;
  }
  if (name.includes("small_furni_2") || parentName.includes("small_furni_2") || name.includes("048")) {
    return m.smallFurni2;
  }
  if (name.includes("small") || parentName.includes("small") || name.includes("013") || name.includes("063")) {
    return m.smallFurni;
  }
  if (name.includes("desk") || parentName.includes("desk") || name.includes("003")) {
    return m.deskFurniture;
  }
  if (name.includes("text") || parentName.includes("pc") || name.includes("043") || name.includes("120")) {
    return m.pcAndText;
  }
  if (name.includes("outside") || parentName.includes("outside") || name.includes("051")) {
    return m.outside;
  }
  if (name.includes("background") || parentName.includes("background") || name.includes("139")) {
    return m.background;
  }
  if (name.includes("main") || parentName.includes("main") || name.includes("furniture") || name.includes("065")) {
    return m.mainFurniture;
  }
  return undefined;
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Props
 *  - onFrameZoom(worldPosition | null): double-click on a photo frame. Gets the
 *    frame's world position to zoom the camera toward, or null to zoom out.
 *  - onSignNavigate("about" | "mywork" | "contact"): click on a signboard.
 */
export function Room({ onFrameZoom, onSignNavigate, ...props }) {
  const { scene } = useGLTF(MODEL_PATH, DRACO_URL);
  const [hoveredKey, setHoveredKey] = useState(null);

  // Filled once after load, so useFrame only touches the few meshes that animate.
  const animatedRef = useRef([]); // [{ mesh, baseScale, key }]
  const meshKeysRef = useRef(new Map()); // mesh.uuid -> interaction key
  const frameMeshesRef = useRef(new Map()); // photo frame key -> frame mesh
  const zoomedFrameRef = useRef(null);

  const chairPartsRef = useRef([]);
  const chairSpinRef = useRef({ spinning: false, startY: 0, targetY: 0, progress: 0 });

  const tusharMaterialRef = useRef(null);
  const tusharActiveRef = useRef(false);

  const fishGroupsRef = useRef([]); // [{ object, basePos, phaseOffset }]
  const tankHoveredRef = useRef(false); // a ref avoids a re-render on every pointer move
  const fishBobRef = useRef({ amplitude: 0 });

  const textures = useTexture(TEXTURE_PATHS);
  const photoTextures = useTexture(PHOTO_FRAME_IMAGE_PATHS);

  // Depend on the cached texture instances, not the wrapper objects, which are
  // recreated on every render. The number of textures is constant.
  const materials = useMemo(
    () => createMaterials(textures, photoTextures),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...Object.values(textures), ...Object.values(photoTextures)]
  );

  /* ---- Monitor video texture ------------------------------------------- */
  // Created inside an effect so setup and cleanup are symmetric. That keeps it
  // working under React StrictMode, which mounts effects twice in development.
  useEffect(() => {
    const video = document.createElement("video");
    video.src = VIDEO_PATH;
    video.loop = true;
    video.muted = true; // required for autoplay
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    const texture = new THREE.VideoTexture(video);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = false;
    texture.minFilter = THREE.LinearFilter; // no mipmaps: they would be rebuilt every frame
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;

    materials.pcWallpaper.map = texture;
    materials.pcWallpaper.color.set(0xffffff);
    materials.pcWallpaper.needsUpdate = true;

    video.play().catch(() => {
      // Autoplay was blocked; the video starts on the next user gesture.
    });

    const handleVisibility = () => {
      if (document.hidden) video.pause();
      else video.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      video.pause();
      video.removeAttribute("src");
      video.load();
      texture.dispose();

      materials.pcWallpaper.map = null;
      materials.pcWallpaper.color.set(0x000000);
      materials.pcWallpaper.needsUpdate = true;
    };
  }, [materials]);

  /* ---- One-time scene setup: materials + interactive meshes ------------- */
  useEffect(() => {
    const animated = [];
    const chairParts = [];
    const frameMeshes = new Map();
    const fishGroups = [];
    const meshKeys = new Map();

    tusharMaterialRef.current = null;
    tusharActiveRef.current = false;

    // Fish groups (Empties, or a single mesh). Only the outermost match counts.
    scene.traverse((child) => {
      if (!FISH_GROUP_PATTERN.test(child.name.toLowerCase())) return;
      if (hasMatchingAncestor(child.parent, (n) => FISH_GROUP_PATTERN.test(n))) return;

      fishGroups.push({
        object: child,
        basePos: child.position.clone(),
        phaseOffset: fishGroups.length * FISH_BOB_PHASE_STEP,
      });
    });

    scene.traverse((child) => {
      if (!child.isMesh) return;

      const name = child.name.toLowerCase();
      const parentName = child.parent ? child.parent.name.toLowerCase() : "";
      const frame = parsePhotoFrameName(name);
      const key = frame ? frame.key : TARGET_KEYS.find((k) => name.includes(k));
      const signKey = getSignKeyFromAncestor(child);

      // Materials (first match wins).
      if (key && KEY_TO_MATERIAL[key]) {
        child.material = materials[KEY_TO_MATERIAL[key]];
      } else if (name.includes("border")) {
        child.material = materials.background; // wooden post the signs hang from
      } else if (name.includes("tushar")) {
        if (!tusharMaterialRef.current) {
          tusharMaterialRef.current = materials.smallFurni.clone();
          tusharMaterialRef.current.color.set(TUSHAR_DEFAULT_COLOR);
        }
        child.material = tusharMaterialRef.current;
      } else if (frame) {
        child.material =
          frame.part === "frame"
            ? materials.smallFurni2
            : materials[frame.key] || materials.smallFurni2;
      } else if (isChairPart(name)) {
        child.material = materials.mainFurniture;
        chairParts.push(child);
      } else {
        const material = pickMaterial(name, parentName, materials);
        if (material) child.material = material;
      }

      // Interactivity.
      const register = (animKey) =>
        animated.push({ mesh: child, baseScale: child.scale.clone(), key: animKey });
      let interactive = false;

      if (frame) {
        meshKeys.set(child.uuid, frame.key);
        interactive = true;
        if (frame.part === "frame") {
          register(frame.key); // the photo child follows its parent's scale
          frameMeshes.set(frame.key, child);
        }
      } else if (key) {
        register(key);
        // Sign text grows with its sign but is not hoverable itself. The plaque
        // behind it takes the hover.
        if (!isSignKey(key)) {
          meshKeys.set(child.uuid, key);
          interactive = true;
        }
      } else if (signKey) {
        register(signKey); // plaque, or anything else grouped under the sign
        meshKeys.set(child.uuid, signKey);
        interactive = true;
      } else if (isChairPart(name)) {
        interactive = true;
      } else if (hasMatchingAncestor(child, isTankPart)) {
        interactive = true;
      } else if (name.includes("plushy")) {
        register("pc"); // grows when the PC is hovered, not when hovered itself
      } else if (hasMatchingAncestor(child, isPcPart)) {
        meshKeys.set(child.uuid, "pc");
        interactive = true;
      }

      // Skip raycasting for decorative meshes. Raycasting the whole scene on
      // every pointer move is a real CPU cost.
      if (!interactive) child.raycast = () => {};
    });

    animatedRef.current = animated;
    meshKeysRef.current = meshKeys;
    frameMeshesRef.current = frameMeshes;
    chairPartsRef.current = chairParts;
    fishGroupsRef.current = fishGroups;
  }, [scene, materials]);

  /* ---- Per-frame animation --------------------------------------------- */
  useFrame((state, delta) => {
    const animated = animatedRef.current;
    const chairParts = chairPartsRef.current;
    const fishGroups = fishGroupsRef.current;

    // Hover grow.
    const lerpAmount = Math.min(delta * 12, 1);
    for (let i = 0; i < animated.length; i++) {
      const { mesh, baseScale, key } = animated[i];
      const factor = hoveredKey === key ? HOVER_SCALE[key] ?? HOVER_SCALE.default : 1;
      _scale.set(baseScale.x * factor, baseScale.y * factor, baseScale.z * factor);
      mesh.scale.lerp(_scale, lerpAmount);
    }

    // Chair spin: eased 360° rotation around each mesh's own origin.
    const spin = chairSpinRef.current;
    if (spin.spinning && chairParts.length > 0) {
      spin.progress = Math.min(spin.progress + delta / CHAIR_SPIN_DURATION, 1);
      const angle = THREE.MathUtils.lerp(spin.startY, spin.targetY, easeInOutCubic(spin.progress));
      chairParts.forEach((part) => (part.rotation.y = angle));

      if (spin.progress >= 1) {
        spin.spinning = false;
        const wrapped = angle % (Math.PI * 2); // keep the angle bounded
        chairParts.forEach((part) => (part.rotation.y = wrapped));
      }
    }

    // Fish bob while the tank is hovered, easing in and out.
    if (fishGroups.length > 0) {
      const bob = fishBobRef.current;
      const target = tankHoveredRef.current ? FISH_BOB_AMPLITUDE : 0;
      bob.amplitude = THREE.MathUtils.lerp(bob.amplitude, target, Math.min(delta * FISH_BOB_FADE_RATE, 1));

      if (bob.amplitude > 0.0005) {
        const elapsed = state.clock.elapsedTime;
        fishGroups.forEach(({ object, basePos, phaseOffset }) => {
          const offsetY = Math.sin(elapsed * FISH_BOB_SPEED + phaseOffset) * bob.amplitude;
          object.position.set(basePos.x, basePos.y + offsetY, basePos.z);
        });
      } else {
        // Settled: snap back exactly to rest to avoid floating-point drift.
        fishGroups.forEach(({ object, basePos }) => object.position.copy(basePos));
      }
    }
  });

  useEffect(() => {
    document.body.style.cursor = hoveredKey ? "pointer" : "auto";
    return () => {
      document.body.style.cursor = "auto";
    };
  }, [hoveredKey]);

  /* ---- Pointer events --------------------------------------------------- */
  const getKey = (object) =>
    meshKeysRef.current.get(object.uuid) || resolveTargetKey(object.name.toLowerCase());

  const handlePointerOver = (e) => {
    e.stopPropagation();
    const key = getKey(e.object);
    if (key) setHoveredKey(key);
    if (hasMatchingAncestor(e.object, isTankPart)) tankHoveredRef.current = true;
  };

  const handlePointerOut = (e) => {
    e.stopPropagation();
    setHoveredKey(null);
    if (hasMatchingAncestor(e.object, isTankPart)) tankHoveredRef.current = false;
  };

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    const key = getKey(e.object);
    if (!onFrameZoom || !key || !key.startsWith("photoframe")) return;

    if (zoomedFrameRef.current === key) {
      zoomedFrameRef.current = null; // same frame again: zoom out
      onFrameZoom(null);
      return;
    }

    zoomedFrameRef.current = key; // new frame: zoom to it
    const target = frameMeshesRef.current.get(key) || e.object;
    onFrameZoom(target.getWorldPosition(new THREE.Vector3()));
  };

  const handleClick = (e) => {
    e.stopPropagation();
    const meshName = e.object.name.toLowerCase();
    const key = getKey(e.object);

    // Signboards.
    if (isSignKey(key) && onSignNavigate) {
      onSignNavigate(key.replace(/\s+/g, "")); // "about" | "mywork" | "contact"
    }

    // Chair: start a spin unless one is already running.
    const chairParts = chairPartsRef.current;
    if (isChairPart(meshName) && chairParts.length > 0 && !chairSpinRef.current.spinning) {
      const startY = chairParts[0].rotation.y;
      chairSpinRef.current = {
        spinning: true,
        startY,
        targetY: startY + Math.PI * 2,
        progress: 0,
      };
    }

    // Name sign: toggle color.
    if (meshName.includes("tushar") && tusharMaterialRef.current) {
      tusharActiveRef.current = !tusharActiveRef.current;
      tusharMaterialRef.current.color.set(
        tusharActiveRef.current ? TUSHAR_ACTIVE_COLOR : TUSHAR_DEFAULT_COLOR
      );
    }
  };

  return (
    <group {...props}>
      <primitive
        object={scene}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onDoubleClick={handleDoubleClick}
        onClick={handleClick}
      />
    </group>
  );
}

useGLTF.preload(MODEL_PATH, DRACO_URL);