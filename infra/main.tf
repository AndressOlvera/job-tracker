# Infraestructura de Job Tracker en AWS.
#
#   CloudFront ─┬─ /*      → S3 (frontend de React)       frontend.tf
#               └─ /api/*  → EC2 (API en Docker)          api.tf
#                              └─ RDS (PostgreSQL)        database.tf
#   VPC, subredes y security groups                       network.tf
#
# Guía para levantarla, desplegar y destruirla: docs/08-aws.md

terraform {
  # 1.11 o más nueva: necesaria para los argumentos "write-only" (database.tf)
  # y el bloqueo nativo del estado en S3.
  required_version = ">= 1.11"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.68"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.9"
    }
  }

  # El estado vive en el bucket que crea infra/bootstrap. Su nombre incluye el
  # número de cuenta, así que se pasa al hacer `terraform init` (ver la guía).
  backend "s3" {
    key          = "job-tracker/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true # Evita que dos `terraform apply` corran al mismo tiempo.
  }
}

provider "aws" {
  region = local.region

  # Etiquetas que se agregan solas a todos los recursos.
  default_tags {
    tags = {
      Project   = "job-tracker"
      ManagedBy = "terraform"
    }
  }
}

locals {
  region  = "us-east-1"
  project = "job-tracker"

  # Tamaños pequeños: alcanzan para un portafolio y los acepta la capa gratuita.
  api_instance_type = "t3.micro"
  db_instance_class = "db.t4g.micro"

  db_name = "jobtracker"
  db_user = "jobtracker"

  app_timezone = "America/Mexico_City"
}
