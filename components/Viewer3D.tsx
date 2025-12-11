import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, Stars, Center } from '@react-three/drei';
import * as THREE from 'three';
import { ModelSettings } from '../types';

interface Viewer3DProps {
  originalImage: string;
  depthMap: string | null;
  backImage: string | null;
  backDepthMap: string | null;
  settings: ModelSettings;
  onMeshReady?: (object: THREE.Object3D) => void;
  onProgress?: (progress: number) => void;
}

// Higher resolution for smoother curved surfaces
const GEOMETRY_RESOLUTION = 300; 

const createVolumetricGeometry = async (
    image: string,
    depth: string,
    displacementScale: number,
    isBack: boolean
): Promise<THREE.BufferGeometry> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const dImg = new Image();
        
        let loaded = 0;
        let hasError = false;

        const checkLoad = () => {
            if (hasError) return;
            loaded++;
            if (loaded === 2) process();
        };

        const handleError = (e: string | Event) => {
            if (hasError) return;
            hasError = true;
            reject(new Error(`Failed to load images: ${e}`));
        };

        // Cross-origin might be needed depending on source, usually base64 is fine
        img.onload = checkLoad;
        img.onerror = handleError;
        img.src = image;

        dImg.onload = checkLoad;
        dImg.onerror = handleError;
        dImg.src = depth;

        const process = () => {
            try {
                const w = GEOMETRY_RESOLUTION;
                const aspect = img.width / img.height;
                const h = Math.round(w / aspect);

                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                if (!ctx) throw new Error('Context error');

                // Read Color
                ctx.drawImage(img, 0, 0, w, h);
                const colorData = ctx.getImageData(0, 0, w, h).data;

                // Read Depth
                ctx.clearRect(0, 0, w, h);
                ctx.drawImage(dImg, 0, 0, w, h);
                const depthData = ctx.getImageData(0, 0, w, h).data;

                const vertices: number[] = [];
                const indices: number[] = [];
                const uvs: number[] = [];
                const colors: number[] = []; 

                let vertexCount = 0;
                const grid = new Int32Array(w * h).fill(-1);

                // Volumetric Configuration
                const radiusBase = 0.5; // The "core" thickness of the model
                const heightScale = 4.0; 
                
                // We wrap the image around a cylinder.
                // Front image covers -90 to +90 degrees.
                // Back image covers 90 to 270 degrees.

                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        const i = (y * w + x) * 4;
                        const alpha = colorData[i + 3];

                        // Skip fully transparent pixels to carve the silhouette
                        if (alpha < 50) continue;

                        // Normalized UV
                        const u = x / (w - 1);
                        const v = 1 - (y / (h - 1));

                        // Depth Value (0 = Far/Core, 1 = Near/Surface)
                        const dVal = depthData[i] / 255;
                        
                        // --- CYLINDRICAL MAPPING MATH ---
                        
                        // Angle: 
                        // If Front: Map u(0..1) to angle (-PI/3 to +PI/3) approx, to avoid extreme stretching at edges?
                        // Or map to full (-PI/2 to PI/2).
                        // Let's use a slightly narrower FOV for the texture to preserve details on the "face" 
                        // and let the curvature handle the sides.
                        const arcAngle = Math.PI * 0.9; // 162 degrees coverage per side
                        const angleOffset = isBack ? Math.PI : 0;
                        const theta = ((u - 0.5) * arcAngle) + angleOffset;

                        // Radius displacement
                        // The brighter the depth pixel, the further out from the center axis it pushes.
                        // We add a base radius so the character has volume even at "black" depth.
                        const r = (radiusBase * 0.5) + (dVal * displacementScale * 0.6);

                        // Convert Polar to Cartesian (X, Z)
                        // Note: In Three.js, Y is up. X is Right. Z is Forward.
                        const vx = r * Math.sin(theta);
                        const vz = r * Math.cos(theta);
                        const vy = (v - 0.5) * heightScale;

                        vertices.push(vx, vy, vz);
                        uvs.push(u, v);
                        colors.push(colorData[i]/255, colorData[i+1]/255, colorData[i+2]/255);

                        grid[y * w + x] = vertexCount;
                        vertexCount++;
                    }
                }

                // Generate Faces with cleanup for edge tearing
                for (let y = 0; y < h - 1; y++) {
                    for (let x = 0; x < w - 1; x++) {
                        const a = grid[y * w + x];
                        const b = grid[y * w + (x + 1)];
                        const c = grid[(y + 1) * w + x];
                        const d = grid[(y + 1) * w + (x + 1)];

                        if (a !== -1 && b !== -1 && c !== -1 && d !== -1) {
                            // Filter long triangles that span across gaps (silhouette tearing)
                            const vA = new THREE.Vector3(vertices[a*3], vertices[a*3+1], vertices[a*3+2]);
                            const vB = new THREE.Vector3(vertices[b*3], vertices[b*3+1], vertices[b*3+2]);
                            const vC = new THREE.Vector3(vertices[c*3], vertices[c*3+1], vertices[c*3+2]);
                            
                            const distAB = vA.distanceTo(vB);
                            const distAC = vA.distanceTo(vC);
                            
                            // If vertices are too far apart physically but adjacent in grid, it's a depth jump (gap)
                            if (distAB < 0.2 && distAC < 0.2) {
                                // Correct winding order for visibility
                                // Front: Counter-Clockwise?
                                // Since we are inside the cylinder looking out or outside looking in?
                                // Standard CCW.
                                indices.push(a, d, b);
                                indices.push(a, c, d);
                            }
                        }
                    }
                }

                const geometry = new THREE.BufferGeometry();
                geometry.setIndex(indices);
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
                geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
                geometry.computeVertexNormals();

                resolve(geometry);
            } catch (e) {
                reject(e);
            }
        };
    });
};

