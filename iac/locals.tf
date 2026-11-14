data "aws_caller_identity" "current" {}

data "aws_availability_zones" "available" {
  state = "available"

  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }

  # Fija las zonas por nombre para que el resultado no cambie si AWS agrega
  # nuevas Availability Zones en la region (Checkov CKV_AWS_394).
  filter {
    name   = "zone-name"
    values = ["${var.aws_region}a", "${var.aws_region}b"]
  }
}

locals {
  name       = "${var.prefix}-${var.environment}"
  account_id = data.aws_caller_identity.current.account_id
  az_a       = data.aws_availability_zones.available.names[0]
  az_b       = data.aws_availability_zones.available.names[1]
}

