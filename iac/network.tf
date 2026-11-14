# ─────────────────────────────────────────────────────────────────────────────
# iac/network.tf
# VPC, Subnets, Routing, VPC Flow Logs, Default SG restringido, Endpoints (S3, SQS)
# ─────────────────────────────────────────────────────────────────────────────

# VPC Principal
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${local.name}-vpc"
  }
}

# Restringir todo el trafico en el Default Security Group de la VPC (Checkov CKV2_AWS_12)
resource "aws_default_security_group" "default" {
  vpc_id = aws_vpc.main.id

  # Sin reglas de ingress ni egress
  tags = {
    Name = "${local.name}-default-sg-restricted"
  }
}

# CloudWatch Log Group para VPC Flow Logs con KMS y 365 dias (Checkov CKV_AWS_66, 158, 338)
resource "aws_cloudwatch_log_group" "flow_logs" {
  name              = "/aws/vpc-flow-logs/${local.name}"
  retention_in_days = 365
  kms_key_id        = aws_kms_key.main.arn

  tags = {
    Name = "${local.name}-flow-logs"
  }
}

# Rol IAM para VPC Flow Logs
data "aws_iam_policy_document" "flow_logs_assume" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["vpc-flow-logs.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "flow_logs" {
  name               = "${local.name}-flow-logs-role"
  assume_role_policy = data.aws_iam_policy_document.flow_logs_assume.json
}

data "aws_iam_policy_document" "flow_logs_policy" {
  statement {
    sid    = "WriteFlowLogs"
    effect = "Allow"
    actions = [
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:DescribeLogGroups",
      "logs:DescribeLogStreams"
    ]
    resources = ["${aws_cloudwatch_log_group.flow_logs.arn}:*"]
  }
}

resource "aws_iam_role_policy" "flow_logs" {
  name   = "${local.name}-flow-logs-policy"
  role   = aws_iam_role.flow_logs.id
  policy = data.aws_iam_policy_document.flow_logs_policy.json
}

# VPC Flow Log activado (Checkov CKV2_AWS_11)
resource "aws_flow_log" "main" {
  iam_role_arn    = aws_iam_role.flow_logs.arn
  log_destination = aws_cloudwatch_log_group.flow_logs.arn
  traffic_type    = "ALL"
  vpc_id          = aws_vpc.main.id

  tags = {
    Name = "${local.name}-flow-log"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${local.name}-igw"
  }
}

# Subredes Publicas (Checkov CKV_AWS_130)
resource "aws_subnet" "public_a" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[0]
  availability_zone       = local.az_a
  map_public_ip_on_launch = false

  tags = {
    Name = "${local.name}-public-subnet-a"
  }
}

resource "aws_subnet" "public_b" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[1]
  availability_zone       = local.az_b
  map_public_ip_on_launch = false

  tags = {
    Name = "${local.name}-public-subnet-b"
  }
}

# Subredes Privadas (para Lambdas y VPC Endpoints)
resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[0]
  availability_zone = local.az_a

  tags = {
    Name = "${local.name}-private-subnet-a"
  }
}

resource "aws_subnet" "private_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[1]
  availability_zone = local.az_b

  tags = {
    Name = "${local.name}-private-subnet-b"
  }
}

# Tablas de Ruteo
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${local.name}-public-rt"
  }
}

resource "aws_route_table_association" "public_a" {
  subnet_id      = aws_subnet.public_a.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "public_b" {
  subnet_id      = aws_subnet.public_b.id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${local.name}-private-rt"
  }
}

resource "aws_route_table_association" "private_a" {
  subnet_id      = aws_subnet.private_a.id
  route_table_id = aws_route_table.private.id
}

resource "aws_route_table_association" "private_b" {
  subnet_id      = aws_subnet.private_b.id
  route_table_id = aws_route_table.private.id
}

# Prefix list de S3 para Egress seguro
data "aws_ec2_managed_prefix_list" "s3" {
  name = "com.amazonaws.${var.aws_region}.s3"
}

# Security Group para Lambdas
resource "aws_security_group" "lambda" {
  name        = "${local.name}-sg-lambda"
  description = "Security Group para las funciones Lambda dentro de la VPC"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "${local.name}-sg-lambda"
  }
}

# Security Group para VPC Endpoints de SQS
resource "aws_security_group" "vpce_sqs" {
  name        = "${local.name}-sg-vpce-sqs"
  description = "Security Group para SQS Interface Endpoint"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "${local.name}-sg-vpce-sqs"
  }
}

# Reglas de Security Group
resource "aws_security_group_rule" "lambda_egress_s3" {
  type              = "egress"
  security_group_id = aws_security_group.lambda.id
  description       = "Egress HTTPS hacia S3 Gateway Endpoint"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  prefix_list_ids   = [data.aws_ec2_managed_prefix_list.s3.id]
}

resource "aws_security_group_rule" "lambda_egress_sqs" {
  type                     = "egress"
  security_group_id        = aws_security_group.lambda.id
  description              = "Egress HTTPS hacia SQS VPC Endpoint"
  from_port                = 443
  to_port                  = 443
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.vpce_sqs.id
}

resource "aws_security_group_rule" "vpce_ingress_lambda" {
  type                     = "ingress"
  security_group_id        = aws_security_group.vpce_sqs.id
  description              = "Ingress HTTPS desde Lambda SG"
  from_port                = 443
  to_port                  = 443
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.lambda.id
}

# VPC Endpoint S3 (Gateway)
resource "aws_vpc_endpoint" "s3" {
  vpc_id            = aws_vpc.main.id
  service_name      = "com.amazonaws.${var.aws_region}.s3"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = [aws_route_table.private.id]

  tags = {
    Name = "${local.name}-vpce-s3"
  }
}

# VPC Endpoint SQS (Interface) asociado a subnets y al security group (Checkov CKV2_AWS_5)
resource "aws_vpc_endpoint" "sqs" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.aws_region}.sqs"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true

  subnet_ids = [
    aws_subnet.private_a.id,
    aws_subnet.private_b.id
  ]

  security_group_ids = [
    aws_security_group.vpce_sqs.id
  ]

  tags = {
    Name = "${local.name}-vpce-sqs"
  }
}
