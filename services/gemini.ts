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
            text: "Generate a high-fidelity grayscale depth map. CRITICAL: The background MUST be pure black (#000000). The subject must be clearly separated from the background with sharp edges. Brighter values are closer, darker values are further. Do not change the aspect ratio or composition.",
          },
        ],
      },
      config: {
        topP: 0.95,
        temperature: 0.3, 
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