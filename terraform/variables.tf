variable "aws_region" {
  type        = string
  description = "Región de AWS donde se desplegará la infraestructura"
  default     = "us-east-2" 
}

variable "environment" {
  type        = string
  description = "Nombre del entorno de despliegue"
  default     = "dev"
}