# syntax=docker/dockerfile:1

# Bouwstap: alle afhankelijkheden en de gebouwde client.
FROM node:24-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build

# Productieafhankelijkheden apart, zonder devDependencies.
FROM node:24-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Runtime: alleen wat de server nodig heeft. Geen .env of secrets in het image.
FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3210 \
    DATA_DIR=/data
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist/client ./dist/client
COPY package.json ./
COPY server ./server
COPY shared ./shared
COPY scripts/backup.mjs ./scripts/backup.mjs
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 3210
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --start-interval=2s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3210)+'/api/health').then(r=>r.json()).then(b=>process.exit(b.ok===true?0:1)).catch(()=>process.exit(1))"]
CMD ["node_modules/.bin/tsx", "server/index.ts"]
