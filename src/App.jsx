import React, { Suspense, useRef, useLayoutEffect, useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, Center, Stats } from "@react-three/drei";
import { Room } from "./components/Room";
import * as THREE from "three";
import { BackgroundMusic } from "./components/BackgroundMusic";
import { SignPopup } from "./components/SignPopup";
import Loader from "./components/Loader";
import InfoPanel from "./components/InfoPanel";


function CameraRig({ position, target, fov, zoomFov, zoomedFrameRef, controlsEnabled }) {
  const { camera } = useThree();
  const controlsRef = useRef();
  const defaultTarget = useRef(new THREE.Vector3(...target));
  const currentTarget = useRef(new THREE.Vector3(...target));

  const degToRad = (deg) => (deg * Math.PI) / 180;

  useLayoutEffect(() => {
    if (!controlsRef.current) return;
    camera.position.set(...position);
    camera.fov = fov;
    camera.updateProjectionMatrix();
    camera.lookAt(...target);
    controlsRef.current.target.set(...target);
    controlsRef.current.update();
  }, [camera, position, target, fov]);

  // Freezes orbit/zoom/pan while a sign popup is open, so scrolling inside
  // the popup or dragging to read it doesn't also spin the room behind it.
  useLayoutEffect(() => {
    if (controlsRef.current) controlsRef.current.enabled = controlsEnabled;
  }, [controlsEnabled]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    const zoomed = zoomedFrameRef.current; // Vector3 | null
    const desiredTarget = zoomed || defaultTarget.current;
    const desiredFov = zoomed ? zoomFov : fov;

    const targetDelta = currentTarget.current.distanceToSquared(desiredTarget);
    const fovDelta = Math.abs(camera.fov - desiredFov);
    if (targetDelta < 0.0001 && fovDelta < 0.01) {
      controls.update();
      return;
    }

    const smoothing = 1 - Math.pow(0.0001, delta);

    currentTarget.current.lerp(desiredTarget, smoothing);
    controls.target.copy(currentTarget.current);

    camera.fov = THREE.MathUtils.lerp(camera.fov, desiredFov, smoothing);
    camera.updateProjectionMatrix();

    controls.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      rotateSpeed={0.35}
      zoomSpeed={0.4}
      enableDamping={true}
      dampingFactor={0.03}
      minPolarAngle={degToRad(50)}
      maxPolarAngle={degToRad(90)}
      minAzimuthAngle={degToRad(-90)}
      maxAzimuthAngle={degToRad(0)}
      enablePan={false}
    />
  );
}

export default function App() {
  const CAM_POSITION = [0, 1.0, 4.2];
  const CAM_TARGET = [0, 0.0, 0];
  const DEFAULT_FOV = 30;
  const ZOOM_FOV = 14;

  const zoomedFrameRef = useRef(null);

  // Which signboard's page is currently open — "about" | "mywork" | "contact" | null.
  // These string values match exactly what Room.js's onSignNavigate already emits,
  // so no translation is needed between the two.
  const [activePage, setActivePage] = useState(null);

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#D9CAD1" }}>
      <Loader /> 
      <InfoPanel />
      <BackgroundMusic />
      <Canvas
        flat
        camera={{ fov: DEFAULT_FOV }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        dpr={[1, 1.5]}
      >
        <ambientLight intensity={1.5} />
        <directionalLight position={[10, 10, 10]} intensity={1} />
        <Stats />
        <CameraRig
          position={CAM_POSITION}
          target={CAM_TARGET}
          fov={DEFAULT_FOV}
          zoomFov={ZOOM_FOV}
          zoomedFrameRef={zoomedFrameRef}
          controlsEnabled={!activePage}
        />

        <Suspense fallback={null}>
          <Center position={[0, 0, 0]}>
            <Room
              onFrameZoom={(pos) => {
                zoomedFrameRef.current = pos;
              }}
              onSignNavigate={(route) => setActivePage(route)}
            />
          </Center>
        </Suspense>
      </Canvas>

      <SignPopup page={activePage} onClose={() => setActivePage(null)} />
    </div>
  );
}