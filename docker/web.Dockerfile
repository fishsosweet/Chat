FROM node:22-alpine AS client_builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci
COPY client/. ./

ARG CLIENT_VITE_API_BASE_URL
ARG CLIENT_VITE_SOCKET_URL
ENV VITE_API_BASE_URL=${CLIENT_VITE_API_BASE_URL}
ENV VITE_SOCKET_URL=${CLIENT_VITE_SOCKET_URL}

RUN npm run build

FROM node:22-alpine AS admin_builder
WORKDIR /app/admin

COPY admin/package*.json ./
RUN npm ci
COPY admin/. ./

ARG ADMIN_VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${ADMIN_VITE_API_BASE_URL}

RUN npm run build -- --base=/admin/

FROM nginx:1.29-alpine AS web
WORKDIR /usr/share/nginx/html

COPY --from=client_builder /app/client/dist ./
COPY --from=admin_builder /app/admin/dist ./admin
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf.template
COPY docker/entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
