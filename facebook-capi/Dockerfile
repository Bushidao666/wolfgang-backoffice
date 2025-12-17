FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
COPY packages/ ./packages/
COPY facebook-capi/ ./facebook-capi/
RUN npm ci --workspaces --include-workspace-root
RUN npm -w @wolfgang/contracts run build
RUN npm -w @wolfgang/logger run build
RUN npm -w @wolfgang/facebook-capi run build

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/facebook-capi ./facebook-capi
WORKDIR /app/facebook-capi
CMD ["node", "dist/main.js"]
