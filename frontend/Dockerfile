# syntax=docker/dockerfile:1

# ---- Stage 1: build the static files ----------------------------------------
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# The address the BROWSER uses to reach the backend. Vite writes it into the
# JavaScript at build time, so changing it means rebuilding the image.
ARG VITE_API_URL=http://localhost:5001
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---- Stage 2: serve them with nginx (as a normal user, on port 8080) ---------
FROM nginxinc/nginx-unprivileged:stable-alpine AS runtime

# nginx fills in ${API_ORIGIN} from the environment when the container starts
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080
