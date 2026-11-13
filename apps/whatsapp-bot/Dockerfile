FROM node:20-slim

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install production and build dependencies
RUN npm install

# Copy source code and config
COPY . .

# Ensure sessions directory exists
RUN mkdir -p /app/sessions

# Default command: run multiLineListener via tsx
CMD ["npx", "tsx", "src/multiLineListener.ts"]
