FROM --platform=${BUILDPLATFORM} node:18 AS build

WORKDIR /opt/node_app
COPY . .

# do not ignore optional dependencies:
# Error: Cannot find module @rollup/rollup-linux-x64-gnu
RUN --mount=type=cache,target=/root/.cache/yarn \
    npm_config_target_arch=${TARGETARCH} yarn --network-timeout 600000

ARG NODE_ENV=production
RUN npm_config_target_arch=${TARGETARCH} yarn build:app:docker

FROM --platform=${TARGETPLATFORM} nginx:1.27-alpine

# Cloud Run/Firebase App Hosting expects app to listen on PORT (usually 8080)
ENV PORT=8080

COPY --from=build /opt/node_app/excalidraw-app/build /usr/share/nginx/html

# Use a template so nginx listens on $PORT (instead of hardcoded 80)
RUN printf '%s\n' \
'server {' \
'  listen ${PORT};' \
'  server_name _;' \
'  root /usr/share/nginx/html;' \
'  index index.html;' \
'' \
'  location / {' \
'    try_files $uri /index.html;' \
'  }' \
'}' > /etc/nginx/templates/default.conf.template

EXPOSE 8080

HEALTHCHECK CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}" || exit 1