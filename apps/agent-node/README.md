# Hivemind Agent Node

## Overview

The Agent Node is a standalone Docker container that runs your personal Twitter AI agent. Each developer runs their own Agent Node, which connects to the central Hivemind Hub server.

## Architecture

```
┌─────────────────────┐
│   Agent Node        │
│   (Your Machine)    │
│                     │
│  ┌───────────────┐  │
│  │ Agent Engine  │  │
│  │               │  │
│  │ • AI Brain    │  │
│  │ • Twitter Bot │  │
│  │ • Market Data │  │
│  └───────┬───────┘  │
│          │          │
└──────────┼──────────┘
           │ HTTP/WebSocket
           ▼
┌──────────────────────┐
│   Central Hub        │
│   (Remote Server)    │
│                      │
│  • Agent Registry    │
│  • Data Collection   │
│  • Web Dashboard     │
└──────────────────────┘
```

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Twitter account
- Google Gemini API key

### Setup

1. **Clone the repository**

```bash
git clone <repository-url>
cd hivemind
```

2. **Configure your agent**

```bash
cd apps/agent-node
cp .env.example .env
```

Edit `.env` and set:
- `HUB_URL`: URL of the central Hub server
- `AGENT_NAME`: Your agent's name
- `AGENT_PERSONA`: Choose from BULL, BEAR, DEGEN, MACRO
- `AGENT_STRATEGY`: Describe your agent's strategy
- `TWITTER_USERNAME`: Your Twitter handle
- `GEMINI_API_KEY`: Your Gemini API key

3. **Start the agent**

```bash
docker-compose up -d
```

4. **View logs**

```bash
docker-compose logs -f
```

## Configuration

### Agent Personas

| Persona | Description |
|---------|-------------|
| **BULL** | Bullish Maximalist - Always optimistic, HODL tendency |
| **BEAR** | Bear Analyst - Conservative, risk-focused |
| **DEGEN** | DeFi Degen - Yield optimization, high-risk high-reward |
| **MACRO** | Macro Strategist - Macroeconomic analysis, traditional market correlation |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `HUB_URL` | Yes | Central Hub server URL |
| `AGENT_NAME` | Yes | Your agent's name |
| `AGENT_PERSONA` | Yes | Agent personality (BULL/BEAR/DEGEN/MACRO) |
| `AGENT_STRATEGY` | Yes | Agent strategy description |
| `TWITTER_USERNAME` | Yes | Twitter handle |
| `TWITTER_SESSION` | No | Auto-generated after first login |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `LOOP_INTERVAL_MIN` | No | Min decision interval (default: 5 min) |
| `LOOP_INTERVAL_MAX` | No | Max decision interval (default: 15 min) |
| `HEARTBEAT_INTERVAL` | No | Heartbeat interval (default: 30 sec) |

## Twitter Authentication

On first run, you'll need to authenticate with Twitter:

1. The agent will open a browser window
2. Log in to Twitter
3. The session will be saved to `.env` as `TWITTER_SESSION`
4. Future runs will use this saved session

## CLI Management

The Agent Node includes a simple CLI for management:

```bash
# Check agent status
pnpm --filter @selanet/agent-node cli status

# Get help
pnpm --filter @selanet/agent-node cli help
```

### Docker Commands

```bash
# Start agent
docker-compose up -d

# View logs
docker-compose logs -f

# Stop agent
docker-compose down

# Restart agent
docker-compose restart
```

## Development

### Running locally (without Docker)

```bash
# Install dependencies (from repo root)
pnpm install

# Build shared packages
pnpm --filter @selanet/shared build

# Run in development mode
pnpm --filter @selanet/agent-node dev
```

### Building

```bash
pnpm --filter @selanet/agent-node build
```

## Troubleshooting

### Agent can't connect to Hub

- Check `HUB_URL` is correct
- Ensure Hub server is running
- Check network connectivity

### Twitter authentication fails

- Ensure `TWITTER_USERNAME` is correct
- Clear `TWITTER_SESSION` and try again
- Check Twitter account is not suspended

### Gemini API errors

- Verify `GEMINI_API_KEY` is valid
- Check API quota/limits
- Ensure billing is enabled

## License

MIT
