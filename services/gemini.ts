
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GeneratedSeo } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Phase 1: Search for book info using Google Search Grounding
 * Includes fallback to internal knowledge if Search tool fails (500 errors).
 */
export const searchBookInfo = async (bookName: string): Promise<string> => {
  const ai = getAI();
  
  // Attempt 1: Search Tool
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Good for search
      contents: `Find a detailed summary, key themes, and style of the original English book "${bookName}". Focus on what makes it unique.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    if (response.text) {
      return response.text;
    }
    console.warn("Search tool returned empty text, trying fallback...");
  } catch (error) {
    console.warn("Search tool failed (likely 500 error), trying fallback...", error);
    // Proceed to Attempt 2
  }

  // Attempt 2: Internal Knowledge (Fallback)
  try {
    console.log("Using internal knowledge fallback for book info...");
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are an expert literary archivist.
      Provide a comprehensive summary of the book "${bookName}".
      Include:
      1. Complete chapter-by-chapter breakdown (or section-by-section).
      2. Key quotes and stylistic elements.
      3. Core arguments or narrative arc.
      
      This text will serve as the "Source Text" for a strict script generation task, so be as detailed and accurate to the original text as possible.`,
    });
    return response.text || `No detailed info found for ${bookName}`;
  } catch (fallbackError) {
    console.error("Fallback generation failed:", fallbackError);
    throw new Error(`Failed to retrieve book information for "${bookName}". Please check the title or try again later.`);
  }
};

/**
 * Phase 2: Generate Podcast Script with Strict Sectioning
 */
export const generateScript = async (
  bookName: string,
  researchData: string,
  systemPrompt: string,
  audioRules: string,
  durationMinutes: number,
  language: string,
  emotion: string,
  speed: string
): Promise<string> => {
  const ai = getAI();
  
  // Avg speaking rate ~140 wpm
  let wordsPerMinute = 140;
  if (speed === 'Fast') wordsPerMinute = 160;
  if (speed === 'Slow') wordsPerMinute = 120;

  const wordCount = durationMinutes * wordsPerMinute;

  // We explicitly map the "researchData" to "Source Text" to satisfy the persona.
  // We force a specific separator format for later parsing.
  const prompt = `
    SYSTEM INSTRUCTIONS: ${systemPrompt}

    Input Data:
    Source Text: ${researchData}
    (Simulated Full Text for Summary)
    
    Target Duration: ${durationMinutes} minutes (approx ${wordCount} words).

    Configuration:
    Target Language: ${language}
    Tone/Emotion: ${emotion}
    Speaking Pace: ${speed}
    
    Audio Generation Rules (Structure):
    ${audioRules}
    
    CRITICAL FORMATTING INSTRUCTION:
    You must output the script in distinct sections. 
    Use the separator "###SECTION: [Title]###" exactly before every new part (Introduction, Chapter One, Chapter Two, Final Summary, etc.).
    
    Example Output:
    ###SECTION: Introduction###
    Summary of Atomic Habits by James Clear. Introduction...
    ###SECTION: Chapter One###
    Chapter One: The Fundamentals...
    ###SECTION: Final Summary###
    Final Summary...

    CRITICAL INSTRUCTION FOR AUDIO:
    1. Do not use [Music] or [Sound Effect] brackets.
    2. Do NOT use Markdown headers (like ## Chapter 1) as text content. Use the ###SECTION: ...### separator for structural division.
    3. You MUST explicitly write out structural markers as spoken sentences within the section content. 
       - If the rule says "Start with Chapter 1", you must write: "Chapter One: [Title/Topic]." 
       - You must PRONOUNCE the Chapter numbers. Do not skip them.
    4. Ensure clear spoken transitions between sections.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are the Literary Archive Agent. You write scripts for audio narration. Everything you output will be spoken aloud.",
      }
    });
    return response.text || "";
  } catch (error) {
    console.error("Script generation failed:", error);
    throw new Error("Failed to generate script.");
  }
};

/**
 * Phase 3: Text to Speech with Directive
 */
export const generateSpeech = async (
  text: string,
  voiceName: string,
  language: string,
  emotion: string
): Promise<string> => {
  const ai = getAI();
  
  // Construct a directive to guide the model's accent and tone
  // Gemini TTS supports simple prompting like "Say cheerfully: ..."
  // For languages, we explicitly ask for a native accent to help with pronunciation.
  let directive = `Say in a ${emotion.toLowerCase()} tone`;
  if (language !== 'English') {
      directive += ` with a native ${language} accent`;
  }
  directive += `: ${text}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: directive }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) throw new Error("No audio data received");
    
    return audioData;
  } catch (error) {
    console.error("TTS failed:", error);
    throw new Error("Failed to generate audio.");
  }
};

/**
 * Phase 5: Generate SEO
 */
export const generateSEO = async (
  bookName: string,
  script: string,
  language: string,
  descriptionTail: string,
  realTimestamps: string // Passed as a formatted string "[00:00:00] Intro..."
): Promise<GeneratedSeo> => {
  const ai = getAI();
  
  const descriptionInstruction = `
    Structure the description exactly as follows:
    1. Short Hook (2-3 sentences to grab attention)
    2. "Buy full book here: [Amazon Link]" (Include this placeholder text literally)
    3. Main Description (Extremely detailed summary, analysis, and key takeaways. TARGET LENGTH: 4500-5000 characters. Use the full length allowed by YouTube.)
    4. Timestamps (Use the EXACT list provided below. Do not invent new timestamps. Format must be "[00:00:00] Title".)
    5. Description Tail: Append the exact text provided below at the very end.
    
    Format Note: Ensure you use newline characters (\\n) to separate paragraphs, list items, and sections clearly so the text is easily readable in a text editor.
    
    PROVIDED TIMESTAMPS (Use these exactly):
    ${realTimestamps}

    Description Tail Text:
    "${descriptionTail}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate SEO metadata for a podcast episode about the book "${bookName}". 
      Language: ${language}.
      
      DESCRIPTION INSTRUCTIONS: ${descriptionInstruction}
      
      TAGS INSTRUCTIONS: Provide a comprehensive list of tags. The total character count of the comma-separated tags should be between 45 and 500 characters.
      
      Based on this script: ${script.substring(0, 5000)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Catchy SEO title (max 60 chars)" },
            description: { type: Type.STRING, description: "Formatted description with newlines. Approx 4500 chars." },
            tags: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Relevant tags (keywords)"
            }
          },
          required: ["title", "description", "tags"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Empty SEO response");
    
    return JSON.parse(jsonText) as GeneratedSeo;
  } catch (error) {
    console.error("SEO generation failed:", error);
    // Fallback
    return {
      title: `${bookName} Podcast`,
      description: `Listen to a summary of ${bookName}.\n\nBuy full book here: [Amazon Link]\n\n${realTimestamps}\n\n${descriptionTail}`,
      tags: ["podcast", "book", "summary", bookName]
    };
  }
};
