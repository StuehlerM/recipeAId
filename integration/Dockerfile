FROM node:24-bookworm-slim

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Download Playwright's Chromium browser and all required OS dependencies
RUN node_modules/.bin/playwright install chromium --with-deps

# Copy project files
COPY . .

# Ensure the reports output directory exists
RUN mkdir -p reports

CMD ["npm", "test"]
