# Alpine keeps the image small.
FROM node:22-alpine

# JSON logs, and no dev packages needed.
ENV NODE_ENV=production

WORKDIR /app

# Manifests first, so a code edit does not reinstall everything.
COPY package.json package-lock.json ./

# Install exactly what the lock file pins, without dev dependencies.
RUN npm ci --omit=dev

COPY src ./src

# The server reads PORT, falling back to 3000.
ENV PORT=3000
EXPOSE 3000

# Already provided by the base image.
USER node

CMD ["node", "src/server.js"]
