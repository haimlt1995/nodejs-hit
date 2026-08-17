# Node 22 LTS on Alpine keeps the runtime image small.
FROM node:22-alpine

# Production mode: JSON logs, and no need for the development only packages.
ENV NODE_ENV=production

WORKDIR /app

# The manifests are copied first, so a code edit alone does not reinstall packages.
COPY package.json package-lock.json ./

# npm ci installs exactly what the lock file pins, omitting the dev dependencies.
RUN npm ci --omit=dev

COPY src ./src

# The server reads PORT and falls back to 3000 when it is absent.
ENV PORT=3000
EXPOSE 3000

# The base image already provides this unprivileged user.
USER node

CMD ["node", "src/server.js"]
