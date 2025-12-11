// This service now handles real 3D Inference APIs
import { NeuralModel } from "../types";

const TRIPO_API_URL = "https://api.tripo3d.ai/v2/openapi";

// Helper to convert base64 to blob for upload
const base64ToBlob = async (base64: string) => {
  const res = await fetch(base64);
  return await res.blob();
};

export const generate3DModel = async (
  imageBase64: string, 
  apiKey: string, 
  model: NeuralModel
): Promise<string> => {
  
  // Currently we route TripoSR to the Tripo API.
  // Other models would need their own endpoints (e.g. Replicate, HF Inference)
  if (model === 'TripoSR' || model === 'Trellis' || model === 'InstantMesh') {
     return generateTripoSR(imageBase64, apiKey);
  }

  throw new Error(`Integration for ${model} requires a custom GPU backend URL. Currently only TripoSR is fully integrated via public API.`);
};

const generateTripoSR = async (imageBase64: string, apiKey: string): Promise<string> => {
  if (!apiKey) throw new Error("Tripo API Key is required. Get one at platform.tripo3d.ai");

  try {
    // 1. Upload Image
    const blob = await base64ToBlob(imageBase64);
    const formData = new FormData();
    formData.append("file", blob, "input.png");

    const uploadRes = await fetch(`${TRIPO_API_URL}/upload`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}` },
      body: formData
    });

    if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(`Upload Failed: ${err.message || uploadRes.statusText}`);
    }

    const uploadData = await uploadRes.json();
    const imageToken = uploadData.data.image_token;

    // 2. Start Task
    const taskRes = await fetch(`${TRIPO_API_URL}/task`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}` 
      },
      body: JSON.stringify({
        type: "image_to_model",
        file: { type: "png", file_token: imageToken }
      })
    });

    if (!taskRes.ok) throw new Error("Failed to start generation task");
    const taskData = await taskRes.json();
    const taskId = taskData.data.task_id;

    // 3. Poll for Result
    let attempts = 0;
    while (attempts < 60) { // Timeout after ~2 minutes
      await new Promise(r => setTimeout(r, 2000)); // Poll every 2s
      
      const pollRes = await fetch(`${TRIPO_API_URL}/task/${taskId}`, {
        headers: { "Authorization": `Bearer ${apiKey}` }
      });
      
      if (!pollRes.ok) continue;
      
      const pollData = await pollRes.json();
      const status = pollData.data.status;

      if (status === 'success') {
        // Return the GLB URL
        return pollData.data.output.model;
      } else if (status === 'failed' || status === 'cancelled') {
        throw new Error("Generation failed on server side.");
      }
      
      attempts++;
    }
    
    throw new Error("Generation timed out.");

  } catch (error: any) {
    console.error("Tripo API Error:", error);
    throw new Error(error.message || "Unknown API Error");
  }
};
