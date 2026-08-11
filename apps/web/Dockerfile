# Multi-stage Dockerfile for @mini-erp/web (Monorepo root build context)
FROM node:20-alpine AS builder
WORKDIR /app

# Install monorepo dependencies using committed lockfile
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN npm ci

# Copy Web source and compile Vite SPA
COPY apps/web ./apps/web
RUN npm run build --workspace=@mini-erp/web

# Production Nginx runtime stage
FROM nginx:alpine
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
