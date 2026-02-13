FROM node:20-slim

# Install Playwright dependencies
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY packages ./packages
COPY apps/agent-node ./apps/agent-node

# Install dependencies
RUN pnpm install --frozen-lockfile

# Install Playwright browsers
RUN cd apps/agent-node && pnpm exec playwright install chromium

# Build
RUN pnpm --filter @selanet/agent-node build

WORKDIR /app/apps/agent-node

# Run
CMD ["node", "dist/index.js"]
