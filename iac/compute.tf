# ─────────────────────────────────────────────────────────────────────────────
# iac/compute.tf
# Funciones Lambda (API Service y Events Processor) dentro de VPC con DLQ,
# concurrency limits, cifrado de variables con KMS CMK y CloudWatch con KMS
# ─────────────────────────────────────────────────────────────────────────────

# Archivo comprimido para las funciones Lambda
data "archive_file" "lambda" {
  type        = "zip"
  source_file = "${path.module}/../terraform/lambda/index.py"
  output_path = "${path.module}/lambda.zip"
}

# Politica de Asuncion de Rol para Lambda
data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

# 1. Rol IAM para Lambda API Service
resource "aws_iam_role" "lambda_exec" {
  name               = "${local.name}-lambda-exec"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_vpc" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

data "aws_iam_policy_document" "lambda_app_permissions" {
  statement {
    sid       = "AllowS3Operations"
    effect    = "Allow"
    actions   = ["s3:GetObject", "s3:PutObject"]
    resources = ["${aws_s3_bucket.main.arn}/*"]
  }

  statement {
    sid    = "AllowSQSOperations"
    effect = "Allow"
    actions = [
      "sqs:SendMessage",
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
      "sqs:ChangeMessageVisibility"
    ]
    resources = [aws_sqs_queue.main.arn, aws_sqs_queue.dlq.arn]
  }

  statement {
    sid    = "AllowKMSDecrypt"
    effect = "Allow"
    actions = [
      "kms:Decrypt",
      "kms:GenerateDataKey"
    ]
    resources = [aws_kms_key.main.arn]
  }
}

resource "aws_iam_role_policy" "lambda_app_permissions" {
  name   = "${local.name}-lambda-permissions"
  role   = aws_iam_role.lambda_exec.id
  policy = data.aws_iam_policy_document.lambda_app_permissions.json
}

# CloudWatch Log Group con retencion de 365 dias y cifrado KMS (Checkov CKV_AWS_66, 158, 338)
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${local.name}-service"
  retention_in_days = 365
  kms_key_id        = aws_kms_key.main.arn
}

# Funcion Lambda 1: API Service
resource "aws_lambda_function" "main" {
  function_name                  = "${local.name}-service"
  role                           = aws_iam_role.lambda_exec.arn
  handler                        = "index.handler"
  runtime                        = "python3.12"
  filename                       = data.archive_file.lambda.output_path
  source_code_hash               = data.archive_file.lambda.output_base64sha256
  timeout                        = 30
  memory_size                    = 256
  reserved_concurrent_executions = 50                   # Checkov CKV_AWS_115
  kms_key_arn                    = aws_kms_key.main.arn # Checkov CKV_AWS_173

  dead_letter_config {
    target_arn = aws_sqs_queue.dlq.arn # Checkov CKV_AWS_116
  }

  tracing_config {
    mode = "Active" # Checkov CKV_AWS_50
  }

  vpc_config {
    subnet_ids         = [aws_subnet.private_a.id, aws_subnet.private_b.id] # Checkov CKV_AWS_117
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      ENVIRONMENT = var.environment
      S3_BUCKET   = aws_s3_bucket.main.id
      QUEUE_URL   = aws_sqs_queue.main.url
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda,
    aws_iam_role_policy_attachment.lambda_basic,
    aws_iam_role_policy_attachment.lambda_vpc
  ]
}

# 2. Rol IAM para Lambda Events Processor (Procesador asincrono de cola SQS)
resource "aws_iam_role" "processor_exec" {
  name               = "${local.name}-processor-exec"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_iam_role_policy_attachment" "processor_basic" {
  role       = aws_iam_role.processor_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "processor_vpc" {
  role       = aws_iam_role.processor_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy" "processor_permissions" {
  name   = "${local.name}-processor-permissions"
  role   = aws_iam_role.processor_exec.id
  policy = data.aws_iam_policy_document.lambda_app_permissions.json
}

# CloudWatch Log Group para el Procesador con KMS y 365 dias
resource "aws_cloudwatch_log_group" "processor" {
  name              = "/aws/lambda/${local.name}-processor"
  retention_in_days = 365
  kms_key_id        = aws_kms_key.main.arn
}

# Funcion Lambda 2: Events Processor (Consumidor SQS en segundo plano)
resource "aws_lambda_function" "processor" {
  function_name                  = "${local.name}-processor"
  role                           = aws_iam_role.processor_exec.arn
  handler                        = "index.handler"
  runtime                        = "python3.12"
  filename                       = data.archive_file.lambda.output_path
  source_code_hash               = data.archive_file.lambda.output_base64sha256
  timeout                        = 60
  memory_size                    = 512
  reserved_concurrent_executions = 20                   # Checkov CKV_AWS_115
  kms_key_arn                    = aws_kms_key.main.arn # Checkov CKV_AWS_173

  dead_letter_config {
    target_arn = aws_sqs_queue.dlq.arn # Checkov CKV_AWS_116
  }

  tracing_config {
    mode = "Active"
  }

  vpc_config {
    subnet_ids         = [aws_subnet.private_a.id, aws_subnet.private_b.id]
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment {
    variables = {
      ENVIRONMENT = var.environment
      S3_BUCKET   = aws_s3_bucket.main.id
      QUEUE_URL   = aws_sqs_queue.main.url
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.processor,
    aws_iam_role_policy_attachment.processor_basic,
    aws_iam_role_policy_attachment.processor_vpc
  ]
}

# Disparador Event Source Mapping SQS -> Lambda Processor
resource "aws_lambda_event_source_mapping" "sqs_trigger" {
  event_source_arn = aws_sqs_queue.main.arn
  function_name    = aws_lambda_function.processor.arn
  batch_size       = 10
  enabled          = true
}
