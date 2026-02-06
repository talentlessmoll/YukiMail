import { GoogleGenAI } from "@google/genai";

export const generateEmailDraft = async (prompt: string, tone: string = 'professional') => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate a ${tone} email based on this description: ${prompt}. 
      Return your response in a clear format with a Subject line starting with "Subject: " and then the body. 
      Do not use any markdown formatting like bolding or headers. Just plain text.`,
    });
    
    return response.text || '';
  } catch (error) {
    console.error("Error generating email draft:", error);
    throw error;
  }
};

export const refineDraft = async (currentDraft: string, instruction: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Refine this email draft: \n\n${currentDraft}\n\nInstruction: ${instruction}. 
      Keep the "Subject: " line format.`,
    });
    
    return response.text || '';
  } catch (error) {
    console.error("Error refining email draft:", error);
    throw error;
  }
};
