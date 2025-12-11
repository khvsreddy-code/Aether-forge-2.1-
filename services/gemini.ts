import { GoogleGenAI } from "@google/genai";
import { NeuralModel } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getModelPrompt = (model: NeuralModel) => {
  const base = "Generate a high-fidelity 16-bit grayscale depth map. CRITICAL: For 3D INFLATION. The center of the object must be WHITE (nearest). The edges of the silhouette must smoothly fade to BLACK (farthest/zero depth). ";
  
  switch(model) {
    case 'TripoSR':
        return base + "Style: TripoSR. GAME-READY ASSET MODE. Remove all background noise. Isolate the object completely. Edges must be sharp in the alpha channel but depth must taper to black to ensure a watertight mesh.";
    case 'Trellis':
        return base + "Style: Microsoft Trellis. Geometric precision. Planar surfaces should have uniform depth.";
    case 'InstantMesh':
        return base + "Style: InstantMesh. Smooth, noise-free gradients for rapid prototyping.";
    case 'Hunyuan3D':
        return base + "Style: Hunyuan3D v2.5. Detail-oriented. Texture bumps should be visible in depth.";
    case 'Point-E':
        return base + "Style: Point-E. Volumetric density representation.";
    case 'DreamFusion':
        return base + "Style: NeRF/DreamFusion. Soft lighting falloff.";
    case 'StableDiffusion3D':
        return base + "Style: SD-3D. Multi-view consistency focus.";
    case '3DTopia':
        return base + "Style: 3DTopia. Hybrid shape-texture fidelity.";
    default:
        return base + "Standard depth map.";
  }
};

const resizeImage = async (base64Str: string, maxWidth = 512): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const scale = maxWidth / Math.max(img.width, img.height);
                if (scale >= 1) {
                    resolve(base64Str);
                    return;
                }
                canvas.width = Math.floor(img.width * scale);
                canvas.height = Math.floor(img.height * scale);
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(base64Str);
                    return;
                }
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/png'));
            } catch (e) {
                console.error("Image resize failed", e);
                resolve(base64Str); 
            }
        };
        img.onerror = () => {
            console.warn("Image load failed during resize");
            resolve(base64Str); 
        };
    });
};

export const generateDepthMap = async (imageBase64: string, model: NeuralModel = 'TripoSR'): Promise<string> => {
  try {
    const optimizedImage = await resizeImage(imageBase64, 512);
    const base64Data = optimizedImage.split(',')[1] || optimizedImage;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', 
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64Data } },
          { text: getModelPrompt(model) },
        ],
      },
      config: { topP: 0.95, temperature: 0.2 }
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part?.inlineData?.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("No depth data generated");
  } catch (error) {
    console.error("Depth Engine Error:", error);
    throw error;
  }
};

export const generateBackView = async (frontImageBase64: string): Promise<string> => {
  try {
    const optimizedImage = await resizeImage(frontImageBase64, 512);
    const base64Data = optimizedImage.split(',')[1] || optimizedImage;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { mimeType: 'image/png', data: base64Data } },
                { text: "Generate the BACK VIEW of this character/object. Maintain exact silhouette and pose for 3D texture mapping. Pure black background. 3D Game Asset Style." }
            ]
        },
        config: { temperature: 0.4 }
    });

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part?.inlineData?.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("Back view generation failed");
  } catch (error) {
      console.warn("Back View Generation Failed, falling back to front view");
      return frontImageBase64; 
  }
};