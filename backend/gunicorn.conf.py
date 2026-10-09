"""Configuración de Gunicorn, el servidor que corre la API en Docker y en AWS.

Gunicorn la lee sola al arrancar porque el archivo está en la carpeta de trabajo.
En desarrollo se sigue usando `flask run`, que recarga el código al guardar.
"""

import os

# Escucha en todas las interfaces del contenedor para que Nginx pueda llegar.
bind = "0.0.0.0:8000"

# Procesos que atienden peticiones al mismo tiempo. Con 2 basta para una
# instancia pequeña; se puede cambiar sin reconstruir la imagen.
workers = int(os.environ.get("WEB_CONCURRENCY", "2"))

# Si una petición tarda más de 30 s, se reinicia ese proceso.
timeout = 30
# Al detener el contenedor, espera hasta 20 s a que terminen las peticiones en curso.
graceful_timeout = 20

# Los logs van a la salida estándar, que es donde Docker los recoge (`docker compose logs`).
accesslog = "-"
errorlog = "-"

# Archivo de "latido" de cada proceso en memoria y no en disco: dentro de
# Docker, el disco puede hacer que un proceso se congele unos segundos.
worker_tmp_dir = "/dev/shm"

# El socket de control (para administrar Gunicorn en vivo) no se usa aquí.
control_socket_disable = True
