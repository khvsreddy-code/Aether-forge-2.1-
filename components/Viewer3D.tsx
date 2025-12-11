import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, Grid, GizmoHelper, GizmoViewport, Gltf, Stage, Float } from '@react-three/drei';
import { ModelSettings } from '../types';

interface Viewer3DProps {
  modelUrl: string | null;
  settings: ModelSettings;
}

export const Viewer3D: React.FC<Viewer3DProps> = ({ modelUrl, settings }) => {
  return (
    <div className="w-full h-full relative overflow-hidden bg-[#121212]">
      {/* Studio Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e] to-[#000000] pointer-events-none"></div>

      <Canvas shadows dpr={[1, 2]} camera={{ position: [2, 2, 5], fov: 45 }}>
        <PerspectiveCamera makeDefault position={[3, 3, 5]} />
        <OrbitControls 
          makeDefault 
          autoRotate={settings.autoRotate}
          autoRotateSpeed={1.5}
          minDistance={1}
          maxDistance={10}
        />

        <Environment preset="city" blur={0.6} />

        {/* Lighting Setup */}
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
        
        <group position={[0, -0.5, 0]}>
           {modelUrl ? (
             <Stage intensity={0.5} environment="city" adjustCamera={false}>
                <Gltf 
                  src={modelUrl} 
                  castShadow 
                  receiveShadow 
                >
                    {/* Inject wireframe logic if needed by accessing children in a ref, 
                        but standard Gltf component doesn't easily support dynamic wireframe toggle on loaded materials 
                        without a helper. For now, we render the solid true mesh. */}
                </Gltf>
             </Stage>
           ) : (
             <Placeholder />
           )}
        </group>

        <Grid 
            position={[0, -0.51, 0]} 
            args={[10, 10]} 
            cellSize={0.5} 
            cellThickness={0.5} 
            cellColor="#444444" 
            sectionSize={2.5} 
            sectionThickness={1} 
            sectionColor="#6366f1" 
            fadeDistance={20} 
            infiniteGrid 
        />
        <ContactShadows opacity={0.6} scale={10} blur={2} far={2} color="#000000" />
        
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport axisColors={['#ff3653', '#8adb00', '#2c8fdf']} labelColor="black" />
        </GizmoHelper>
      </Canvas>
    </div>
  );
};

const Placeholder = () => (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <mesh rotation={[0, Math.PI / 4, 0]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#333" wireframe />
        </mesh>
    </Float>
);
