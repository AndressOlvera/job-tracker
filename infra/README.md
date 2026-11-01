# Infraestructura · Terraform en AWS

Todo lo que la app necesita en AWS: red, base de datos, servidor de la API y CloudFront. La guía completa, con la preparación de una sola vez, está en [docs/08-aws.md](../docs/08-aws.md), y el despliegue automático en [docs/09-despliegue.md](../docs/09-despliegue.md).

| Carpeta o archivo | Qué es |
|---|---|
| `bootstrap/` | Lo que se crea una sola vez y no se destruye: el bucket del estado de Terraform y la conexión de GitHub Actions con AWS (OIDC) |
| `*.tf` | La infraestructura de la app: red, RDS, EC2, ECR, S3, CloudFront y los datos para el despliegue |
| `scripts/` | Lo que corre fuera de Terraform: el arranque de la instancia, el despliegue de la API y la función de rutas de CloudFront |

## Comandos del día a día

Desde la raíz del proyecto, con la sesión de AWS iniciada (`aws login --remote --profile job-tracker-login`):

```bash
terraform -chdir=infra plan      # qué cambiaría, sin tocar nada
terraform -chdir=infra apply     # crea o actualiza la infraestructura
terraform -chdir=infra output    # URL de la app y otros datos
terraform -chdir=infra destroy   # borra todo (menos lo de bootstrap/)
```

Después de un `apply`, publica la app desde GitHub: **Actions → Deploy → Run workflow**.

Antes de subir cambios a estos archivos:

```bash
terraform -chdir=infra fmt -recursive   # da formato
terraform -chdir=infra validate         # revisa que la configuración sea válida
```
