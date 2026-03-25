import { GoogleGenAI } from "@google/genai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

export async function searchAI(query: string) {
  if (!API_KEY) {
    console.error("Gemini API Key is missing. Please set VITE_GEMINI_API_KEY in your environment.");
    throw new Error("API Key missing");
  }

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: query,
      config: {
        tools: [{ googleMaps: {} }],
      },
    });

    // Return the response text or grounded results
    const text = response.text;
    const mapsResults = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.filter((c: any) => c.maps)
      ?.map((c: any) => c.maps) || [];

    return {
      text,
      mapsResults
    };
  } catch (error) {
    console.error("Gemini AI Search Error:", error);
    throw error;
  }
}
