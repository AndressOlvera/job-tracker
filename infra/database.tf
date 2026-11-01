# Base de datos: PostgreSQL en RDS, dentro de las subredes privadas.
#
# La contraseña la genera Terraform y se guarda solo en SSM Parameter Store.
# No está en el código ni en el estado de Terraform (ADR-019):
#   1. `ephemeral` genera la contraseña sin guardarla en el estado.
#   2. SSM la recibe por un argumento "write-only" (value_wo), que tampoco se guarda.
#   3. RDS la lee de SSM y la recibe igual, por un argumento "write-only" (password_wo).

ephemeral "random_password" "db" {
  length = 32
  # Solo letras y números: la contraseña va dentro de DATABASE_URL, donde
  # caracteres como @ : / tienen un significado especial.
  special = false
}

resource "aws_ssm_parameter" "db_password" {
  name        = "/${local.project}/db/password"
  description = "Contrasena de la base de datos de Job Tracker"
  type        = "SecureString" # Cifrada con la llave de AWS para SSM.

  value_wo = ephemeral.random_password.db.result
  # Para cambiar la contraseña, sube este número y corre `terraform apply`.
  value_wo_version = 1
}

ephemeral "aws_ssm_parameter" "db_password" {
  arn             = aws_ssm_parameter.db_password.arn
  with_decryption = true
}

resource "aws_db_subnet_group" "db" {
  name       = local.project
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_db_instance" "db" {
  identifier     = local.project
  engine         = "postgres"
  engine_version = "16" # La misma versión mayor que en Docker (postgres:16-alpine).
  instance_class = local.db_instance_class

  allocated_storage = 20
  storage_type      = "gp3"
  storage_encrypted = true

  db_name             = local.db_name
  username            = local.db_user
  password_wo         = ephemeral.aws_ssm_parameter.db_password.value
  password_wo_version = aws_ssm_parameter.db_password.value_wo_version

  db_subnet_group_name   = aws_db_subnet_group.db.name
  vpc_security_group_ids = [aws_security_group.db.id]
  publicly_accessible    = false
  multi_az               = false

  # Pensado para destruirse cuando no se usa: sin respaldos automáticos ni
  # respaldo final. La versión publicada solo tiene datos de ejemplo (ADR-004).
  backup_retention_period = 0
  skip_final_snapshot     = true
  deletion_protection     = false

  auto_minor_version_upgrade = true
  apply_immediately          = true
}
