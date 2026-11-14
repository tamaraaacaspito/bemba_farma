# ─────────────────────────────────────────────────────────────────────────────
# iac/observability.tf
# SNS Topic (cifrado con KMS CMK) y Alarmas CloudWatch
# ─────────────────────────────────────────────────────────────────────────────

# SNS Topic para Alertas de la Infraestructura cifrado con KMS CMK (Checkov CKV_AWS_26)
resource "aws_sns_topic" "alerts" {
  name              = "${local.name}-alerts-topic"
  kms_master_key_id = aws_kms_key.main.arn
}

# Alarma de CloudWatch: Mensajes en Dead Letter Queue (DLQ)
resource "aws_cloudwatch_metric_alarm" "dlq_messages" {
  alarm_name          = "${local.name}-dlq-messages-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Alerta si hay mensajes no procesados en la cola DLQ"
  actions_enabled     = true # Checkov CKV_AWS_319
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    QueueName = aws_sqs_queue.dlq.name
  }
}

# Alarma de CloudWatch: Errores en la Lambda Service
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${local.name}-lambda-errors-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Alerta si la funcion Lambda registra errores"
  actions_enabled     = true # Checkov CKV_AWS_319
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    FunctionName = aws_lambda_function.main.function_name
  }
}

# Alarma de CloudWatch: Errores en la Lambda Processor
resource "aws_cloudwatch_metric_alarm" "processor_errors" {
  alarm_name          = "${local.name}-processor-errors-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Alerta si el procesador Lambda registra errores"
  actions_enabled     = true # Checkov CKV_AWS_319
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    FunctionName = aws_lambda_function.processor.function_name
  }
}

# Alarma de CloudWatch: Errores 5XX en API Gateway
resource "aws_cloudwatch_metric_alarm" "api_5xx_errors" {
  alarm_name          = "${local.name}-api-5xx-errors-alarm"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "5xx"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Alerta si el API Gateway genera errores 5xx sostenidos"
  actions_enabled     = true # Checkov CKV_AWS_319
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    ApiId = aws_apigatewayv2_api.http.id
    Stage = aws_apigatewayv2_stage.default.name
  }
}
