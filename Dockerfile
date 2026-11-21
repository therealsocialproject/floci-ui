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

# Floci Console Contract v1/v2 self-description labels
LABEL io.floci.console.contract="1"
LABEL io.floci.console.name="Floci Web UI"
LABEL io.floci.console.port="3000"
LABEL io.floci.console.health-path="/api/health"
LABEL io.floci.console.health-ready-field="status"
LABEL io.floci.console.health-ready-value="ok"
LABEL io.floci.console.health-unavailable-value="unavailable"
LABEL io.floci.console.clouds="aws,gcp,az,oci"
LABEL io.floci.console.url="https://github.com/therealsocialproject/floci-ui"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone build
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
