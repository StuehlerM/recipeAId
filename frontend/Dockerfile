# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:24-alpine AS build
WORKDIR /app

# Receive the backend URL at build time (Vite bakes it into the bundle).
# docker-compose passes VITE_API_BASE_URL=http://localhost:8080 by default.
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Build the Vite app
COPY . .
RUN npm run build

# ── Runtime stage (nginx) ─────────────────────────────────────────────────────
FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Generate a self-signed TLS certificate for HTTPS (valid 10 years)
RUN apk add --no-cache openssl && \
    mkdir -p /etc/nginx/ssl && \
    openssl req -x509 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/key.pem \
        -out /etc/nginx/ssl/cert.pem \
        -days 3650 -nodes \
        -subj "/CN=localhost"

EXPOSE 80 443
