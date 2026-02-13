#!/usr/bin/env node

import { HubClient } from '../hub-client.js';
import { getConfig } from '../config.js';
import dotenv from 'dotenv';

dotenv.config();

const commands = {
  status: async () => {
    const config = getConfig();
    const hub = new HubClient(config.HUB_URL);

    console.log('🐝 Hivemind Agent Node Status\n');
    console.log(`Agent ID: ${config.AGENT_ID || 'Not registered yet'}`);
    console.log(`Agent Name: ${config.AGENT_NAME}`);
    console.log(`Persona: ${config.AGENT_PERSONA}`);
    console.log(`Twitter: @${config.TWITTER_USERNAME}`);
    console.log(`Hub URL: ${config.HUB_URL}\n`);

    // Check Hub connectivity
    const isHealthy = await hub.healthCheck();
    console.log(`Hub Status: ${isHealthy ? '✅ Connected' : '❌ Unreachable'}`);

    if (config.AGENT_ID) {
      console.log(`\nTo view logs: docker-compose logs -f`);
      console.log(`To restart: docker-compose restart`);
    }
  },

  start: async () => {
    console.log('🚀 Starting Agent Node...');
    console.log('Use: docker-compose up -d');
  },

  stop: async () => {
    console.log('🛑 Stopping Agent Node...');
    console.log('Use: docker-compose down');
  },

  logs: async () => {
    console.log('📋 Viewing logs...');
    console.log('Use: docker-compose logs -f');
  },

  help: async () => {
    console.log('🐝 Hivemind Agent Node CLI\n');
    console.log('Available commands:');
    console.log('  status  - Show agent status and configuration');
    console.log('  start   - Start the agent node (Docker)');
    console.log('  stop    - Stop the agent node (Docker)');
    console.log('  logs    - View agent logs (Docker)');
    console.log('  help    - Show this help message\n');
    console.log('Examples:');
    console.log('  pnpm cli status');
    console.log('  docker-compose up -d');
    console.log('  docker-compose logs -f');
    console.log('  docker-compose down');
  },
};

const [, , command] = process.argv;

const run = async () => {
  const cmd = command && command in commands ? command as keyof typeof commands : 'help';

  try {
    await commands[cmd]();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

run();
