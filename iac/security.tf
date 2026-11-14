# ─────────────────────────────────────────────────────────────────────────────
# iac/security.tf
# KMS Master Key (CMK) para cifrado centralizado de S3, SQS, SNS, Logs y Lambda
# WAFv2 Web ACL para proteccion del API Gateway HTTP
# ─────────────────────────────────────────────────────────────────────────────

# Politica de la llave KMS que permite uso a los servicios de la cuenta
data "aws_iam_policy_document" "kms_key_policy" {
  statement {
    sid    = "EnableIAMUserPermissions"
    effect = "Allow"
    actions = [
      "kms:Create*",
      "kms:Describe*",
      "kms:Enable*",
      "kms:List*",
      "kms:Put*",
      "kms:Update*",
      "kms:Revoke*",
      "kms:Disable*",
      "kms:Get*",
      "kms:Delete*",
      "kms:TagResource",
      "kms:UntagResource",
      "kms:ScheduleKeyDeletion",
      "kms:CancelKeyDeletion"
    ]
    resources = ["*"]

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${local.account_id}:root"]
    }

    condition {
      test     = "StringEquals"
      variable = "kms:CallerAccount"
      values   = [local.account_id]
    }
  }

  statement {
    sid    = "AllowCloudWatchLogs"
    effect = "Allow"
    actions = [
      "kms:Encrypt*",
      "kms:Decrypt*",
      "kms:ReEncrypt*",
      "kms:GenerateDataKey*",
      "kms:Describe*"
    ]
    resources = ["*"]

    principals {
      type        = "Service"
      identifiers = ["logs.${var.aws_region}.amazonaws.com"]
    }

    condition {
      test     = "ArnLike"
      variable = "kms:EncryptionContext:aws:logs:arn"
      values   = ["arn:aws:logs:${var.aws_region}:${local.account_id}:*"]
    }
  }

  statement {
    sid    = "AllowS3AndSQS"
    effect = "Allow"
    actions = [
      "kms:Encrypt",
      "kms:Decrypt",
      "kms:ReEncrypt*",
      "kms:GenerateDataKey*",
      "kms:DescribeKey"
    ]
    resources = ["*"]

    principals {
      type        = "Service"
      identifiers = ["s3.amazonaws.com", "sqs.amazonaws.com", "sns.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [local.account_id]
    }

    condition {
      test     = "ArnLike"
      variable = "aws:SourceArn"

      values = [
        "arn:aws:s3:::${local.name}-storage-${local.account_id}",
        "arn:aws:s3:::${local.name}-logs-${local.account_id}",
        "arn:aws:sqs:${var.aws_region}:${local.account_id}:${local.name}-queue",
        "arn:aws:sqs:${var.aws_region}:${local.account_id}:${local.name}-dlq",
        "arn:aws:sns:${var.aws_region}:${local.account_id}:${local.name}-alerts-topic"
      ]
    }
  }
}

# Llave KMS con rotacion de llaves activada (Checkov CKV_AWS_7)
resource "aws_kms_key" "main" {
  description             = "${local.name} KMS Customer Managed Key"
  deletion_window_in_days = 30
  enable_key_rotation     = true
  policy                  = data.aws_iam_policy_document.kms_key_policy.json

  tags = {
    Name = "${local.name}-kms-key"
  }
}

resource "aws_kms_alias" "main" {
  name          = "alias/${local.name}-key"
  target_key_id = aws_kms_key.main.key_id
}

# WAFv2 Web ACL para el API Gateway (Checkov CKV2_AWS_77, CKV_AWS_192)
resource "aws_wafv2_web_acl" "main" {
  name        = "${local.name}-waf"
  description = "Reglas WAF para proteccion de API Gateway"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name}-waf-common-rules"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "AWSManagedRulesKnownBadInputsRuleSet"
    priority = 2

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.name}-waf-known-bad-inputs"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.name}-waf-main"
    sampled_requests_enabled   = true
  }
}

# CloudWatch Log Group para WAF Logging (Checkov CKV_AWS_66, 158, 338)
# Requisito de AWS: el nombre del Log Group debe iniciar estrictamente con 'aws-waf-logs-'
resource "aws_cloudwatch_log_group" "waf" {
  name              = "aws-waf-logs-${local.name}"
  retention_in_days = 365
  kms_key_id        = aws_kms_key.main.arn

  tags = {
    Name = "aws-waf-logs-${local.name}"
  }
}

# Configuracion de Logging para WAFv2 (Checkov CKV_AWS_192)
resource "aws_wafv2_web_acl_logging_configuration" "main" {
  log_destination_configs = [aws_cloudwatch_log_group.waf.arn]
  resource_arn            = aws_wafv2_web_acl.main.arn
}

