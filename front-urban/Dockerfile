FROM node:22.9-alpine AS base
WORKDIR /app

FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
# Instalar dependencias (lockfile desactualizado). Luego podrás volver a npm ci cuando esté sincronizado.
ENV npm_config_ignore_scripts=true
RUN npm install --legacy-peer-deps
ENV npm_config_ignore_scripts=false

FROM deps AS builder
ENV NEXT_TELEMETRY_DISABLED=1

COPY next.config.mjs ./next.config.mjs
COPY tsconfig.json ./tsconfig.json
COPY postcss.config.mjs ./postcss.config.mjs
COPY tailwind.config.ts ./tailwind.config.ts
COPY public ./public
COPY src ./src
COPY .env* ./

ENV NEXT_PUBLIC_BACKEND_URL=https://backend.cl-danzas.valentin-romero.online
ENV NEXT_PUBLIC_API_URL=https://backend.cl-danzas.valentin-romero.online
ENV NEXT_PUBLIC_APP_URL=https://frontend.cl-danzas.valentin-romero.online
ENV NEXT_PUBLIC_MIN_AUTH=30
ENV NEXT_PUBLIC_DOCS_URL=https://demos.themeselection.com/materio-mui-nextjs-admin-template/documentation
ENV NEXT_PUBLIC_PRO_URL=https://demos.themeselection.com/materio-mui-nextjs-admin-template/demo-1
ENV NEXT_PUBLIC_REPO_NAME=materio-mui-nextjs-admin-template-free
ENV NEXT_PUBLIC_WHATSAPP_NUMBER=3434067735
ENV REACT_EDITOR=code
ENV BACKEND_URL=http://urban_backend:3001
# Generate icons (was postinstall) then build Next.js with output tracing
RUN npm run build:icons && npm run build

FROM builder AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Use non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S -u 1001 nodejs

# Copy only necessary runtime files
COPY --from=builder /app/package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

ENV PORT=3000
EXPOSE 3000
USER nodejs

CMD ["node", "server.js"]