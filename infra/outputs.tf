# Datos que se usan al desplegar. Se consultan con:
#   terraform -chdir=infra output              (todos)
#   terraform -chdir=infra output -raw app_url (solo uno, sin comillas)

output "app_url" {
  description = "Dirección de la app"
  value       = "https://${aws_cloudfront_distribution.app.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "ID de la distribución de CloudFront (para invalidar la caché)"
  value       = aws_cloudfront_distribution.app.id
}

output "frontend_bucket" {
  description = "Bucket de S3 donde se suben los archivos del frontend"
  value       = aws_s3_bucket.frontend.bucket
}

output "ecr_repository_url" {
  description = "Repositorio de ECR para la imagen de la API"
  value       = aws_ecr_repository.api.repository_url
}

output "api_instance_id" {
  description = "ID de la instancia EC2 de la API"
  value       = aws_instance.api.id
}

output "db_password_parameter" {
  description = "Parámetro de SSM con la contraseña de la base de datos"
  value       = aws_ssm_parameter.db_password.name
}
