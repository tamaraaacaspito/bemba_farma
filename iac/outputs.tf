output "vpc_id" {
  description = "ID de la VPC principal"
  value       = aws_vpc.main.id
}

output "api_url" {
  description = "URL del API Gateway HTTP"
  value       = aws_apigatewayv2_stage.default.invoke_url
}

output "cognito_user_pool_id" {
  description = "ID del User Pool de Cognito"
  value       = aws_cognito_user_pool.main.id
}

output "cognito_client_id" {
  description = "ID del Cliente de Cognito"
  value       = aws_cognito_user_pool_client.web.id
}

output "s3_bucket_name" {
  description = "Nombre del bucket S3 principal"
  value       = aws_s3_bucket.main.id
}

output "sqs_main_queue_url" {
  description = "URL de la cola SQS principal"
  value       = aws_sqs_queue.main.url
}

output "kms_key_arn" {
  description = "ARN de la llave KMS"
  value       = aws_kms_key.main.arn
}

output "dynamodb_table_name" {
  description = "Nombre de la tabla DynamoDB"
  value       = aws_dynamodb_table.inventario.name
}
