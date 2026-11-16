import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { RobotArm } from "./RobotArm";
import { SimObjects } from "./SimObjects";
import {
  Environment,
  GravityManager,
  IkTargetGizmo,
  KeyboardController,
  ReadyFlag,
  Sequencer,
  TelemetryPublisher,
} from "./World";
import { selectGravity, useSim } from "@/store";

function PhysicsWorld() {
  const g = useSim(selectGravity);
  const paused = useSim((s) => s.paused);
  return (
    <Physics gravity={[0, -g, 0]} paused={paused} timeStep={1 / 60} interpolate>
      <ReadyFlag />
      <Environment />
      <GravityManager />
      <RobotArm />
      <SimObjects />
      <TelemetryPublisher />
      <Sequencer />
      <IkTargetGizmo />
    </Physics>
  );
}

export function Scene() {
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 1.75]}
      camera={{ position: [3.6, 2.6, 3.4], fov: 42, near: 0.05, far: 120 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <Suspense fallback={null}>
        <PhysicsWorld />
      </Suspense>
      <KeyboardController />
      <OrbitControls
        makeDefault
        target={[0.4, 0.6, 0]}
        enableDamping
        dampingFactor={0.08}
        minDistance={1.2}
        maxDistance={14}
        maxPolarAngle={Math.PI / 2 - 0.03}
      />
    </Canvas>
  );
}
