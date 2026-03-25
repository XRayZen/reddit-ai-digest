FROM node:22-bookworm-slim AS builder

WORKDIR /workspace

# 同じ image を環境変数だけ差し替えて再利用できるよう、
# build では standalone 出力を作り、runtime には必要成果物だけを残す。
RUN corepack enable

# workspace root の lockfile を使って、web だけ別解決にならないようにする。
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY packages/proto packages/proto

RUN pnpm install --frozen-lockfile

COPY . .

# 実 API 接続先は build に焼かず、runtime env で差し替える前提で build する。
RUN pnpm --filter @reddit-ai-digest/web build \
	&& cp -r apps/web/public apps/web/.next/standalone/apps/web/public \
	&& mkdir -p apps/web/.next/standalone/apps/web/.next \
	&& cp -r apps/web/.next/static apps/web/.next/standalone/apps/web/.next/static

FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# 公式方針どおり非 root user で runtime を動かす。
USER node

COPY --from=builder --chown=node:node /workspace/apps/web/.next/standalone ./

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
