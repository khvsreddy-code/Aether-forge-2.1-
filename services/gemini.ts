// services/inference.ts
import { Client } from "@gradio/client";
import { NeuralModel } from "../types";

// Helper to convert Base64 to Blob for Gradio upload
const base64ToBlob = async (base64: string): Promise<Blob> => {
  const res = await fetch(base64);
  return await res.blob();
};

const connectToSpace = async (spaceId: string, token: string, onStatus?: (s: string) => void) => {
    try {
        onStatus?.(`CONNECTING TO ${spaceId.toUpperCase()}...`);
        // Correct way to pass token to @gradio/client is via the hf_token property
        const options = token ? { hf_token: token as `hf_${string}` } : {};
        const client = await Client.connect(spaceId, options);
        return client;
    } catch (error: any) {
        console.error(`Connection failed to ${spaceId}:`, error);
        if (error.message?.includes("Could not resolve app config")) {
            throw new Error(`The AI Space '${spaceId}' is currently sleeping or overloaded. Please try a different model (like StableFast3D) or try again in a minute.`);
        }
        throw error;
    }
};

export const generate3DModel = async (
  imageBase64: string, 
  hfToken: string, 
  model: NeuralModel,
  seed: number,
  onStatusUpdate?: (status: string) => void
): Promise<string> => {
  
  const blob = await base64ToBlob(imageBase64);

  try {
    // Artificial delay to prevent race conditions in UI rendering
    await new Promise(r => setTimeout(r, 500));

    if (model === 'TripoSR') {
      return await generateTripoSR(blob, hfToken, onStatusUpdate);
    } else if (model === 'InstantMesh') {
      return await generateInstantMesh(blob, hfToken, onStatusUpdate);
    } else if (model === 'Trellis') {
      return await generateTrellis(blob, hfToken, seed, onStatusUpdate);
    } else if (model === 'StableFast3D') {
      return await generateStableFast3D(blob, hfToken, onStatusUpdate);
    } else if (model === 'Hunyuan3D') {
      return await generateHunyuan3D(blob, hfToken, seed, onStatusUpdate);
    } else {
        throw new Error(`Model ${model} does not have a public free tier API currently connected.`);
    }
  } catch (error: any) {
    console.error("Inference Error:", error);
    if (error.message?.includes("Queue")) {
        throw new Error("Public Queue is full. Please ensure your HF Token is valid or try a different model.");
    }
    throw new Error(error.message || "Generation failed. Please try a different image.");
  }
};

const generateTripoSR = async (blob: Blob, token: string, onStatus: any) => {
    const client = await connectToSpace("stabilityai/TripoSR", token, onStatus);
    
    onStatus?.("REMOVING BACKGROUND & EXTRUDING...");
    
    try {
      const result = await client.predict("/generate", [ 
          blob, // Input Image
          0.85, // Removal Threshold
          true  // Bake Occlusion
      ]);

      const data = result.data as any[];
      const modelUrl = data?.[1]?.url || data?.[1]?.name;
      
      if (modelUrl) return modelUrl;
    } catch (e) {
      console.warn("Primary Tripo endpoint failed", e);
    }

    throw new Error("TripoSR failed to generate a valid mesh.");
};

const generateInstantMesh = async (blob: Blob, token: string, onStatus: any) => {
    const client = await connectToSpace("TencentARC/InstantMesh", token, onStatus);
    
    onStatus?.("GENERATING MULTI-VIEW NORMALS...");
    
    const result = await client.predict("/generate", [
        blob, // Input Image
        true  // Remove Background
    ]);

    const data = result.data as any[];
    
    // Check both potential output locations
    if (data?.[0]?.url) return data[0].url;
    if (data?.[1]?.url && data[1].url.endsWith('.glb')) return data[1].url;

    throw new Error("InstantMesh did not return a GLB file.");
};

const generateTrellis = async (blob: Blob, token: string, seed: number, onStatus: any) => {
    const client = await connectToSpace("JeffreyXiang/TRELLIS", token, onStatus);
    
    onStatus?.("SOLVING GEOMETRY (SSM)...");
    
    const result = await client.predict("/image_to_3d", [
        blob, 
        seed || Math.floor(Math.random() * 1000), 
        0.8, // Simplification
        0.5
    ]);
    
    const data = result.data as any[];
    const glbOutput = data.find((item: any) => item?.url?.endsWith('.glb'));
    
    if (glbOutput) return glbOutput.url;
    
    throw new Error("Trellis generation completed but no GLB was found.");
};

const generateStableFast3D = async (blob: Blob, token: string, onStatus: any) => {
    const client = await connectToSpace("stabilityai/stable-fast-3d", token, onStatus);
    
    onStatus?.("RAPID MESH RECONSTRUCTION...");
    
    // StableFast3D parameters: image, texture_resolution, foreground_ratio
    const result = await client.predict("/run_image_to_3d", [
        blob, 
        1024, // Texture res
        0.95  // Foreground ratio
    ]);
    
    const data = result.data as any[];
    
    // Usually returns [glb_file]
    const glbOutput = data?.[0]?.url || data?.[0];
    
    if (glbOutput && typeof glbOutput === 'string' && glbOutput.endsWith('.glb')) {
        return glbOutput;
    }
    
    throw new Error("StableFast3D failed to return a valid GLB.");
};

const generateHunyuan3D = async (blob: Blob, token: string, seed: number, onStatus: any) => {
    // Using the 2.1 Space as requested
    const client = await connectToSpace("Tencent/Hunyuan3D-2.1", token, onStatus);
    
    onStatus?.("HUNYUAN 2.1: DIFFUSION TO MESH...");
    
    // Hunyuan3D-2.1 standard generation endpoint
    // Parameters typically: image, seed, steps
    const result = await client.predict("/generation", [
        blob, 
        seed || Math.floor(Math.random() * 100000), 
        50 // Default steps
    ]);
    
    const data = result.data as any[];
    
    // Look for GLB in output. Output might be [obj_path, glb_path, ...] or just a single file
    const glbOutput = data.find((item: any) => typeof item === 'string' && item.endsWith('.glb'))
                   || data.find((item: any) => item?.url?.endsWith('.glb'))?.url;
    
    if (glbOutput) return glbOutput;
    
    throw new Error("Hunyuan3D-2.1 generation finished but no GLB file was returned.");
};