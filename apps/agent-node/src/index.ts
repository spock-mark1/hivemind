import dotenv from 'dotenv';
import { AgentEngine } from './agent/engine.js';
import { getConfig } from './config.js';

// Load environment variables
dotenv.config();

async function main() {
  console.log('🐝 Hivemind Agent Node Starting...\n');

  try {
    // Validate configuration
    const config = getConfig();
    console.log('Configuration:');
    console.log(`  Hub URL: ${config.HUB_URL}`);
    console.log(`  Agent Name: ${config.AGENT_NAME}`);
    console.log(`  Persona: ${config.AGENT_PERSONA}`);
    console.log(`  Twitter: @${config.TWITTER_USERNAME}`);
    console.log('');

    // Create and start agent engine
    const engine = new AgentEngine();
    await engine.start();

    // Handle graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n${signal} received, shutting down...`);
      await engine.stop();
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Keep process alive
    await new Promise(() => {});
  } catch (error) {
    console.error('❌ Failed to start agent:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
