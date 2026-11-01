# Frontend: los archivos de React viven en un bucket privado de S3 y CloudFront
# los entrega por HTTPS. CloudFront también reenvía /api/* a la API en EC2, así
# que el navegador habla con un solo dominio y no hace falta CORS (ADR-005).

# ---------- Bucket de S3 ----------

resource "aws_s3_bucket" "frontend" {
  bucket_prefix = "${local.project}-web-" # AWS completa el nombre para que sea único.
  force_destroy = true                    # `terraform destroy` lo borra aunque tenga archivos.
}

# Nadie entra directo al bucket: solo CloudFront (ver la política de abajo).
resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudFront firma cada petición al bucket (Origin Access Control).
resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${local.project}-frontend"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# El bucket solo deja leer archivos a ESTA distribución de CloudFront.
data "aws_iam_policy_document" "frontend_bucket" {
  statement {
    sid       = "SoloCloudFront"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.frontend.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.app.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  policy = data.aws_iam_policy_document.frontend_bucket.json

  depends_on = [aws_s3_bucket_public_access_block.frontend]
}

# ---------- Lo que antes hacía Nginx ----------

# Rutas de la app → index.html (scripts/spa-routes.js).
resource "aws_cloudfront_function" "spa_routes" {
  name    = "${local.project}-spa-routes"
  comment = "Rutas de React a index.html"
  runtime = "cloudfront-js-2.0"
  code    = file("${path.module}/scripts/spa-routes.js")
  publish = true
}

# Las mismas cabeceras de seguridad que en frontend/nginx/default.conf.template,
# más HSTS: en AWS el sitio siempre va por HTTPS.
resource "aws_cloudfront_response_headers_policy" "security" {
  name = "${local.project}-security-headers"

  security_headers_config {
    content_security_policy {
      content_security_policy = "default-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
      override                = true
    }

    content_type_options {
      override = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }

    strict_transport_security {
      access_control_max_age_sec = 31536000 # 1 año
      override                   = true
    }
  }
}

# Políticas administradas por AWS.
data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

# Reenvía a la API todo lo que manda el navegador (parámetros, cabeceras y
# cuerpo), menos la cabecera Host.
data "aws_cloudfront_origin_request_policy" "all_viewer_except_host" {
  name = "Managed-AllViewerExceptHostHeader"
}

# ---------- Distribución de CloudFront ----------

resource "aws_cloudfront_distribution" "app" {
  enabled             = true
  comment             = "Job Tracker"
  default_root_object = "index.html"
  http_version        = "http2and3"
  is_ipv6_enabled     = true
  price_class         = "PriceClass_100" # Norteamérica (incluye México) y Europa: la más barata.

  origin {
    origin_id                = "frontend"
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  # La API en EC2. Este tramo va por HTTP, pero EC2 solo acepta tráfico de
  # CloudFront (network.tf). El navegador siempre usa HTTPS.
  origin {
    origin_id   = "api"
    domain_name = aws_instance.api.public_dns

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # Todo lo que no es /api/*: el frontend desde S3, con caché.
  default_cache_behavior {
    target_origin_id           = "frontend"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = data.aws_cloudfront_cache_policy.caching_optimized.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.spa_routes.arn
    }
  }

  # /api/*: directo a EC2 y SIN caché, para que cada petición vea los datos al día.
  ordered_cache_behavior {
    path_pattern               = "/api/*"
    target_origin_id           = "api"
    viewer_protocol_policy     = "https-only"
    allowed_methods            = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods             = ["GET", "HEAD"]
    cache_policy_id            = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id   = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # Certificado de CloudFront para *.cloudfront.net: HTTPS sin comprar dominio.
  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
