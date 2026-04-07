# Base image
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client specifically targeted for Linux inside the Alpine container
RUN npx prisma generate

# Build Next.js application (standalone mode activated via next.config.ts)
RUN npm run build

# Production image orchestrates the exact runtime environment cleanly
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Expose Public assets directly
COPY --from=builder /app/public ./public

# Automatically leverage Next.js output traces to dramatically reduce image footprint
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Transfer SQLite artifacts (Swap to postgres networking via Compose for production if requested)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/dev.db ./dev.db

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
