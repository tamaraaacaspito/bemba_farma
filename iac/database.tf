# ─────────────────────────────────────────────────────────────────────────────
# iac/database.tf
# Tabla DynamoDB para Catalogo e Inventario de BembaFarma
# Cifrado KMS CMK, Point-in-Time Recovery (PITR) y Deletion Protection
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_dynamodb_table" "inventario" {
  name             = "${local.name}-inventario"
  billing_mode     = "PAY_PER_REQUEST"
  hash_key         = "id"
  range_key        = "categoria"
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"

  deletion_protection_enabled = true # Checkov CKV_AWS_264

  attribute {
    name = "id"
    type = "S"
  }

  attribute {
    name = "categoria"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true # Checkov CKV_AWS_29
  }

  server_side_encryption {
    enabled     = true                 # Checkov CKV_AWS_28
    kms_key_arn = aws_kms_key.main.arn # Checkov CKV_AWS_119
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Name = "${local.name}-dynamodb-inventario"
  }
}
