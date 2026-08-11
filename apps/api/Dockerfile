# Multi-stage Dockerfile for @mini-erp/api (Monorepo root build context)
FROM node:20-alpine AS builder
WORKDIR /app

# Install monorepo dependencies using committed lockfile
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN npm ci

# Copy API source and generate Prisma Client + build TypeScript
COPY apps/api ./apps/api
RUN npm run prisma:generate --workspace=@mini-erp/api
RUN npm run build --workspace=@mini-erp/api

# Production runtime stage
FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/dist ./apps/api/dist

ENV NODE_ENV=production
WORKDIR /app/apps/api
EXPOSE 3000

CMD ["node", "dist/server.js"]
