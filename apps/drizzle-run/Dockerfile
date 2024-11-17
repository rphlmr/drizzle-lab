ARG APP_NAME=drizzle-run

# base node image
FROM node:20-bookworm-slim AS node
RUN npm i -g turbo patch-package tsx vitest @arethetypeswrong/cli

# pruner
FROM node AS pruner
ARG APP_NAME
WORKDIR /app
COPY . .
RUN turbo prune $APP_NAME --docker
RUN rm -rf ./out/full/*/*/node_modules

# base node image
FROM node AS base
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/LICENCE .
COPY --from=pruner /app/patches ./patches

FROM base AS dev-deps
WORKDIR /app
RUN npm install --ignore-platform

FROM base AS production-deps
WORKDIR /app
ENV NODE_ENV=production
RUN npm install --production --ignore-platform

FROM base AS builder
ARG APP_NAME
WORKDIR /app
ENV NODE_ENV=production
COPY --from=pruner /app/out/full/ .
COPY --from=dev-deps /app/ .
COPY turbo.json turbo.json
RUN turbo build --filter=$APP_NAME

# Final image
FROM base AS runner
ARG APP_NAME
ENV PORT=3000
ENV TZ=UTC
ENV NODE_ENV=production
WORKDIR /app

COPY --from=production-deps /app .
COPY --from=builder /app/apps/$APP_NAME/package.json ./apps/$APP_NAME/package.json
COPY --from=builder /app/apps/$APP_NAME/build ./apps/$APP_NAME/build

# It is the root package.json
CMD [ "npm", "run", "drizzle-run:start" ]