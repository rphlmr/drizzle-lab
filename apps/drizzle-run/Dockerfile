ARG APP_NAME=drizzle-run

# Base image
FROM node:22.18-alpine@sha256:1b2479dd35a99687d6638f5976fd235e26c5b37e8122f786fcd5fe231d63de5b AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max_old_space_size=4096"
RUN addgroup --system --gid 1001 rr && \
	adduser --system --uid 1001 --ingroup rr rr && \
	apk add --no-cache gcompat && \
	corepack enable && \
	pnpm install turbo --global

# Build base (adds git only for build stages)
FROM base AS build-base
RUN apk add --no-cache git

# Pruner
FROM build-base AS pruner
ARG APP_NAME
WORKDIR /app
COPY --chown=rr:rr . .
RUN turbo prune $APP_NAME --docker

# Prefetch deps - refreshed only if pnpm workspace is updated
FROM build-base AS prefetch-deps
WORKDIR /.temp
COPY --chown=rr:rr pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=rr:rr patches/ ./patches/
RUN --mount=type=cache,target=/pnpm/.pnpm-store,uid=1001,gid=1001 \
	pnpm fetch

# Dev and Build deps
FROM prefetch-deps AS dev-deps
ARG APP_NAME
WORKDIR /app
COPY --from=pruner --chown=rr:rr /app/out/json/ .
RUN --mount=type=cache,target=/pnpm/.pnpm-store,uid=1001,gid=1001 \
	pnpm --frozen-lockfile --offline install

# Production deps
FROM prefetch-deps AS production-deps
ARG APP_NAME
WORKDIR /app
COPY --from=pruner --chown=rr:rr /app/out/json/ .
RUN --mount=type=cache,target=/pnpm/.pnpm-store,uid=1001,gid=1001 \
	pnpm --filter=$APP_NAME --frozen-lockfile --offline install --prod

# Builder
FROM dev-deps AS builder
ARG APP_NAME
ENV NODE_ENV=production
WORKDIR /app
# Copy source code AFTER dependencies are installed
COPY --from=pruner --chown=rr:rr /app/out/full/ .
COPY --chown=rr:rr turbo.json turbo.json
# COPY --chown=rr:rr .changeset/ ./.changeset/
# Run changeset version before build
# RUN pnpm changeset version
RUN turbo build --filter=$APP_NAME

# Final image
FROM base AS runner
ARG APP_NAME
ENV PORT=3000
ENV TZ=UTC
ENV NODE_ENV=production
ENV START=${APP_NAME}:start

WORKDIR /app

COPY --from=production-deps --chown=rr:rr /app/ .
COPY --from=builder --chown=rr:rr /app/package.json ./package.json
COPY --from=builder --chown=rr:rr /app/apps/$APP_NAME/package.json ./apps/$APP_NAME/package.json
COPY --from=builder --chown=rr:rr /app/apps/$APP_NAME/build ./apps/$APP_NAME/build

WORKDIR /app/apps/$APP_NAME

EXPOSE 3000

USER rr

SHELL ["/bin/ash", "-c"]

CMD node build/server/index.js