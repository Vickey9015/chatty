FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY client/package*.json ./client/
COPY server/package*.json ./server/
RUN npm run install:all
COPY client ./client
COPY server ./server
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
COPY package*.json ./
COPY server/package*.json ./server/
RUN npm install --prefix server --omit=dev
COPY --from=builder /app/client/dist ./client/dist
COPY server ./server
RUN mkdir -p server/uploads
EXPOSE 3001
CMD ["node", "server/index.js"]
