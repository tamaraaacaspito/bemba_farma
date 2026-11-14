variable "aws_region" {
  description = "Region de AWS para desplegar la infraestructura"
  type        = string
  default     = "us-east-1"
}

variable "prefix" {
  description = "Prefijo para los nombres de los recursos"
  type        = string
  default     = "bembafarma"
}

variable "environment" {
  description = "Ambiente de despliegue (dev, qa, prod)"
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "Rango CIDR para la VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDRs para subredes publicas"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDRs para subredes privadas"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24"]
}

variable "log_retention_days" {
  description = "Dias de retencion para los logs de CloudWatch"
  type        = number
  default     = 14
}

