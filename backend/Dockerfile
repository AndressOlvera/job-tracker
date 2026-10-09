# Imagen de la API: Flask servida con Gunicorn.
#
#   docker build -t job-tracker-api ./backend
#
# Lo normal es no construirla a mano: `docker compose up` lo hace por ti.

FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_ROOT_USER_ACTION=ignore \
    APP_ENV=production \
    FLASK_APP=app

WORKDIR /app

# Usuario sin privilegios para correr la API. Si alguien lograra ejecutar código
# a través de ella, no tendría permisos de administrador dentro del contenedor.
# Tiene un número fijo (10001) para poder referirse a él sin depender del nombre.
RUN groupadd --gid 10001 app \
    && useradd --uid 10001 --gid app --no-create-home --home-dir /nonexistent \
        --shell /usr/sbin/nologin app

# Primero solo las dependencias: Docker guarda esta capa en caché y no vuelve
# a instalarlas mientras requirements.txt no cambie.
COPY requirements.txt .
RUN pip install -r requirements.txt

# Después el código. Los archivos quedan a nombre de root y la API solo puede
# leerlos, no modificarlos.
COPY gunicorn.conf.py ./
COPY migrations ./migrations
COPY app ./app

# Desde aquí todo corre como el usuario "app" (10001), no como root.
USER 10001:10001

EXPOSE 8000

# Docker marca el contenedor como "healthy" cuando la API y la base de datos
# responden. Al arrancar revisa cada 2 s; después, cada 30 s.
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --start-interval=2s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health', timeout=2)"]

# Gunicorn lee su configuración de gunicorn.conf.py (puerto, procesos y logs).
CMD ["gunicorn", "app:create_app()"]
