# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

ENV NODE_OPTIONS="--max-old-space-size=512"

COPY package*.json ./
RUN npm ci --prefer-offline --no-audit

COPY . .
RUN npx vite build

# Production stage with Nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
