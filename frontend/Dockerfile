FROM node:24-alpine3.22 AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install

COPY . .
RUN pnpm build

FROM node:24-alpine3.22

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --prod

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next

ENV NODE_ENV=production
# The rest of the environment variables will be provided via docker-compose

EXPOSE 3000

CMD ["pnpm", "start"]
