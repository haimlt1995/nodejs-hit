# Alpine keeps the image small.
FROM node:22-alpine

# JSON logs, and no dev packages needed.
ENV NODE_ENV=production

WORKDIR /app

# Which service this image runs: logs, users, costs, about, or general.
#   docker build --build-arg SERVICE=users -t nodejs-hit-users .
ARG SERVICE=costs

# Manifest first, so a code edit does not reinstall everything.
COPY microservices/${SERVICE}/package.json ./

# Each service carries its own dependencies, so this is all it needs.
RUN npm install --omit=dev

# The service folder is the whole application.
COPY microservices/${SERVICE}/ ./

# Every service listens on 3000, each on its own server.
EXPOSE 3000

# The base image already provides this unprivileged user.
USER node

CMD ["node", "index.js"]
