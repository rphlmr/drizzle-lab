FROM node:22.18-alpine AS base
WORKDIR /work

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@10.14.0 --activate

# -------------------------
# Build packages standalone
# -------------------------

FROM base AS build-api
WORKDIR /build/api
ENV NODE_ENV=development
COPY packages/api ./
RUN pnpm install && pnpm run build

FROM base AS build-visualizer
WORKDIR /build/visualizer
ENV NODE_ENV=development
COPY packages/visualizer ./
RUN pnpm install && pnpm run build

# -------------------------
# Build the app consuming built packages
# -------------------------
FROM base AS build-app
WORKDIR /build/app
ENV NODE_ENV=development

# Set these ARGs to the exact "name" fields from each package's package.json
ARG API_PKG_NAME=api
ARG VIS_PKG_NAME=visualizer

COPY apps/drizzle-run ./

# inject built packages into node_modules so app installs see them as local packages
RUN mkdir -p node_modules/$API_PKG_NAME node_modules/$VIS_PKG_NAME
COPY --from=build-api /build/api ./node_modules/$API_PKG_NAME
COPY --from=build-visualizer /build/visualizer ./node_modules/$VIS_PKG_NAME

# install app deps (no workspace lock checks) and build
RUN pnpm install && pnpm run build

# -------------------------
# Production image
# -------------------------
FROM node:22.18-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build-app /build/app/package.json ./
COPY --from=build-app /build/app/node_modules ./node_modules
COPY --from=build-app /build/app/build ./build

CMD ["node", "./build/server/index.js"]