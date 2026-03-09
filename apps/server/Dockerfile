FROM node:22-alpine AS base
WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY apps/server/package.json apps/server/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm install

COPY apps/server apps/server
COPY packages/shared packages/shared

RUN npm run build -w @syncweb/shared && npm run build -w @syncweb/server

EXPOSE 4000

CMD ["npm", "run", "dev", "-w", "@syncweb/server"]
