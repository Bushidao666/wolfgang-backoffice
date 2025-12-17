FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
COPY backoffice-api/package.json backoffice-api/package.json
COPY backoffice-web/package.json backoffice-web/package.json
COPY evolution-manager/package.json evolution-manager/package.json
COPY autentique-service/package.json autentique-service/package.json
COPY facebook-capi/package.json facebook-capi/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/logger/package.json packages/logger/package.json
RUN npm ci --workspaces --include-workspace-root

FROM base AS build
COPY --from=deps /app/node_modules /app/node_modules
COPY . .
RUN npm -w @wolfgang/contracts run build
RUN npm -w @wolfgang/logger run build
RUN npm -w @wolfgang/evolution-manager run build

FROM base AS runner
ENV NODE_ENV=production
RUN apk add --no-cache curl
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=build /app/packages/contracts /app/packages/contracts
COPY --from=build /app/packages/logger /app/packages/logger
COPY --from=build /app/evolution-manager/dist /app/evolution-manager/dist
COPY --from=build /app/evolution-manager/package.json /app/evolution-manager/package.json
EXPOSE 4001
CMD ["node", "evolution-manager/dist/main.js"]
