# Red: una VPC con dos subredes públicas (para EC2) y dos privadas (para RDS).
#
# No hay NAT Gateway, porque cobra por hora (ADR-007). Las subredes privadas no
# salen a internet, y RDS no lo necesita. EC2 está en una subred pública, pero
# su security group solo deja entrar a CloudFront.

# Zonas de disponibilidad donde existe el tipo de instancia de la API. No todas
# las zonas tienen todos los tipos, y los nombres (us-east-1a...) cambian de
# cuenta a cuenta, así que se buscan en lugar de escribirlos a mano.
data "aws_availability_zones" "available" {
  state = "available"

  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

data "aws_ec2_instance_type_offerings" "api" {
  location_type = "availability-zone"

  filter {
    name   = "instance-type"
    values = [local.api_instance_type]
  }
}

locals {
  azs = slice(sort(setintersection(
    data.aws_availability_zones.available.names,
    data.aws_ec2_instance_type_offerings.api.locations,
  )), 0, 2)
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"

  # Nombres de DNS públicos para EC2: CloudFront llega a la API por su nombre.
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = local.project }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = { Name = local.project }
}

# ---------- Subredes públicas: 10.0.0.0/24 y 10.0.1.0/24 ----------

resource "aws_subnet" "public" {
  count = 2

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone = local.azs[count.index]

  tags = { Name = "${local.project}-publica-${count.index + 1}" }
}

# Lo que no es de la VPC sale a internet por el internet gateway.
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = { Name = "${local.project}-publica" }
}

resource "aws_route_table_association" "public" {
  count = 2

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# ---------- Subredes privadas: 10.0.10.0/24 y 10.0.11.0/24 ----------
# Usan la tabla de rutas principal de la VPC, que solo tiene la ruta interna:
# desde aquí no se llega a internet ni se puede llegar desde internet.

resource "aws_subnet" "private" {
  count = 2

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 10)
  availability_zone = local.azs[count.index]

  tags = { Name = "${local.project}-privada-${count.index + 1}" }
}

# ---------- Security groups ----------

# Lista de IP de CloudFront que mantiene AWS.
data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

resource "aws_security_group" "api" {
  name        = "${local.project}-api"
  description = "API en EC2: solo recibe trafico de CloudFront"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${local.project}-api" }
}

# Entrada: HTTP solo desde CloudFront. No se abre el 22 (SSH): la instancia se
# administra con Session Manager (ADR-006).
resource "aws_vpc_security_group_ingress_rule" "api_from_cloudfront" {
  security_group_id = aws_security_group.api.id
  description       = "HTTP desde CloudFront"
  prefix_list_id    = data.aws_ec2_managed_prefix_list.cloudfront.id
  ip_protocol       = "tcp"
  from_port         = 80
  to_port           = 80
}

# Salida: HTTPS a internet (ECR, SSM y los paquetes de Amazon Linux)...
resource "aws_vpc_security_group_egress_rule" "api_https" {
  security_group_id = aws_security_group.api.id
  description       = "HTTPS hacia AWS y los repositorios de paquetes"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "tcp"
  from_port         = 443
  to_port           = 443
}

# ...y PostgreSQL solo hacia la base de datos.
resource "aws_vpc_security_group_egress_rule" "api_to_db" {
  security_group_id            = aws_security_group.api.id
  description                  = "PostgreSQL hacia RDS"
  referenced_security_group_id = aws_security_group.db.id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
}

resource "aws_security_group" "db" {
  name        = "${local.project}-db"
  description = "RDS: solo recibe conexiones de la API"
  vpc_id      = aws_vpc.main.id

  tags = { Name = "${local.project}-db" }
}

resource "aws_vpc_security_group_ingress_rule" "db_from_api" {
  security_group_id            = aws_security_group.db.id
  description                  = "PostgreSQL desde la API"
  referenced_security_group_id = aws_security_group.api.id
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
}
