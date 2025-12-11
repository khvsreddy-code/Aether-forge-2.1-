import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, Stars, Center, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei';
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

const GEOMETRY_RESOLUTION = 300; // Increased for smoother tapering
const MESH_SCALE = 4;

// Helper to get image data
const getImageData = (img: HTMLImageElement, w: number, h: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h);
};

const createMergedGeometry = async (
    frontImgSrc: string,
    frontDepthSrc: string,
    backImgSrc: string | null,
    backDepthSrc: string | null,
    displacementScale: number,
    isTripoMode: boolean
): Promise<THREE.BufferGeometry> => {
    return new Promise((resolve, reject) => {
        const loadImg = (src: string) => new Promise<HTMLImageElement>((res, rej) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => res(img);
            img.onerror = rej;
            img.src = src;
        });

        const promises = [loadImg(frontImgSrc), loadImg(frontDepthSrc)];
        if (backImgSrc && backDepthSrc) {
            promises.push(loadImg(backImgSrc));
            promises.push(loadImg(backDepthSrc));
        }

        Promise.all(promises).then((images) => {
            try {
                const [fImg, fDepth, bImg, bDepth] = images;
                const w = GEOMETRY_RESOLUTION;
                const aspect = fImg.width / fImg.height;
                const h = Math.round(w / aspect);

                const fColorData = getImageData(fImg, w, h);
                const fDepthData = getImageData(fDepth, w, h);
                const bColorData = bImg ? getImageData(bImg, w, h) : null;
                const bDepthData = bDepth ? getImageData(bDepth, w, h) : null;

                if (!fColorData || !fDepthData) throw new Error("Failed to extract image data");

                const vertices: number[] = [];
                const indices: number[] = [];
                const uvs: number[] = [];
                const colors: number[] = [];

                const gridFront = new Int32Array(w * h).fill(-1);
                const gridBack = new Int32Array(w * h).fill(-1);
                let vertexCount = 0;

                const addVertex = (x: number, y: number, z: number, r: number, g: number, b: number, u: number, v: number, isBack: boolean) => {
                    vertices.push(x, y, z);
                    colors.push(r, g, b);
                    uvs.push(u, v);
                    if (isBack) gridBack[y * w + x] = vertexCount;
                    else gridFront[y * w + x] = vertexCount;
                    vertexCount++;
                };

                // --- EDGE TAPERING CONFIG ---
                // This forces the geometry to close at the edges, making it watertight (Game Ready)
                // Even if the depth map isn't perfectly black at the edge, we force Z to 0.
                const taperStrength = isTripoMode ? 8.0 : 4.0; // TripoSR mode is more aggressive

                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < w; x++) {
                        const idx = (y * w + x) * 4;
                        const fAlpha = fColorData.data[idx + 3];

                        const u = x / (w - 1);
                        const v = 1 - (y / (h - 1));
                        const posX = (u - 0.5) * MESH_SCALE;
                        const posY = (v - 0.5) * MESH_SCALE / aspect;

                        // Calculate Taper Factor based on distance to UV edge
                        // We also use Alpha to taper. If alpha drops, Z must drop.
                        const distU = Math.min(u, 1 - u) * 2; // 0 at edge, 1 at center
                        const distV = Math.min(v, 1 - v) * 2;
                        
                        // Combine UV edge distance with Alpha value for "Organic Tapering"
                        const alphaFactor = fAlpha / 255;
                        const geoTaper = Math.min(1, Math.min(distU, distV) * taperStrength); 
                        const finalTaper = geoTaper * alphaFactor; 

                        if (fAlpha > 10) {
                            const dVal = fDepthData.data[idx] / 255;
                            // Apply Taper to Z
                            const z = (dVal * displacementScale * 0.5) * finalTaper; 
                            
                            addVertex(posX, posY, z, fColorData.data[idx]/255, fColorData.data[idx+1]/255, fColorData.data[idx+2]/255, u, v, false);
                        }

                        if (bColorData && bDepthData) {
                            const bAlpha = bColorData.data[idx + 3];
                            const bU = x / (w - 1);
                            // Flip X for back view geometric alignment
                            const bPosX = -(bU - 0.5) * MESH_SCALE; 
                            
                            if (bAlpha > 10) {
                                const bDistU = Math.min(bU, 1 - bU) * 2;
                                const bDistV = Math.min(v, 1 - v) * 2;
                                const bAlphaFactor = bAlpha / 255;
                                const bGeoTaper = Math.min(1, Math.min(bDistU, bDistV) * taperStrength);
                                const bFinalTaper = bGeoTaper * bAlphaFactor;

                                const dVal = bDepthData.data[idx] / 255;
                                const z = -(dVal * displacementScale * 0.5) * bFinalTaper; // Negative Z
                                
                                addVertex(bPosX, posY, z, bColorData.data[idx]/255, bColorData.data[idx+1]/255, bColorData.data[idx+2]/255, u, v, true);
                            }
                        }
                    }
                }

                // --- FACES ---
                const addFace = (a: number, b: number, c: number) => {
                    indices.push(a, b, c);
                };

                // Front Triangulation
                for (let y = 0; y < h - 1; y++) {
                    for (let x = 0; x < w - 1; x++) {
                        const a = gridFront[y * w + x];
                        const b = gridFront[y * w + (x + 1)];
                        const c = gridFront[(y + 1) * w + x];
                        const d = gridFront[(y + 1) * w + (x + 1)];

                        if (a !== -1 && b !== -1 && c !== -1 && d !== -1) {
                            // Standard winding
                            addFace(a, d, b);
                            addFace(d, c, b);
                        }
                    }
                }

                // Back Triangulation
                if (bColorData) {
                    for (let y = 0; y < h - 1; y++) {
                        for (let x = 0; x < w - 1; x++) {
                            const a = gridBack[y * w + x];
                            const b = gridBack[y * w + (x + 1)];
                            const c = gridBack[(y + 1) * w + x];
                            const d = gridBack[(y + 1) * w + (x + 1)];

                            if (a !== -1 && b !== -1 && c !== -1 && d !== -1) {
                                // Reverse winding for back faces
                                addFace(a, b, d);
                                addFace(d, c, b);
                            }
                        }
                    }
                }

                const geometry = new THREE.BufferGeometry();
                geometry.setIndex(indices);
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
                geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
                
                // Compute normals for lighting
                geometry.computeVertexNormals();

                resolve(geometry);

            } catch (e) {
                reject(e);
            }
        });
    });
};

