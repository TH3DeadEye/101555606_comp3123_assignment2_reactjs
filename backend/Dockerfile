# syntax=docker/dockerfile:1

# ---- Stage 1: compile the TypeScript ----------------------------------------
FROM node:24-alpine AS build
WORKDIR /app

# Copy only the package files first, so the (slow) dependency install is
# cached until package.json or package-lock.json changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Stage 2: the image that actually runs ----------------------------------
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Production dependencies only: no TypeScript, no tsx, no type packages.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# The two folders the app writes to. Docker Compose mounts volumes here, so the
# pictures and the logs survive when the container is replaced.
RUN mkdir -p /app/uploads /app/logs && chown node:node /app/uploads /app/logs

# Never run as root: if the app were compromised, the attacker would not own the container.
USER node

EXPOSE 5001
CMD ["node", "dist/index.js"]
