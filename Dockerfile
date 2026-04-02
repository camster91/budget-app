# ============================================
# Multi-stage production-ready Dockerfile for budget-app
# Optimized for Coolify deployment
# ============================================

# Stage 1: Dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    python3 \
    make \
    g++

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

# Stage 2: Build
FROM deps AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js with all optimizations
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Use standalone output for smaller final image
RUN npm run build

# Stage 3: Production runner
FROM node:20-alpine AS runner

# Install OpenSSL for Prisma and minimal runtime deps
RUN apk add --no-cache openssl dumb-init

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

# Create directory for Prisma (SQLite fallback or persistent volume)
RUN mkdir -p /app/prisma && chown -R nextjs:nodejs /app

# Copy built application and dependencies
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Copy package.json for npm scripts
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# Create writable directory for SQLite (if used) or volume mount
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

# Health check using Next.js response
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD wget -qO- http://localhost:3000/api/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start Next.js server binding to all interfaces
CMD ["node", "server.js"]
