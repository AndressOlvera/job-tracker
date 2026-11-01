#!/bin/bash
# Despliega (o actualiza) la API en la instancia EC2.
#
#   sudo /usr/local/bin/job-tracker-deploy            # imagen con la etiqueta "latest"
#   sudo /usr/local/bin/job-tracker-deploy abc1234    # otra etiqueta
#
# Descarga la imagen de ECR, aplica las migraciones y reemplaza el contenedor de
# la API (ADR-015: primero migrar, después actualizar la API). Si la API nueva no
# responde, termina con error y muestra sus logs.
#
# La instancia lo instala al crearse (user-data.sh.tftpl). Su configuración, sin
# secretos, está en /etc/job-tracker/deploy.conf.
set -euo pipefail

# cloud-init y Run Command a veces no definen HOME, donde Docker y la AWS CLI
# guardan su configuración.
export HOME="${HOME:-/root}"

# shellcheck source=/dev/null
source /etc/job-tracker/deploy.conf

tag="${1:-latest}"
image="$IMAGE_REPOSITORY:$tag"
registry="${IMAGE_REPOSITORY%%/*}"
env_file=/etc/job-tracker/api.env

echo "==> Descargando $image"
aws ecr get-login-password --region "$AWS_REGION" |
  docker login --username AWS --password-stdin "$registry"
docker pull "$image"

echo "==> Preparando las variables de la API"
db_password=$(aws ssm get-parameter --region "$AWS_REGION" --name "$DB_PASSWORD_PARAMETER" \
  --with-decryption --query Parameter.Value --output text)
# Solo root puede leer este archivo, porque incluye la contraseña.
umask 077
cat >"$env_file" <<EOF
APP_ENV=production
DATABASE_URL=postgresql+psycopg://$DB_USER:$db_password@$DB_HOST:5432/$DB_NAME?sslmode=require
APP_TIMEZONE=$APP_TIMEZONE
EOF

echo "==> Aplicando migraciones"
docker run --rm --env-file "$env_file" "$image" flask db upgrade

echo "==> Reemplazando el contenedor de la API"
docker rm --force job-tracker-api >/dev/null 2>&1 || true
# Gunicorn escucha en el 8000 del contenedor; CloudFront llega por el 80 de la instancia.
# --restart: Docker la vuelve a levantar si se cae o si la instancia se reinicia.
docker run --detach --name job-tracker-api --restart unless-stopped \
  --publish 80:8000 --env-file "$env_file" \
  --log-opt max-size=10m --log-opt max-file=3 \
  "$image"

echo "==> Esperando a que la API responda"
if ! curl --fail --silent --show-error --retry 20 --retry-delay 2 --retry-all-errors \
  http://127.0.0.1/api/v1/health; then
  echo "La API no respondió. Últimos logs:" >&2
  docker logs --tail 50 job-tracker-api >&2
  exit 1
fi
echo

# Borra las imágenes viejas que ya no usa ningún contenedor.
docker image prune --force >/dev/null
echo "==> Listo: la API corre con $image"
