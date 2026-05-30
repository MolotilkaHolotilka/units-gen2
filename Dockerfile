FROM node:22-bookworm-slim

# System libraries required by headless Chromium (Remotion video rendering).
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 libdbus-1-3 libatk1.0-0 libgbm-dev libasound2 \
    libxrandr2 libxkbcommon-dev libxfixes3 libxcomposite1 libxdamage1 \
    libatk-bridge2.0-0 libpango-1.0-0 libcairo2 libcups2 \
    fonts-liberation ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install prod deps inside the container (Linux binaries for @remotion/renderer).
COPY package*.json ./
RUN npm ci --omit=dev

# App source.
COPY . .

ENV PORT=8082
EXPOSE 8082
CMD ["node", "server.js"]
