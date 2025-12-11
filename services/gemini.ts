import { GoogleGenAI } from "@google/genai";
import { NeuralModel } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const getModelPrompt = (model: NeuralModel) => {
  const base = "Generate a high-fidelity 16-bit grayscale volumetric depth map. CRITICAL: This is for CYLINDRICAL 3D RECONSTRUCTION. The center of the object should be white (closest), and the sides must fade to black (furthest) to wrap around a central axis. ";
  
  switch(model) {
    case 'TripoSR':
        return base + "Style: TripoSR. Sharp object boundaries, solid volume. Ensure limb separation is distinct in depth values.";
    case 'Trellis':
        return base + "Style: Microsoft Trellis. Geometric accuracy. Planar surfaces should have uniform gray values.";
    case 'InstantMesh':
        return base + "Style: InstantMesh. Smooth curvature for organic wrapping. Minimal noise.";
    case 'Hunyuan3D':
        return base + "Style: Hunyuan3D v2.5. High frequency surface details (scales, cloth texture) overlaid on the volumetric base.";
    case 'Point-E':
        return base + "Style: Point-E. Density-based depth. Focus on the core mass of the object.";
    case 'DreamFusion':
        return base + "Style: NeRF/DreamFusion. Smooth gradients representing light falloff on a 3D volume.";
    case 'StableDiffusion3D':
        return base + "Style: SD-3D. Multi-view consistency. The depth edges must perfectly align with a potential back-view.";
    case '3DTopia':
        return base + "Style: 3DTopia. Hybrid shape-texture focus. Clear separation between foreground object and black background.";
    default:
        return base + "Standard cylindrical depth map.";
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
                { text: "Generate the BACK VIEW of this character/object. CRITICAL: This is for a 3D TEXTURE MAP. It must align perfectly with the front view's silhouette. Maintain the same pose, scale, and lighting. Pure black background." }
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