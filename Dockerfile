# Multi-stage Dockerfile for Floci Web UI
FROM node:22.23.4-alpine AS builder
WORKDIR /app

# Enforce CVE-2026-111497 (Node2Shell) minimum patched Node.js runtime
RUN node -e "const [M,m,p]=process.versions.node.split('.').map(Number);const ok=(M===22&&(m>23||(m===23&&p>=4)))||(M===24&&(m>22||(m===22&&p>=1)))||(M>=26&&(M>26||m>12||(m===12&&p>=1)));if(!ok){console.error('[floci-ui] Unpatched Node.js runtime for CVE-2026-111497: '+process.versions.node);process.exit(1)}"

COPY package*.json ./
RUN npm ci

COPY . .
RUN mkdir -p public && npm run build

FROM node:22.23.4-alpine AS runner
WORKDIR /app

# Enforce CVE-2026-111497 (Node2Shell) minimum patched Node.js runtime
RUN node -e "const [M,m,p]=process.versions.node.split('.').map(Number);const ok=(M===22&&(m>23||(m===23&&p>=4)))||(M===24&&(m>22||(m===22&&p>=1)))||(M>=26&&(M>26||m>12||(m===12&&p>=1)));if(!ok){console.error('[floci-ui] Unpatched Node.js runtime for CVE-2026-111497: '+process.versions.node);process.exit(1)}"

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy standalone build
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
