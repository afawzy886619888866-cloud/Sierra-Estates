'use client';

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, Center, Html } from '@react-three/drei';

interface ModelProps {
  url: string;
  scale?: number;
}

function Model({ url, scale = 1 }: ModelProps) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} scale={scale} />;
}

function Loader() {
  return (
    <Html center>
      <div className="flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-xs text-amber-400 backdrop-blur-md">
        <div className="h-3 w-3 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
        <span>Loading 3D Model...</span>
      </div>
    </Html>
  );
}

interface ModelViewerProps {
  modelUrl?: string;
  className?: string;
  autoRotate?: boolean;
}

export default function ModelViewer({
  modelUrl = '/model.glb',
  className = 'h-[400px] w-full',
  autoRotate = true,
}: ModelViewerProps) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-slate-950/40 backdrop-blur-md border border-white/10 ${className}`}>
      <Canvas camera={{ position: [0, 2, 5], fov: 45 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 10, 5]} intensity={1.2} />
        <Suspense fallback={<Loader />}>
          <Center>
            <Model url={modelUrl} />
          </Center>
          <Environment preset="city" />
        </Suspense>
        <OrbitControls autoRotate={autoRotate} autoRotateSpeed={1.5} enableZoom={true} />
      </Canvas>
    </div>
  );
}
