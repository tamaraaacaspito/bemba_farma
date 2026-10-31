## Despliegue de infraestructura

La infraestructura se define con Terraform y se despliega con GitHub Actions

### Recursos que se crean (región us-east-2)

- Amazon Cognito: user pool y client para la autenticación
- AWS Lambda: función `lab09-dev-hello`, con su rol de ejecución y su grupo de logs en CloudWatch
- Amazon API Gateway: API HTTP con la ruta `GET /hello`, protegida con un autorizador JWT de Cognito

En total son 12 recursos

### Estructura

```
terraform/
  backend.tf
  backend.hcl.example
  main.tf
  variables.tf
  outputs.tf
  lambda/index.py
.github/workflows/
  deploy y destroy (ver carpeta)
```

### Requisitos previos

1. Bucket S3 para el estado de Terraform, con bloqueo de acceso público, cifrado y versionado
2. Proveedor OIDC de GitHub registrado en IAM
3. Rol `lab09-github-actions-dev` con su política de confianza y su política de permisos
4. Entorno `dev` en GitHub, limitado a la rama `development`
5. Variables del entorno: `AWS_REGION`, `AWS_ROLE_ARN` y `TF_STATE_BUCKET`

### Cómo desplegar

1. Hacer push a la rama `development`
2. Abrir la pestaña **Actions** y revisar que el workflow de deploy pase Init, Validate, Plan y Apply
3. Al terminar, los outputs muestran `api_url`, `user_pool_id` y `client_id`

### Cómo destruir

1. Ir a **Actions**, elegir el workflow de destroy y pulsar **Run workflow** en la rama `development`
2. Verificar que el log termine con `Destroy complete! Resources: 12 destroyed.`

### Prueba local (opcional)

```sh
cp terraform/backend.hcl.example terraform/backend.hcl
# editar bucket y región en backend.hcl
terraform -chdir=terraform init -backend-config=backend.hcl
terraform -chdir=terraform validate
terraform -chdir=terraform plan
```