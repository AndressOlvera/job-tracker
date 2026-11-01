# Conexión entre GitHub Actions y AWS con OIDC (ADR-023).
#
# En lugar de guardar llaves de AWS en GitHub, en cada ejecución GitHub le da al
# workflow un token firmado que dice de qué repositorio y rama viene. AWS revisa
# ese token y, si coincide, entrega credenciales temporales de este rol.
#
# Vive aquí, y no en infra/, para que siga existiendo aunque la infraestructura
# de la app se destruya: así el workflow puede ver que está apagada y avisar.

# Repositorio que puede desplegar, como lo nombra GitHub en el token OIDC:
# <dueño>@<id>/<repositorio>@<id>. Los ID no cambian aunque se renombre la
# cuenta o el repositorio. Se consultan en:
#   https://api.github.com/repos/AndressOlvera/job-tracker (owner.id e id)
variable "github_repository" {
  description = "Repositorio que puede desplegar, con sus ID (dueño@id/repo@id)"
  type        = string
  default     = "AndressOlvera@295995116/job-tracker@1405888082"
  
}

locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = "us-east-1"
}

# Le dice a AWS que confíe en los tokens que firma GitHub Actions.
resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

# Solo los workflows de ESTE repositorio que corren en main pueden usar el rol.
# Un pull request o cualquier otra rama no puede.
data "aws_iam_policy_document" "github_assume_role" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repository}:ref:refs/heads/main"]
    }
  }
}

resource "aws_iam_role" "github_deploy" {
  name               = "job-tracker-github-deploy"
  description        = "Despliegue de Job Tracker desde GitHub Actions"
  assume_role_policy = data.aws_iam_policy_document.github_assume_role.json
}

# Lo mínimo para desplegar, y solo sobre los recursos de Job Tracker. Los nombres
# se escriben a mano porque esos recursos viven en infra/ y no siempre existen.
data "aws_iam_policy_document" "github_deploy" {
  statement {
    sid       = "LeerDatosDelDespliegue"
    actions   = ["ssm:GetParametersByPath", "ssm:GetParameters"]
    resources = ["arn:aws:ssm:${local.region}:${local.account_id}:parameter/job-tracker/deploy*"]
  }

  statement {
    sid       = "IniciarSesionEnEcr"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"] # Esta acción no se puede limitar a un repositorio.
  }

  statement {
    sid = "SubirImagenDeLaApi"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:CompleteLayerUpload",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
    ]
    resources = ["arn:aws:ecr:${local.region}:${local.account_id}:repository/job-tracker-api"]
  }

  # Run Command: solo el documento para correr comandos...
  statement {
    sid       = "UsarRunShellScript"
    actions   = ["ssm:SendCommand"]
    resources = ["arn:aws:ssm:${local.region}::document/AWS-RunShellScript"]
  }

  # ...y solo en la instancia de la API (la reconoce por su etiqueta Name).
  statement {
    sid       = "MandarComandosALaApi"
    actions   = ["ssm:SendCommand"]
    resources = ["arn:aws:ec2:${local.region}:${local.account_id}:instance/*"]

    condition {
      test     = "StringEquals"
      variable = "ssm:resourceTag/Name"
      values   = ["job-tracker-api"]
    }
  }

  statement {
    sid       = "VerResultadoDeLosComandos"
    actions   = ["ssm:GetCommandInvocation", "ssm:ListCommandInvocations"]
    resources = ["*"] # Estas acciones no se pueden limitar a un recurso.
  }

  statement {
    sid       = "ListarBucketDelFrontend"
    actions   = ["s3:ListBucket"]
    resources = ["arn:aws:s3:::job-tracker-web-*"]
  }

  statement {
    sid       = "SubirArchivosDelFrontend"
    actions   = ["s3:PutObject", "s3:DeleteObject"]
    resources = ["arn:aws:s3:::job-tracker-web-*/*"]
  }

  statement {
    sid       = "LimpiarCacheDeCloudFront"
    actions   = ["cloudfront:CreateInvalidation"]
    resources = ["arn:aws:cloudfront::${local.account_id}:distribution/*"]
  }
}

resource "aws_iam_role_policy" "github_deploy" {
  name   = "job-tracker-github-deploy"
  role   = aws_iam_role.github_deploy.id
  policy = data.aws_iam_policy_document.github_deploy.json
}

output "github_deploy_role_arn" {
  description = "Rol que usa GitHub Actions: va en la variable AWS_DEPLOY_ROLE_ARN del repositorio"
  value       = aws_iam_role.github_deploy.arn
}
