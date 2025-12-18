FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
COPY packages/ ./packages/
COPY evolution-manager/ ./evolution-manager/
RUN npm ci --workspaces --include-workspace-root
RUN npm -w @wolfgang/contracts run build
RUN npm -w @wolfgang/logger run build
RUN npm -w @wolfgang/crypto run build
RUN npm -w @wolfgang/integrations run build
RUN npm -w @wolfgang/evolution-manager run build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/evolution-manager ./evolution-manager
WORKDIR /app/evolution-manager
CMD ["node", "dist/main.js"]
