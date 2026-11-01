# Lo que se crea UNA sola vez y no se destruye con el resto de infra/:
#   - main.tf:   el bucket de S3 donde Terraform guarda el estado de infra/.
#   - github.tf: la conexión de GitHub Actions con AWS (OIDC) para desplegar.
#
#   cd infra/bootstrap
#   terraform init
#   terraform apply
#
# El estado de esta carpeta se queda en tu computadora (terraform.tfstate, que
# no se sube a Git). Si se pierde, lo creado sigue existiendo en AWS.
# Guías: docs/08-aws.md y docs/09-despliegue.md

terraform {
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.68"
    }
  }
}

provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Project   = "job-tracker"
      ManagedBy = "terraform"
    }
  }
}

data "aws_caller_identity" "current" {}

# El nombre de un bucket es único en todo AWS; el número de cuenta lo vuelve único.
resource "aws_s3_bucket" "state" {
  bucket = "job-tracker-tfstate-${data.aws_caller_identity.current.account_id}"

  # Terraform se niega a borrarlo, aunque alguien corra `terraform destroy` aquí.
  lifecycle {
    prevent_destroy = true
  }
}

# Guarda las versiones anteriores del estado, por si una se daña.
resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id

  versioning_configuration {
    status = "Enabled"
  }
}

# El estado nunca debe ser público. (S3 además cifra todo por defecto.)
resource "aws_s3_bucket_public_access_block" "state" {
  bucket = aws_s3_bucket.state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

output "state_bucket" {
  description = "Bucket del estado de Terraform"
  value       = aws_s3_bucket.state.bucket
}
