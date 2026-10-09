# Imagen del frontend: compila la app de React y la sirve con Nginx.
#
#   docker build -t job-tracker-web ./frontend
#
# Tiene dos etapas. La primera usa Node para compilar; la segunda solo copia el
# resultado (archivos HTML, CSS y JS) a Nginx. Node y node_modules no llegan a
# la imagen final, que así pesa mucho menos.

# ---------- Etapa 1: compilar ----------
FROM node:24-alpine AS build

WORKDIR /app

# Primero solo las dependencias, para aprovechar la caché de Docker.
# `npm ci` instala exactamente lo que dice package-lock.json.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- Etapa 2: servir ----------
# Variante de Nginx que corre sin usuario root y escucha en el puerto 8080.
FROM nginxinc/nginx-unprivileged:1.30-alpine

# Al arrancar, la imagen convierte las plantillas de /etc/nginx/templates en la
# configuración real, reemplazando estas variables:
#   API_UPSTREAM           dónde está la API (en Docker Compose, el servicio "api").
#   NGINX_LOCAL_RESOLVERS  el DNS del contenedor; la imagen lo calcula sola gracias
#                          a NGINX_ENTRYPOINT_LOCAL_RESOLVERS.
ENV API_UPSTREAM=api:8000 \
    NGINX_ENTRYPOINT_LOCAL_RESOLVERS=1

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

# Docker marca el contenedor como "healthy" cuando Nginx responde.
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --start-interval=2s --retries=3 \
    CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/healthz"]
