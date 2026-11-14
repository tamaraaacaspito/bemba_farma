data "aws_caller_identity" "current" {}

data "aws_availability_zones" "available" {
  state = "available"

  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

locals {
  name       = "${var.prefix}-${var.environment}"
  account_id = data.aws_caller_identity.current.account_id
  az_a       = data.aws_availability_zones.available.names[0]
  az_b       = data.aws_availability_zones.available.names[1]
}

