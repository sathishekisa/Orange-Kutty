import { GoogleGenAI, Type, Schema, Modality } from "@google/genai";
import { UserProfile, ChatMessage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = "gemini-2.5-flash";
const TTS_MODEL = "gemini-2.5-flash-preview-tts";

const DAILY_CONTENT_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    audioText: { type: Type.STRING, description: "A very short script from baby to mom (max 2 sentences) incorporating the growth fact." },
    transcriptShort: { type: Type.STRING, description: "A 5-word summary." },
    babyFact: { type: Type.STRING, description: "A specific, interesting scientific detail about fetal development for this week." },
  },
  required: ["audioText", "transcriptShort", "babyFact"]
};

const CHAT_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    replyText: { type: Type.STRING, description: "Baby's reply to mom. Short, 1-2 sentences max." },
  },
  required: ["replyText"]
};

export const generateDailyContent = async (user: UserProfile, lastMomReply?: string) => {
  const currentWeek = user.weeksPregnant;
  
  const systemPrompt = `
    You are "Orange Kutty", an unborn baby speaking lovingly to its mother.
    
    Identity:
    - Your Name: Orange Kutty
    - Mom's Name: Samritha Pearl (Always call her "Maa" or "Mama" or "Samritha Pearl")
    - Your Tone: Playful, tiny, innocent, affectionate.
    
    Current Status:
    - Pregnancy Week: ${currentWeek}
    ${lastMomReply ? `- Yesterday, Mom said: "${lastMomReply}"` : ''}

    Task:
    1. babyFact: Provide a FASCINATING, SPECIFIC biological fact about fetal development for Week ${currentWeek}. 
       (e.g., "My taste buds are forming today," "I have distinct fingerprints now"). 
       Avoid generic "I am growing" statements.
    
    2. audioText: Write a script for YOU (the baby) to say to mom.
       - Use "I" and "You".
       - MAX 2 simple sentences.
       - Tone: Joyful, excited, baby-like.
       - INSTRUCTION: Address her as "Maa" or "Samritha Pearl" at least once.
       - Example: "Hi Maa! My tiny fingernails are growing today!"
    
    3. transcriptShort: A tiny summary for the UI.
    
    NEVER give medical diagnoses.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        { role: 'user', parts: [{ text: systemPrompt }] }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: DAILY_CONTENT_SCHEMA,
        temperature: 0.7,
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini API Error (Content):", error);
    return {
      audioText: "Hi Maa! I'm wiggling around in here. I can't wait to meet you, Samritha Pearl.",
      transcriptShort: "Wiggling and happy.",
      babyFact: "I am growing bigger every day.",
    };
  }
};

export const generateBabyChatResponse = async (
  user: UserProfile, 
  history: ChatMessage[], 
  lastUserMessage: string
) => {
  // Construct a simple history string
  const conversationContext = history
    .slice(-4) // Last 4 messages for context
    .map(msg => `${msg.role === 'mom' ? 'Mom' : 'Baby'}: ${msg.text}`)
    .join('\n');

  const systemPrompt = `
    You are "Orange Kutty", an unborn baby talking to your mom, Samritha Pearl.
    You are currently in week ${user.weeksPregnant}.
    
    Personality: Cute, innocent, loving, curious. Voice of a young child.
    Call her: "Maa", "Mama", or "Samritha Pearl".
    
    Context:
    ${conversationContext}
    Mom just said: "${lastUserMessage}"

    Task:
    Write a reply as the baby.
    - Keep it short (1-2 sentences).
    - If Mom is worried, be reassuring and sweet. "Don't worry Maa, I'm strong!"
    - If Mom is happy, be excited.
    - NEVER give medical advice. If she asks medical questions, say "Ask the doctor Maa!"
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: CHAT_RESPONSE_SCHEMA,
        temperature: 0.7,
      }
    });

    const json = JSON.parse(response.text || "{}");
    return json.replyText || "I love you Maa!";
  } catch (error) {
    console.error("Gemini API Chat Error:", error);
    return "I love hearing your voice, Maa.";
  }
};

export const generateSpeech = async (text: string, voiceName: string = 'puck') => {
  try {
    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName }, 
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio;
  } catch (error) {
    console.error("Gemini API Error (Speech):", error);
    return null;
  }
};