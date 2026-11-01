# Datos que necesita el despliegue automático (.github/workflows/deploy.yml).
#
# Se guardan en SSM Parameter Store porque cambian cada vez que la
# infraestructura se vuelve a crear (el ID de la instancia, el nombre del
# bucket...). El workflow los lee al empezar; si no existen, sabe que la
# infraestructura está apagada y no despliega nada. No son secretos.

locals {
  deploy_parameters = {
    ecr_repository             = aws_ecr_repository.api.repository_url
    instance_id                = aws_instance.api.id
    frontend_bucket            = aws_s3_bucket.frontend.bucket
    cloudfront_distribution_id = aws_cloudfront_distribution.app.id
    app_url                    = "https://${aws_cloudfront_distribution.app.domain_name}"
  }
}

resource "aws_ssm_parameter" "deploy" {
  for_each = local.deploy_parameters

  name  = "/${local.project}/deploy/${each.key}"
  type  = "String"
  value = each.value
}
