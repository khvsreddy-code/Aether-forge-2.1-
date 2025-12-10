import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Center } from '@react-three/drei';
import * as THREE from 'three';
import { ModelSettings } from '../types';

interface Viewer3DProps {
  originalImage: string;
  depthMap: string | null;
  settings: ModelSettings;
  onMeshReady?: (mesh: THREE.Mesh) => void;
}

// Utility to create geometry from image data
const createMeshFromData = (
    img: HTMLImageElement, 
    depthImg: HTMLImageElement, 
    displacementScale: number
): THREE.BufferGeometry => {
    const width = img.width;
    const height = img.height;
    
    // Create an offscreen canvas to read pixel data
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('Could not create canvas context');

    // Draw depth map to read values
    ctx.drawImage(depthImg, 0, 0);
    const depthData = ctx.getImageData(0, 0, width, height).data;

    // We can't use every pixel or it will be too heavy (1024x1024 = 1M vertices)
    // We downsample by a factor (step)
    const step = 4; 
    const w = Math.floor(width / step);
    const h = Math.floor(height / step);

    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];

    // Grid to map (x, y) to vertex index
    // Initialize with -1
    const grid = new Int32Array(w * h).fill(-1);

    let vertexCount = 0;
    const threshold = 20; // Darkness threshold for background (0-255)

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            // Sample source coordinates
            const px = x * step;
            const py = y * step;
            
            // Index in the pixel array (row-major, 4 channels)
            const pixelIndex = (py * width + px) * 4;
            const r = depthData[pixelIndex];
            
            // If strictly background (black), skip creating vertex
            if (r < threshold) continue;

            // Normalized coordinates (-0.5 to 0.5)
            const u = x / (w - 1);
            const v = 1 - (y / (h - 1)); // Flip Y for 3D

            const vx = (u - 0.5) * 4; // Scale width roughly to 4 units
            const vy = (v - 0.5) * 4 * (height / width); // Maintain aspect ratio
            const vz = (r / 255) * displacementScale; // Z based on depth

            vertices.push(vx, vy, vz);
            uvs.push(u, v);

            // Store the vertex index for this grid position
            grid[y * w + x] = vertexCount;
            vertexCount++;
        }
    }

    // Generate indices (faces)
    // We look at the grid. If we have a valid vertex at (x,y), (x+1,y), (x,y+1), (x+1,y+1)
    // we create two triangles.
    for (let y = 0; y < h - 1; y++) {
        for (let x = 0; x < w - 1; x++) {
            const a = grid[y * w + x];
            const b = grid[y * w + (x + 1)];
            const c = grid[(y + 1) * w + x];
            const d = grid[(y + 1) * w + (x + 1)];

            // Create faces only if all vertices exist (avoids stretching across gaps)
            if (a !== -1 && b !== -1 && c !== -1 && d !== -1) {
                // Triangle 1: a, c, b
                indices.push(a, c, b);
                // Triangle 2: b, c, d
                indices.push(b, c, d);
            }
        }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();
    
    return geometry;
};

const GeneratedMesh: React.FC<Viewer3DProps> = ({ originalImage, depthMap, settings, onMeshReady }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
    const [texture, setTexture] = useState<THREE.Texture | null>(null);

    useEffect(() => {
        if (!originalImage || !depthMap) return;

        const loadImages = async () => {
            const imgLoader = new THREE.ImageLoader();
            const texLoader = new THREE.TextureLoader();

            const [imgEl, depthEl, tex] = await Promise.all([
                imgLoader.loadAsync(originalImage),
                imgLoader.loadAsync(depthMap),
                texLoader.loadAsync(originalImage)
            ]);
            
            // Set texture encoding/colorspace if needed
            tex.colorSpace = THREE.SRGBColorSpace;
            setTexture(tex);

            // Process geometry in a microtask to avoid blocking UI too hard (simulated)
            setTimeout(() => {
                try {
                    const geo = createMeshFromData(imgEl, depthEl, settings.displacementScale);
                    setGeometry(geo);
                } catch (e) {
                    console.error("Failed to generate mesh", e);
                }
            }, 10);
        };

        loadImages();

    }, [originalImage, depthMap]);

    // Update mesh scale/geometry when displacement setting changes
    useEffect(() => {
        if (meshRef.current && onMeshReady) {
            onMeshReady(meshRef.current);
        }
    }, [geometry, onMeshReady]);

    if (!geometry || !texture) return null;

    return (
        <Center>
            <mesh 
                ref={meshRef} 
                geometry={geometry} 
                scale={[1, 1, 1]} // Scale is handled in geometry creation
                castShadow 
                receiveShadow
            >
                <meshStandardMaterial
                    map={texture}
                    wireframe={settings.wireframe}
                    color={settings.wireframe ? settings.meshColor : 'white'}
                    roughness={settings.roughness}
                    metalness={settings.metalness}
                    side={THREE.DoubleSide}
                />
            </mesh>
        </Center>
    );
};

export const Viewer3D: React.FC<Viewer3DProps> = (props) => {
  return (
    <div className="w-full h-full bg-slate-900 relative rounded-lg overflow-hidden shadow-2xl border border-slate-700">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, 5], fov: 45 }}>
        <PerspectiveCamera makeDefault position={[0, 0, 6]} />
        <OrbitControls 
          enableDamping 
          dampingFactor={0.05} 
          minDistance={1} 
          maxDistance={20}
        />
        
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[5, 10, 5]} 
          intensity={1} 
          castShadow 
          shadow-mapSize-width={2048} 
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-10, 0, -10]} intensity={0.5} color="#4f46e5" />
        <pointLight position={[10, 5, 10]} intensity={0.5} color="#ec4899" />

        <Environment preset="city" />
        
        <React.Suspense fallback={null}>
            {props.depthMap ? (
                 <GeneratedMesh {...props} />
            ) : (
                <PlaneFallback originalImage={props.originalImage} />
            )}
        </React.Suspense>
        
        <gridHelper args={[20, 20, 0x444444, 0x222222]} position={[0, -2, 0]} />
      </Canvas>
      
      <div className="absolute bottom-4 right-4 text-xs text-slate-500 pointer-events-none">
        Powered by Three.js & Gemini
      </div>
    </div>
  );
};

// Fallback for when we only have the image (flat plane)
const PlaneFallback = ({ originalImage }: { originalImage: string }) => {
    const texture = useMemo(() => new THREE.TextureLoader().load(originalImage), [originalImage]);
    return (
        <mesh>
            <planeGeometry args={[3, 3]} />
            <meshBasicMaterial map={texture} transparent opacity={0.8} />
        </mesh>
    )
}
