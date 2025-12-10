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
  onProgress?: (progress: number) => void;
}

// Async generator to create geometry without freezing the UI
const createMeshFromDataAsync = async (
    img: HTMLImageElement, 
    depthImg: HTMLImageElement, 
    displacementScale: number,
    onProgress?: (p: number) => void
): Promise<THREE.BufferGeometry> => {
    return new Promise((resolve, reject) => {
        try {
            const width = img.width;
            const height = img.height;
            
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            if (!ctx) throw new Error('Could not create canvas context');

            // Draw original image to get Alpha channel for precise cutting
            ctx.drawImage(img, 0, 0);
            const colorData = ctx.getImageData(0, 0, width, height).data;

            // Draw depth map to get Z values
            ctx.clearRect(0,0, width, height);
            ctx.drawImage(depthImg, 0, 0);
            const depthData = ctx.getImageData(0, 0, width, height).data;

            // HIGH QUALITY SETTING: Step 2 provides 4x more detail than Step 4
            // For 1024px image: Step 2 = 260k vertices (High Quality)
            // Step 1 would be 1M vertices (Ultra High) - might be too heavy for some mobiles
            const step = 2; 
            const w = Math.floor(width / step);
            const h = Math.floor(height / step);

            const vertices: number[] = [];
            const indices: number[] = [];
            const uvs: number[] = [];
            const grid = new Int32Array(w * h).fill(-1);

            let vertexCount = 0;
            const depthThreshold = 20; // Background cutoff if alpha is opaque
            const alphaThreshold = 50; // Cutoff for transparent PNGs

            // Processing in chunks to avoid blocking main thread
            const CHUNK_SIZE = 50; // Process 50 rows per frame
            let y = 0;

            const processChunk = () => {
                const endY = Math.min(y + CHUNK_SIZE, h);
                
                for (; y < endY; y++) {
                    for (let x = 0; x < w; x++) {
                        const px = x * step;
                        const py = y * step;
                        const pixelIndex = (py * width + px) * 4;

                        // Check Original Image Alpha (Exact Cutting)
                        const alpha = colorData[pixelIndex + 3];
                        
                        // Check Depth Value
                        const depthVal = depthData[pixelIndex];
                        
                        // Skip if transparent in original OR too dark in depth map (background)
                        // If the original image has transparency, we strictly use that.
                        // If it's a JPG (full opacity), we use the depth threshold.
                        const isBackground = alpha < alphaThreshold || (alpha > 250 && depthVal < depthThreshold);
                        
                        if (isBackground) continue;

                        // Normalize
                        const u = x / (w - 1);
                        const v = 1 - (y / (h - 1));

                        const vx = (u - 0.5) * 4;
                        const vy = (v - 0.5) * 4 * (height / width);
                        // Store raw normalized depth (0-1), scale applied in shader or mesh scale
                        const vz = (depthVal / 255); 

                        vertices.push(vx, vy, vz);
                        uvs.push(u, v);
                        grid[y * w + x] = vertexCount;
                        vertexCount++;
                    }
                }

                if (onProgress) onProgress(Math.round((y / h) * 100));

                if (y < h) {
                    // Schedule next chunk
                    requestAnimationFrame(processChunk);
                } else {
                    // Finished vertices, generate indices
                    // Index generation is fast enough to do in one go usually, but let's be safe
                    for (let iy = 0; iy < h - 1; iy++) {
                        for (let ix = 0; ix < w - 1; ix++) {
                            const a = grid[iy * w + ix];
                            const b = grid[iy * w + (ix + 1)];
                            const c = grid[(iy + 1) * w + ix];
                            const d = grid[(iy + 1) * w + (ix + 1)];

                            if (a !== -1 && b !== -1 && c !== -1 && d !== -1) {
                                indices.push(a, c, b);
                                indices.push(b, c, d);
                            }
                        }
                    }

                    const geometry = new THREE.BufferGeometry();
                    if (vertices.length > 0) {
                        geometry.setIndex(indices);
                        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
                        geometry.computeVertexNormals();
                    }
                    resolve(geometry);
                }
            };

            processChunk();

        } catch (e) {
            reject(e);
        }
    });
};

const GeneratedMesh: React.FC<Viewer3DProps> = ({ originalImage, depthMap, settings, onMeshReady, onProgress }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);
    const [texture, setTexture] = useState<THREE.Texture | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (!originalImage || !depthMap) return;

        let active = true;

        const generate = async () => {
            setIsGenerating(true);
            
            try {
                const imgLoader = new THREE.ImageLoader();
                const texLoader = new THREE.TextureLoader();

                const [imgEl, depthEl, tex] = await Promise.all([
                    imgLoader.loadAsync(originalImage),
                    imgLoader.loadAsync(depthMap),
                    texLoader.loadAsync(originalImage)
                ]);
                
                tex.colorSpace = THREE.SRGBColorSpace;
                if (!active) return;
                setTexture(tex);

                // Start async generation
                const geo = await createMeshFromDataAsync(
                    imgEl, 
                    depthEl, 
                    settings.displacementScale, 
                    (p) => { if(active && onProgress) onProgress(p); }
                );

                if (active) setGeometry(geo);
            } catch (e) {
                console.error("Mesh generation failed", e);
            } finally {
                if (active) setIsGenerating(false);
            }
        };

        generate();

        return () => { active = false; };
    }, [originalImage, depthMap]);

    // Update parent ref when mesh is ready
    useEffect(() => {
        if (meshRef.current && onMeshReady && geometry) {
            onMeshReady(meshRef.current);
        }
    }, [geometry, onMeshReady]);

    // Update Z scale based on settings without regenerating geometry
    useEffect(() => {
        if (meshRef.current && geometry) {
             // We stored normalized depth in Z. We scale the mesh Z axis to apply displacement.
             // However, to scale ONLY the displacement relative to the flat plane, 
             // we actually need to modify the position attribute or use a uniform.
             // For simplicity in this exporter-friendly version, we are baking it into the position
             // during generation. To allow dynamic updates efficiently, we'd need to keep a copy of original positions.
             // Given the request for "Exact" and "High Quality", baking is safer for export.
             // But for real-time slider, we can cheat by scaling the whole object Z,
             // though that scales the perspective depth too.
             // Let's rely on the geometry we created.
             // Note: Re-running generation on slider change is too slow. 
             // A vertex shader displacement is best for UI, but bad for export.
             // A CPU-side position update is best for export.
             
             // Optimisation: We will just scale the Z axis of the object.
             // It's an approximation but instant.
             meshRef.current.scale.z = settings.displacementScale;
        }
    }, [settings.displacementScale]);


    if (!geometry || !texture) return null;

    return (
        <Center>
            <mesh 
                ref={meshRef} 
                geometry={geometry} 
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
                    alphaTest={0.5} // Ensure transparency in texture is respected
                    transparent={true}
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

const PlaneFallback = ({ originalImage }: { originalImage: string }) => {
    const texture = useMemo(() => new THREE.TextureLoader().load(originalImage), [originalImage]);
    return (
        <mesh>
            <planeGeometry args={[3, 3]} />
            <meshBasicMaterial map={texture} transparent opacity={0.8} />
        </mesh>
    )
}
