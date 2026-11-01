# API: la imagen de Docker vive en ECR y corre en una instancia EC2.

# ---------- Registro de imágenes (ECR) ----------

resource "aws_ecr_repository" "api" {
  name                 = "${local.project}-api"
  image_tag_mutability = "MUTABLE" # Permite volver a subir la etiqueta "latest".
  force_delete         = true      # `terraform destroy` lo borra aunque tenga imágenes.

  # Busca vulnerabilidades conocidas en cada imagen que se sube.
  image_scanning_configuration {
    scan_on_push = true
  }
}

# Solo se conservan las 10 imágenes más recientes.
resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Conservar las 10 imagenes mas recientes"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}

# ---------- Permisos de la instancia (rol de IAM) ----------
# La instancia obtiene credenciales temporales de este rol: no hay llaves de
# acceso guardadas en ella.

data "aws_iam_policy_document" "ec2_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "api" {
  name               = "${local.project}-api"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume_role.json
}

# Session Manager y Run Command: entrar a la instancia y desplegar sin SSH.
resource "aws_iam_role_policy_attachment" "api_ssm" {
  role       = aws_iam_role.api.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Lo mínimo que necesita el script de despliegue: descargar la imagen de este
# repositorio y leer la contraseña de la base de datos.
data "aws_iam_policy_document" "api" {
  statement {
    sid       = "IniciarSesionEnEcr"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"] # Esta acción no se puede limitar a un repositorio.
  }

  statement {
    sid = "DescargarImagenDeLaApi"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:GetDownloadUrlForLayer",
    ]
    resources = [aws_ecr_repository.api.arn]
  }

  statement {
    sid       = "LeerContrasenaDeLaBase"
    actions   = ["ssm:GetParameter"]
    resources = [aws_ssm_parameter.db_password.arn]
  }
}

resource "aws_iam_role_policy" "api" {
  name   = "${local.project}-api"
  role   = aws_iam_role.api.id
  policy = data.aws_iam_policy_document.api.json
}

resource "aws_iam_instance_profile" "api" {
  name = "${local.project}-api"
  role = aws_iam_role.api.name
}

# ---------- Instancia EC2 ----------

# Última imagen de Amazon Linux 2023, publicada por AWS en SSM.
data "aws_ssm_parameter" "al2023" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

resource "aws_instance" "api" {
  ami                         = data.aws_ssm_parameter.al2023.insecure_value
  instance_type               = local.api_instance_type
  subnet_id                   = aws_subnet.public[0].id
  vpc_security_group_ids      = [aws_security_group.api.id]
  associate_public_ip_address = true
  iam_instance_profile        = aws_iam_instance_profile.api.name

  # Al crearse, la instancia instala Docker y el script de despliegue
  # (job-tracker-deploy). Si este archivo cambia, se crea una instancia nueva.
  user_data = templatefile("${path.module}/scripts/user-data.sh.tftpl", {
    deploy_script = file("${path.module}/scripts/job-tracker-deploy.sh")
    deploy_config = {
      AWS_REGION            = local.region
      IMAGE_REPOSITORY      = aws_ecr_repository.api.repository_url
      DB_HOST               = aws_db_instance.db.address
      DB_NAME               = local.db_name
      DB_USER               = local.db_user
      DB_PASSWORD_PARAMETER = aws_ssm_parameter.db_password.name
      APP_TIMEZONE          = local.app_timezone
    }
  })
  user_data_replace_on_change = true

  metadata_options {
    http_tokens = "required" # Solo IMDSv2, la versión más segura.
    # Los contenedores no alcanzan las credenciales del rol: solo el sistema de
    # la instancia (el script de despliegue) puede usarlas.
    http_put_response_hop_limit = 1
  }

  root_block_device {
    volume_type = "gp3"
    encrypted   = true
  }

  tags = { Name = "${local.project}-api" }

  lifecycle {
    # No reemplazar la instancia cada vez que AWS publique una imagen nueva de
    # Amazon Linux. Al volver a crearla (después de un destroy) toma la más reciente.
    ignore_changes = [ami]
  }
}
