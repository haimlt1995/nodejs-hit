# Alpine keeps the image small.
FROM node:22-alpine

# JSON logs, and no dev packages needed.
ENV NODE_ENV=production

WORKDIR /app

# Manifests first, so a code edit does not reinstall everything.
COPY package.json package-lock.json ./

# Install exactly what the lock file pins, without dev dependencies.
RUN npm ci --omit=dev

COPY models ./models
COPY shared ./shared
COPY microservices ./microservices
COPY scripts ./scripts

# Which process this image runs: logs, users, costs, about, or general.
#   docker build --build-arg SERVICE=users -t nodejs-hit-users .
ARG SERVICE=costs
ENV SERVICE=${SERVICE}

# Every service listens on 3000, each on its own server.
EXPOSE 3000

# The base image already provides this unprivileged user.
USER node

CMD ["sh", "-c", "node microservices/$SERVICE/index.js"]
