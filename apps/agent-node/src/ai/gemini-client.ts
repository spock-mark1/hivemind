import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import { getConfig } from '../config.js';

let client: GoogleGenerativeAI | null = null;

export function getGemini(): GoogleGenerativeAI {
  if (!client) {
    client = new GoogleGenerativeAI(getConfig().GEMINI_API_KEY);
  }
  return client;
}

export interface GeminiMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Send a message to Gemini and get a text response
 */
export async function askGemini(
  systemPrompt: string,
  messages: GeminiMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const gemini = getGemini();
  const model = gemini.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: systemPrompt,
    generationConfig: {
      maxOutputTokens: options?.maxTokens ?? 1024,
      temperature: options?.temperature ?? 0.7,
    },
  });

  // Map messages to Gemini format: 'assistant' → 'model'
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === 'assistant' ? 'model' as const : 'user' as const,
    parts: [{ text: m.content }],
  }));

  const lastMessage = messages[messages.length - 1];

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(lastMessage.content);

  return result.response.text();
}

/**
 * Ask Gemini to respond in JSON format
 */
export async function askGeminiJSON<T>(
  systemPrompt: string,
  messages: GeminiMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<T> {
  const response = await askGemini(
    systemPrompt + '\n\nIMPORTANT: Respond ONLY with valid JSON, no markdown or explanation.',
    messages,
    options
  );

  // Extract JSON from response (handle possible markdown code blocks)
  let jsonStr = response.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    throw new Error(`Gemini returned invalid JSON: ${jsonStr.slice(0, 200)}`);
  }
}
