# ─────────────────────────────────────────────────────────────────────────────
# iac/api.tf
# API Gateway HTTP v2 con Access Logging (KMS y 365 dias), CORS, Throttling,
# Autorizador JWT de Cognito y asociacion WAFv2
# ─────────────────────────────────────────────────────────────────────────────

# Log Group para API Gateway con KMS y 365 dias (Checkov CKV_AWS_66, 158, 338)
resource "aws_cloudwatch_log_group" "api_logs" {
  name              = "/aws/apigateway/${local.name}-http-api"
  retention_in_days = 365
  kms_key_id        = aws_kms_key.main.arn
}

# API Gateway HTTP v2
resource "aws_apigatewayv2_api" "http" {
  name          = "${local.name}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["https://bembafarma.com.pe"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["content-type", "authorization"]
    max_age       = 300
  }
}

# Autorizador JWT de Cognito
resource "aws_apigatewayv2_authorizer" "cognito" {
  api_id           = aws_apigatewayv2_api.http.id
  authorizer_type  = "JWT"
  name             = "cognito-jwt-authorizer"
  identity_sources = ["$request.header.Authorization"]

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.web.id]
    issuer   = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.main.id}"
  }
}

# Integracion con Lambda
resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.http.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.main.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

# Rutas API protegidas con JWT (Checkov CKV_AWS_309)
resource "aws_apigatewayv2_route" "items_get" {
  api_id             = aws_apigatewayv2_api.http.id
  route_key          = "GET /items"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

resource "aws_apigatewayv2_route" "items_post" {
  api_id             = aws_apigatewayv2_api.http.id
  route_key          = "POST /items"
  target             = "integrations/${aws_apigatewayv2_integration.lambda.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.cognito.id
}

# Stage con Access Logging y Throttling habilitado (Checkov CKV_AWS_76, 120)
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http.id
  name        = "$default"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_logs.arn
    format = jsonencode({
      requestId               = "$context.requestId"
      sourceIp                = "$context.identity.sourceIp"
      requestTime             = "$context.requestTime"
      protocol                = "$context.protocol"
      httpMethod              = "$context.httpMethod"
      path                    = "$context.path"
      routeKey                = "$context.routeKey"
      status                  = "$context.status"
      responseLength          = "$context.responseLength"
      integrationErrorMessage = "$context.integrationErrorMessage"
    })
  }

  default_route_settings {
    throttling_burst_limit   = 5000
    throttling_rate_limit    = 10000
    detailed_metrics_enabled = true
  }
}

# Asociacion WAFv2 con API Gateway Stage (Checkov CKV2_AWS_77, CKV_AWS_192)
resource "aws_wafv2_web_acl_association" "api_gateway" {
  resource_arn = aws_apigatewayv2_stage.default.arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}

# Permisos para que API Gateway invoque a Lambda (Checkov CKV_AWS_301, 364)
resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.main.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
}
