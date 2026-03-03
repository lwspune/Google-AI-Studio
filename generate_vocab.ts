import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateWords(count: number, difficulty: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate ${count} unique vocabulary words for NDA (National Defence Academy) entrance exam. 
    The difficulty level should be '${difficulty}'. 
    Format the response as a JSON array of objects with the following structure:
    {
      "word": string,
      "partOfSpeech": string,
      "definition": string,
      "example": string,
      "synonyms": string[],
      "antonyms": string[],
      "difficulty": "${difficulty}"
    }
    Ensure the words are high-frequency and relevant for competitive exams.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            partOfSpeech: { type: Type.STRING },
            definition: { type: Type.STRING },
            example: { type: Type.STRING },
            synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
            antonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
            difficulty: { type: Type.STRING }
          },
          required: ["word", "partOfSpeech", "definition", "example", "synonyms", "antonyms", "difficulty"]
        }
      }
    }
  });

  return JSON.parse(response.text);
}

async function main() {
  try {
    const common = await generateWords(50, 'common');
    const basic = await generateWords(50, 'basic');
    const advanced = await generateWords(50, 'advanced');
    
    const allWords = [...common, ...basic, ...advanced];
    console.log(JSON.stringify(allWords, null, 2));
  } catch (error) {
    console.error(error);
  }
}

main();