const ModelRenderer = ({ originalImage, depthMap, backImage, backDepthMap, settings, onMeshReady }: Viewer3DProps) => {
    const groupRef = useRef<THREE.Group>(null);
    const [frontGeo, setFrontGeo] = useState<THREE.BufferGeometry | null>(null);
    const [backGeo, setBackGeo] = useState<THREE.BufferGeometry | null>(null);

    const frontTex = useMemo(() => new THREE.TextureLoader().load(originalImage), [originalImage]);
    const backTex = useMemo(() => backImage ? new THREE.TextureLoader().load(backImage) : null, [backImage]);

    useEffect(() => {
        if (!originalImage || !depthMap) return;
        createVolumetricGeometry(originalImage, depthMap, settings.displacementScale, false)
            .then(setFrontGeo)
            .catch(e => console.error("Front geometry failed", e));
    }, [originalImage, depthMap, settings.displacementScale]);

    useEffect(() => {
        if (!backImage || !backDepthMap) {
            setBackGeo(null);
            return;
        }
        createVolumetricGeometry(backImage, backDepthMap, settings.displacementScale, true)
            .then(setBackGeo)
            .catch(e => console.error("Back geometry failed", e));
    }, [backImage, backDepthMap, settings.displacementScale]);

    useEffect(() => {
        if (groupRef.current && onMeshReady && (frontGeo || backGeo)) {
            onMeshReady(groupRef.current);
        }
    }, [frontGeo, backGeo, onMeshReady]);

    // Material logic
    const MaterialComponent = settings.wireframe ? 'meshBasicMaterial' : 'meshStandardMaterial';
    const matProps = {
        map: frontTex,
        side: THREE.DoubleSide,
        roughness: settings.roughness,
        metalness: settings.metalness,
        wireframe: settings.wireframe,
        color: settings.wireframe ? settings.meshColor : 'white',
        transparent: true, // Helps with alpha edges
        alphaTest: 0.5,
    };

    // --- POINT-E MODE (Point Cloud) ---
    if (settings.model === 'Point-E') {
        return (
            <group ref={groupRef} rotation={[0, Math.PI, 0]}>
                 <Center>
                {frontGeo && (
                    <points geometry={frontGeo}>
                        <pointsMaterial size={0.015} vertexColors sizeAttenuation transparent opacity={0.8} />
                    </points>
                )}
                {backGeo && (
                     <points geometry={backGeo}>
                        <pointsMaterial size={0.015} vertexColors sizeAttenuation transparent opacity={0.8} />
                    </points>
                )}
                </Center>
            </group>
        );
    }

    // --- SOLID MESH MODE ---
    return (
        <group ref={groupRef} rotation={[0, Math.PI, 0]}> 
        {/* Rotate PI because our calculation puts front at -Z usually, we want it facing camera at +Z */}
            <Center>
            {frontGeo && (
                <mesh geometry={frontGeo} castShadow receiveShadow>
                    {/* @ts-ignore */}
                    <meshStandardMaterial {...matProps} map={frontTex} />
                </mesh>
            )}
            {backGeo && (
                <mesh geometry={backGeo} castShadow receiveShadow>
                    {/* @ts-ignore */}
                    <meshStandardMaterial {...matProps} map={backTex || frontTex} />
                </mesh>
            )}
            {/* Core Filler Mesh (Hides internal gaps if viewing from steep angles) */}
            {frontGeo && (
                 <mesh scale={[0.4, 3.5, 0.4]} position={[0, 0, 0]}>
                    <cylinderGeometry args={[1, 1, 1, 16]} />
                    <meshBasicMaterial color="#1a1a1a" />
                 </mesh>
            )}
            </Center>
        </group>
    );
};

