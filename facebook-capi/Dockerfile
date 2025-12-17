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
RUN npm ci --workspaces --include-workspace-root

FROM base AS build
COPY --from=deps /app/node_modules /app/node_modules
COPY . .
RUN npm -w @wolfgang/contracts run build
RUN npm -w @wolfgang/facebook-capi run build

FROM base AS runner
ENV NODE_ENV=production
RUN apk add --no-cache curl
COPY --from=deps /app/node_modules /app/node_modules
COPY --from=build /app/packages/contracts /app/packages/contracts
COPY --from=build /app/facebook-capi/dist /app/facebook-capi/dist
COPY --from=build /app/facebook-capi/package.json /app/facebook-capi/package.json
EXPOSE 4003
CMD ["node", "facebook-capi/dist/main.js"]
