# ---------- BUILDER ----------
<<<<<<< Updated upstream
FROM node:22-alpine AS builder

WORKDIR /app

# Instalar dependencias del sistema necesarias para compilación
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    openssl \
    curl \
    ffmpeg

# Instalar pnpm globalmente
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiar archivos de configuración de pnpm y dependencias
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
COPY patches ./patches

# Instalar dependencias con pnpm (permite build scripts automáticamente)
RUN pnpm config set enable-pre-post-scripts true \
    && pnpm install --frozen-lockfile

# Copiar código fuente
COPY . .

# Generar Prisma client y compilar
RUN pnpm prisma generate && pnpm run build

# ---------- RUNTIME ----------
FROM node:22-alpine AS deploy

WORKDIR /app

ARG PORT=3001
ENV PORT=$PORT
ENV NODE_ENV=production

EXPOSE $PORT

# Instalar dependencias runtime (ffmpeg incluido para evitar problemas)
RUN apk add --no-cache \
    curl \
    openssl \
    libc6-compat \
    ffmpeg \
    postgresql-client

# Instalar pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Crear usuario no-root ANTES de copiar archivos
RUN addgroup -g 1001 -S nodejs \
    && adduser -S -u 1001 nodejs \
    && mkdir -p /app/bot_sessions /app/tokens /app/assets /app/tmp \
    && chown nodejs:nodejs /app /app/bot_sessions /app/tokens /app/assets /app/tmp

# Copiar archivos necesarios del builder con ownership correcto
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nodejs:nodejs /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=builder --chown=nodejs:nodejs /app/assets ./assets

# Copiar entrypoint script
# COPY docker-entrypoint.sh /usr/local/bin/
# RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nodejs

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/main.js"]
=======
    FROM node:22-alpine3.20 AS builder

    WORKDIR /app
    
    RUN apk add --no-cache --virtual .gyp \
            python3 \
            make \
            g++ \
        && apk add --no-cache git openssl
    
    # Instalar pnpm
    RUN npm install -g pnpm

    # Copiar archivos de dependencias (incluyendo lockfile y patches)
    COPY package*.json pnpm-lock.yaml ./
    COPY patches/ ./patches/
    
    RUN pnpm install --frozen-lockfile
    
    COPY . .
    
    RUN pnpm exec prisma generate && pnpm run build
    
    RUN apk del .gyp
    
    # ---------- RUNTIME ----------
    FROM node:22-alpine3.20 AS deploy
    
    WORKDIR /app
    
    ARG PORT=3001
    ARG PORT_WSP=3008
    ENV PORT=$PORT
    ENV PORT_WSP=$PORT_WSP
    ENV NODE_ENV=production
    
    EXPOSE $PORT
    EXPOSE $PORT_WSP
    
    # Herramientas mínimas necesarias
    RUN apk add --no-cache curl openssl libc6-compat
    
    COPY --from=builder /app/dist ./dist
    COPY --from=builder /app/prisma ./prisma
    COPY --from=builder /app/node_modules ./node_modules
    COPY --from=builder /app/package*.json ./
    COPY --from=builder /app/assets ./assets
    
    RUN addgroup -g 1001 -S nodejs \
        && adduser -S -u 1001 nodejs \
        && mkdir -p /app/bot_sessions \
        && chown -R nodejs:nodejs /app
    
    USER nodejs
    
    CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
>>>>>>> Stashed changes
    