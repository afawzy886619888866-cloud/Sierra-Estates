# Sierra Estates — WhatsApp Bot Dockerfile
# Long-running WhatsApp Web.js bot process

FROM node:24-alpine
WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY . .

# WhatsApp Web.js needs a display for QR scanning (uses puppeteer)
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

EXPOSE 3002
CMD ["npm", "start"]