FROM node:20-alpine
WORKDIR /app

# Instalar dependencias primero (mejor cache)
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

# Copiar solo el código necesario del backend
COPY api ./api

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Iniciar el servidor
CMD ["npm", "start"]
