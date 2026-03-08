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
COPY nginx-global.conf /etc/nginx/nginx.conf

# Optional: extra IP/hostname to include in the cert's Subject Alternative Names.
# Set VM_HOST=<your-ip-or-hostname> at build time to avoid browser cert warnings
# when accessing via that address (e.g. docker compose build --build-arg VM_HOST=1.2.3.4).
ARG VM_HOST=

# Generate a self-signed TLS certificate for HTTPS (valid 10 years).
# Always includes localhost/127.0.0.1; adds VM_HOST as a SAN when provided.
RUN apk add --no-cache openssl && \
    mkdir -p /etc/nginx/ssl && \
    SAN="DNS:localhost,IP:127.0.0.1" && \
    if [ -n "$VM_HOST" ]; then \
        case "$VM_HOST" in \
            [0-9]*) SAN="$SAN,IP:$VM_HOST" ;; \
            *)      SAN="$SAN,DNS:$VM_HOST" ;; \
        esac; \
    fi && \
    openssl req -x509 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/key.pem \
        -out /etc/nginx/ssl/cert.pem \
        -days 3650 -nodes \
        -subj "/CN=localhost" \
        -addext "subjectAltName=$SAN"

EXPOSE 80 443