const ModelRenderer = ({ originalImage, depthMap, backImage, backDepthMap, settings, onMeshReady }: Viewer3DProps) => {
    const groupRef = useRef<THREE.Group>(null);
    const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);

    useEffect(() => {
        if (!originalImage || !depthMap) return;
        
        const isTripo = settings.model === 'TripoSR';

        setTimeout(() => {
            createMergedGeometry(
                originalImage, 
                depthMap, 
                backImage, 
                backDepthMap, 
                settings.displacementScale,
                isTripo
            ).then(setGeometry).catch(console.error);
        }, 50);

    }, [originalImage, depthMap, backImage, backDepthMap, settings.displacementScale, settings.model]);

    useEffect(() => {
        if (groupRef.current && onMeshReady && geometry) {
            onMeshReady(groupRef.current);
        }
    }, [geometry, onMeshReady]);

    const matProps = {
        side: THREE.DoubleSide,
        roughness: settings.roughness,
        metalness: settings.metalness,
        wireframe: settings.wireframe,
        color: settings.wireframe ? settings.meshColor : 'white',
        vertexColors: true, 
    };

    if (!geometry) return null;

    if (settings.model === 'Point-E') {
        return (
            <group ref={groupRef}>
                <Center>
                    <points geometry={geometry}>
                        <pointsMaterial size={0.02} vertexColors sizeAttenuation transparent opacity={0.9} />
                    </points>
                </Center>
            </group>
        );
    }

    return (
        <group ref={groupRef}>
            <Center>
                <mesh geometry={geometry} castShadow receiveShadow>
                    {/* @ts-ignore */}
                    <meshStandardMaterial {...matProps} />
                </mesh>
            </Center>
        </group>
    );
};

export const Viewer3D: React.FC<Viewer3DProps> = (props) => {
  return (
    <div className="w-full h-full relative overflow-hidden bg-[#121212]">
      <Canvas shadows dpr={[1, 2]} camera={{ position: [3, 3, 6], fov: 35 }}>
        <PerspectiveCamera makeDefault position={[3, 2, 7]} />
        <OrbitControls 
          enableDamping 
          dampingFactor={0.05} 
          minDistance={2} 
          maxDistance={12}
          autoRotate={!!props.backImage}
          autoRotateSpeed={1.5}
          target={[0, 0, 0]}
        />
        
        <ambientLight intensity={0.7} />
        <spotLight position={[5, 8, 5]} intensity={1.8} angle={0.4} penumbra={0.5} castShadow color="#ffffff" shadow-bias={-0.0001} />
        <pointLight position={[-5, 2, -5]} intensity={1} color="#e0e7ff" />
        <spotLight position={[0, 3, -6]} intensity={1.5} color="#c084fc" angle={0.8} />

        <Environment preset="city" blur={0.8} />

        <group position={[0, 0, 0]}>
            <React.Suspense fallback={null}>
                {props.depthMap ? (
                    <ModelRenderer {...props} />
                ) : (
                    <PlaneFallback originalImage={props.originalImage} />
                )}
            </React.Suspense>
        </group>

        <Grid 
            position={[0, -1.2, 0]} 
            args={[20, 20]} 
            cellSize={0.5} 
            cellThickness={0.5} 
            cellColor="#333333" 
            sectionSize={2.5} 
            sectionThickness={1} 
            sectionColor="#555555" 
            fadeDistance={25} 
            infiniteGrid 
        />
        <ContactShadows position={[0, -1.2, 0]} opacity={0.6} scale={10} blur={2.5} far={2} color="#000000" />
        
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport axisColors={['#ff3653', '#8adb00', '#2c8fdf']} labelColor="black" />
        </GizmoHelper>

      </Canvas>
    </div>
  );
};

const PlaneFallback = ({ originalImage }: { originalImage: string }) => {
    const texture = useMemo(() => new THREE.TextureLoader().load(originalImage), [originalImage]);
    return (
        <mesh rotation={[0, 0, 0]} position={[0, 0, 0]}>
            <planeGeometry args={[2, 2]} />
            <meshBasicMaterial map={texture} transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
    )
}