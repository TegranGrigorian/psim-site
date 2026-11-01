# Builds the static site and serves it with nginx.
# Build context is the psim folder (the parent of psim-site), because the site
# reads ../data (summaries) and ../docs (PLAN.md, SCHEMA.md) at build time:
#   cd psim && docker build -f psim-site/Dockerfile -t psim-site .

FROM node:22-alpine AS build
WORKDIR /psim/psim-site
COPY psim-site/package.json psim-site/package-lock.json ./
RUN npm ci
COPY data /psim/data
COPY docs /psim/docs
COPY psim-site/ ./
RUN npm run build

FROM nginx:1.27-alpine
COPY psim-site/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /psim/psim-site/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
