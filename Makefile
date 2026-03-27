GO := PATH="$(HOME)/.local/go/bin:$(PATH)" go
# ローカル標準導線を 1 箇所に寄せて、docs と実コマンドをずらさない。
COMPOSE := docker compose -f infra/compose/docker-compose.yml -f infra/compose/docker-compose.override.yml --env-file infra/compose/.env

.PHONY: proto proto-lint proto-breaking test-go migrate seed dev-api dev-worker compose-config up down logs ps

proto:
	corepack pnpm exec buf generate

proto-lint:
	corepack pnpm exec buf lint

proto-breaking:
	corepack pnpm exec buf breaking --against '.git#branch=main'

test-go:
	$(GO) test ./...

migrate:
	$(COMPOSE) run --rm migrate

seed:
	$(COMPOSE) run --rm seed

dev-api:
	$(GO) run ./apps/api/cmd/api

dev-worker:
	$(GO) run ./apps/worker/cmd/worker

compose-config:
	$(COMPOSE) config

up:
	$(COMPOSE) up --build

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f

ps:
	$(COMPOSE) ps
