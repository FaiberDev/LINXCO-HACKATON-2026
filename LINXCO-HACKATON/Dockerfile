FROM node:22-alpine

WORKDIR /app

# Instalar dependencias necesarias para Node y librerías nativas si aplica
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

# Crear directorios de documentos generados y credenciales de sesión de WhatsApp
RUN mkdir -p documentos_generados auth_info_baileys

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "index.js"]