export const Viewer3D: React.FC<Viewer3DProps> = (props) => {
  return (
    <div className="w-full h-full relative overflow-hidden bg-void">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#050510] to-[#000000] z-0 pointer-events-none"></div>
      
      <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 1, 5], fov: 35 }}>
        <PerspectiveCamera makeDefault position={[0, 0.5, 6]} />
        <OrbitControls 
          enableDamping 
          dampingFactor={0.05} 
          minDistance={2} 
          maxDistance={12}
          autoRotate={!!props.backImage}
          autoRotateSpeed={2}
          maxPolarAngle={Math.PI / 1.5} // Don't allow going too far below
          minPolarAngle={Math.PI / 4}
        />
        
        {/* Cinematic Studio Lighting */}
        <ambientLight intensity={0.5} />
        <spotLight position={[5, 5, 5]} intensity={1.5} angle={0.5} penumbra={1} castShadow color="#ffffff" />
        <spotLight position={[-5, 5, -5]} intensity={1} angle={0.5} penumbra={1} color="#a5b4fc" />
        <pointLight position={[0, -2, 2]} intensity={0.5} color="#c084fc" />
        
        {props.settings.model === 'Point-E' ? (
             <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        ) : (
             <Environment preset="city" blur={0.7} background={false} />
        )}

        <group position={[0, 0, 0]}>
            <React.Suspense fallback={null}>
                {props.depthMap ? (
                    <ModelRenderer {...props} />
                ) : (
                    <PlaneFallback originalImage={props.originalImage} />
                )}
            </React.Suspense>
        </group>

        <ContactShadows position={[0, -2.5, 0]} opacity={0.6} scale={10} blur={2.5} far={4} color="#000000" />
        <gridHelper args={[20, 20, 0x1e1b4b, 0x000000]} position={[0, -2.5, 0]} />
      </Canvas>
    </div>
  );
};

const PlaneFallback = ({ originalImage }: { originalImage: string }) => {
    const texture = useMemo(() => new THREE.TextureLoader().load(originalImage), [originalImage]);
    return (
        <mesh>
            <planeGeometry args={[2, 2]} />
            <meshBasicMaterial map={texture} transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
    )
}