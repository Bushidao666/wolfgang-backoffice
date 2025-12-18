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
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/backoffice-web ./backoffice-web
WORKDIR /app/backoffice-web
CMD ["sh", "-c", "node ../node_modules/next/dist/bin/next start -H 0.0.0.0 -p ${PORT:-3000}"]
