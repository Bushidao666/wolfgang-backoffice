FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
COPY packages/ ./packages/
COPY autentique-service/ ./autentique-service/
RUN npm ci --workspaces --include-workspace-root
RUN npm -w @wolfgang/contracts run build
RUN npm -w @wolfgang/logger run build
RUN npm -w @wolfgang/autentique-service run build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/autentique-service ./autentique-service
WORKDIR /app/autentique-service
EXPOSE 4003
CMD ["node", "dist/main.js"]
