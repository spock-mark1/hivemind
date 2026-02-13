import { z } from 'zod';

const configSchema = z.object({
  // Hub Server
  HUB_URL: z.string().url(),

  // Agent Configuration
  AGENT_ID: z.string().optional(),
  AGENT_NAME: z.string(),
  AGENT_PERSONA: z.enum(['BULL', 'BEAR', 'DEGEN', 'MACRO']),
  AGENT_STRATEGY: z.string(),

  // Twitter Configuration
  TWITTER_USERNAME: z.string(),
  TWITTER_SESSION: z.string().optional(), // JSON string of session data

  // API Keys
  GEMINI_API_KEY: z.string(),
  COINGECKO_API_KEY: z.string().optional(),
  SELANET_API_URL: z.string().url().optional(),
  SELANET_API_KEY: z.string().optional(),

  // Worker Settings
  LOOP_INTERVAL_MIN: z.string().default('5'),
  LOOP_INTERVAL_MAX: z.string().default('15'),
  HEARTBEAT_INTERVAL: z.string().default('30'),
});

export type Config = z.infer<typeof configSchema>;

let cachedConfig: Config | null = null;

export function getConfig(): Config {
  if (cachedConfig) return cachedConfig;

  const raw = {
    HUB_URL: process.env.HUB_URL,
    AGENT_ID: process.env.AGENT_ID,
    AGENT_NAME: process.env.AGENT_NAME,
    AGENT_PERSONA: process.env.AGENT_PERSONA,
    AGENT_STRATEGY: process.env.AGENT_STRATEGY,
    TWITTER_USERNAME: process.env.TWITTER_USERNAME,
    TWITTER_SESSION: process.env.TWITTER_SESSION,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    COINGECKO_API_KEY: process.env.COINGECKO_API_KEY,
    SELANET_API_URL: process.env.SELANET_API_URL,
    SELANET_API_KEY: process.env.SELANET_API_KEY,
    LOOP_INTERVAL_MIN: process.env.LOOP_INTERVAL_MIN,
    LOOP_INTERVAL_MAX: process.env.LOOP_INTERVAL_MAX,
    HEARTBEAT_INTERVAL: process.env.HEARTBEAT_INTERVAL,
  };

  cachedConfig = configSchema.parse(raw);
  return cachedConfig;
}
