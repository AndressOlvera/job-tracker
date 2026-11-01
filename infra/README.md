# Infraestructura · Terraform en AWS

Todo lo que la app necesita en AWS: red, base de datos, servidor de la API y CloudFront. La guía completa, con la preparación de una sola vez y el primer despliegue, está en [docs/08-aws.md](../docs/08-aws.md).

| Carpeta o archivo | Qué es |
|---|---|
| `bootstrap/` | El bucket de S3 para el estado de Terraform. Se crea una sola vez |
| `*.tf` | La infraestructura: red, RDS, EC2, ECR, S3 y CloudFront |
| `scripts/` | Lo que corre fuera de Terraform: el arranque de la instancia, el despliegue de la API y la función de rutas de CloudFront |

## Comandos del día a día

Desde la raíz del proyecto, con la sesión de AWS iniciada (`aws login --remote --profile job-tracker-login`):

```bash
terraform -chdir=infra plan      # qué cambiaría, sin tocar nada
terraform -chdir=infra apply     # crea o actualiza la infraestructura
terraform -chdir=infra output    # URL de la app y datos para desplegar
terraform -chdir=infra destroy   # borra todo (menos el bucket del estado)
```

Antes de subir cambios a estos archivos:

```bash
terraform -chdir=infra fmt -recursive   # da formato
terraform -chdir=infra validate         # revisa que la configuración sea válida
```
