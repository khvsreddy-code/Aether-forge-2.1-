import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateDepthMap = async (imageBase64: string): Promise<string> => {
  try {
    const base64Data = imageBase64.split(',')[1] || imageBase64;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: base64Data,
            },
          },
          {
            text: "Generate a high-fidelity 16-bit grayscale depth map for this image. CRITICAL INSTRUCTION: The output MUST be identical in resolution and aspect ratio to the source. The background MUST be pure black (#000000). The subject MUST have sharp, pixel-perfect edges separating it from the background. Brighter values are foreground, darker values are background. Do not crop, resize, or alter the composition.",
          },
        ],
      },
      config: {
        topP: 0.9,
        temperature: 0.2, // Lower temperature for more deterministic/accurate results
      }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      throw new Error("No content generated");
    }

    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }

    throw new Error("No image data found in response");

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};