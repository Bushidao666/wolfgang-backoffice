FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
COPY packages/ ./packages/
COPY backoffice-web/ ./backoffice-web/
RUN npm ci --workspaces --include-workspace-root
RUN npm -w @wolfgang/backoffice-web run build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=builder /app/backoffice-web/.next/standalone ./
COPY --from=builder /app/backoffice-web/.next/static ./backoffice-web/.next/static
COPY --from=builder /app/backoffice-web/public ./backoffice-web/public
WORKDIR /app/backoffice-web
CMD ["node", "server.js"]
