variable "aws_region" {
  type    = string
  default = "us-east-2"
}

variable "prefix" {
  type    = string
  default = "lab09"
  type        = string
  description = "Región de AWS donde se desplegará la infraestructura"
  default     = "us-east-2" 
}

variable "environment" {
  type    = string
  default = "dev"
}