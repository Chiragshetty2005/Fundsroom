# Multi-stage Dockerfile for @mini-erp/web

FROM node:20 AS builder
WORKDIR /app

# Install monorepo dependencies
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

RUN npm ci

# Copy Web source
COPY apps/web ./apps/web

# Build Vite SPA
RUN npm run build --workspace=@mini-erp/web

# Production Nginx runtime
FROM nginx:alpine

COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]