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

# Which of the four processes this image runs. Override it per deployment:
#   docker build --build-arg SERVICE=users -t nodejs-hit-users .
ARG SERVICE=costs
ENV SERVICE=${SERVICE}

# Each service also has its own default port; PORT overrides it.
EXPOSE 3001 3002 3003 3004

# The base image already provides this unprivileged user.
USER node

CMD ["sh", "-c", "node microservices/$SERVICE/index.js"]
