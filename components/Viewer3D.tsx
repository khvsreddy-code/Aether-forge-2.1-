import React, { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, Grid, GizmoHelper, GizmoViewport, Gltf, Stage, Float, Center, MeshReflectorMaterial } from '@react-three/drei';
import { ModelSettings } from '../types';
import * as THREE from 'three';

interface Viewer3DProps {
  modelUrl: string | null;
  settings: ModelSettings;
}

const ModelRenderer = ({ url, settings }: { url: string, settings: ModelSettings }) => {
    return (
        <Center>
            <Gltf 
                src={url} 
                castShadow 
                receiveShadow
                inject={
                    <meshPhysicalMaterial 
                        wireframe={settings.wireframe}
                        color={settings.wireframe ? settings.meshColor : undefined}
                        roughness={0.5}
                        metalness={0.6}
                        clearcoat={0.3}
                        clearcoatRoughness={0.2}
                    />
                } 
            />
        </Center>
    );
};

const LoadingSpinner = () => (
    <mesh>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#6366f1" wireframe />
    </mesh>
);

export const Viewer3D: React.FC<Viewer3DProps> = ({ modelUrl, settings }) => {
  return (
    <div className="w-full h-full relative overflow-hidden bg-[#050505]">
      {/* Dynamic Background Gradient based on Environment */}
      <div className={`absolute inset-0 transition-opacity duration-1000 pointer-events-none ${
          settings.environment === 'studio' ? 'bg-gradient-to-b from-[#202025] to-[#000000]' :
          settings.environment === 'sunset' ? 'bg-gradient-to-b from-[#2a1b1b] to-[#000000]' :
          settings.environment === 'city' ? 'bg-gradient-to-b from-[#1a1a2e] to-[#000000]' :
          'bg-black'
      }`}></div>

      <Canvas shadows dpr={[1, 2]} camera={{ position: [3, 3, 6], fov: 45 }} gl={{ preserveDrawingBuffer: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
        <PerspectiveCamera makeDefault position={[4, 3, 6]} />
        <OrbitControls 
          makeDefault 
          autoRotate={settings.autoRotate}
          autoRotateSpeed={1.0}
          minDistance={1}
          maxDistance={20}
          dampingFactor={0.05}
        />

        <Environment preset={settings.environment} blur={0.8} background={false} />

        {/* Cinematic Lighting */}
        <ambientLight intensity={0.4} />
        <spotLight 
            position={[10, 10, 10]} 
            angle={0.15} 
            penumbra={1} 
            intensity={2} 
            castShadow 
            shadow-bias={-0.0001}
            shadow-mapSize={[2048, 2048]}
        />
        <pointLight position={[-10, -5, -10]} intensity={1} color={settings.meshColor} distance={20} />
        <pointLight position={[0, 5, 5]} intensity={0.5} color="#ffffff" />

        <group position={[0, 0.5, 0]}>
           <Suspense fallback={<LoadingSpinner />}>
               {modelUrl ? (
                 <Stage 
                    intensity={0.8} 
                    environment={settings.environment} 
                    adjustCamera={false}
                    shadows={{ type: 'contact', opacity: 0.8, blur: 2 }}
                 >
                    <ModelRenderer url={modelUrl} settings={settings} />
                 </Stage>
               ) : (
                 <Placeholder />
               )}
           </Suspense>
        </group>

        {settings.showGrid && (
            <Grid 
                position={[0, -0.01, 0]} 
                args={[20, 20]} 
                cellSize={0.5} 
                cellThickness={0.5} 
                cellColor="#333333" 
                sectionSize={2.5} 
                sectionThickness={1} 
                sectionColor={settings.meshColor} 
                fadeDistance={25} 
                infiniteGrid 
            />
        )}

        {/* Reflective Floor for High Quality Look */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
            <planeGeometry args={[50, 50]} />
            <MeshReflectorMaterial
                blur={[400, 100]}
                resolution={1024}
                mixBlur={1}
                mixStrength={50}
                roughness={0.8}
                depthScale={1.2}
                minDepthThreshold={0.4}
                maxDepthThreshold={1.4}
                color="#080808"
                metalness={0.5}
                mirror={0.5}
            />
        </mesh>
        
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport axisColors={['#ff3653', '#8adb00', '#2c8fdf']} labelColor="black" />
        </GizmoHelper>
      </Canvas>
    </div>
  );
};

const Placeholder = () => (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <group>
            <mesh rotation={[0, Math.PI / 4, 0]}>
                <boxGeometry args={[1.5, 1.5, 1.5]} />
                <meshPhysicalMaterial color="#222" wireframe transparent opacity={0.3} roughness={0} metalness={1} />
            </mesh>
            <mesh rotation={[0, Math.PI / 4, 0]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshPhysicalMaterial color="#6366f1" wireframe roughness={0} metalness={1} emissive="#6366f1" emissiveIntensity={0.2} />
            </mesh>
        </group>
    </Float>
);
