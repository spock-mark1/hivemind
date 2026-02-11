import Anthropic from '@anthropic-ai/sdk';
import { getConfig } from '../config.js';

let client: Anthropic | null = null;

export function getClaude(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: getConfig().ANTHROPIC_API_KEY });
  }
  return client;
}

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Send a message to Claude and get a text response
 */
export async function askClaude(
  systemPrompt: string,
  messages: ClaudeMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const claude = getClaude();
  const response = await claude.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: options?.maxTokens ?? 1024,
    temperature: options?.temperature ?? 0.7,
    system: systemPrompt,
    messages,
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock?.text ?? '';
}

/**
 * Ask Claude to respond in JSON format
 */
export async function askClaudeJSON<T>(
  systemPrompt: string,
  messages: ClaudeMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<T> {
  const response = await askClaude(
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
    throw new Error(`Claude returned invalid JSON: ${jsonStr.slice(0, 200)}`);
  }
}
