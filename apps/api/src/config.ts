import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  GEMINI_API_KEY: z.string(),
  COINGECKO_API_KEY: z.string().default(''),
  SELANET_API_URL: z.string().default('https://api.selanet.io'),
  SELANET_API_KEY: z.string().default(''),
  API_PORT: z.coerce.number().default(3001),
  JWT_SECRET: z.string().default('dev-secret-change-me'),
  SESSION_ENCRYPTION_KEY: z.string().default('dev-key-change-me-32-bytes!!!!!'),
  WS_CORS_ORIGIN: z.string().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
}).superRefine((data, ctx) => {
  if (data.NODE_ENV === 'production') {
    if (data.JWT_SECRET === 'dev-secret-change-me') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'JWT_SECRET must be set to a secure value in production',
        path: ['JWT_SECRET'],
      });
    }
    if (data.SESSION_ENCRYPTION_KEY === 'dev-key-change-me-32-bytes!!!!!') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'SESSION_ENCRYPTION_KEY must be set to a secure value in production',
        path: ['SESSION_ENCRYPTION_KEY'],
      });
    }
  }
});

export type EnvConfig = z.infer<typeof envSchema>;

let _config: EnvConfig | null = null;

export function getConfig(): EnvConfig {
  if (!_config) {
    _config = envSchema.parse(process.env);
  }
  return _config;
}
