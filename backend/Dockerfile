FROM node:20-alpine AS build

# Crear directorio de la app
WORKDIR /app

# Instalar dependencias primero (para aprovechar la caché de Docker)
COPY package*.json ./
RUN npm install --production

# Copiar el resto del código
COPY . .

# Exponer el puerto
EXPOSE 3000

# Comando para arrancar
CMD ["npm", "start"]
