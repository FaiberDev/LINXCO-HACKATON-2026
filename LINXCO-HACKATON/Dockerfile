FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY . .

# Crear directorios de documentos generados y credenciales de sesión de WhatsApp
RUN mkdir -p documentos_generados auth_info_baileys

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "index.js"]
