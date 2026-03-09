FROM node:22-alpine AS base
WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN npm install

COPY apps/web apps/web
COPY packages/shared packages/shared

RUN npm run build -w @syncweb/shared && npm run build -w @syncweb/web

EXPOSE 5173

CMD ["npm", "run", "preview", "-w", "@syncweb/web", "--", "--host", "0.0.0.0"]
