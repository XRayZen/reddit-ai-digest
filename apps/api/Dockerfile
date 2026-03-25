FROM golang:1.26-bookworm AS builder

WORKDIR /workspace

# 依存解決を先に分離して、ソース変更のたびに module download をやり直さない。
COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Build 用 toolchain は builder に閉じ込め、runtime には成果物だけを持ち込む。
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/api ./apps/api/cmd/api \
	&& CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/migrate ./apps/api/cmd/migrate \
	&& CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/seed ./apps/api/cmd/seed

FROM debian:bookworm-slim AS runner

# API healthcheck だけを通せる最小限の runtime 依存に絞る。
RUN apt-get update \
	&& apt-get install -y --no-install-recommends curl ca-certificates \
	&& rm -rf /var/lib/apt/lists/* \
	&& groupadd -r appuser \
	&& useradd --no-log-init -r -g appuser appuser

WORKDIR /app

COPY --from=builder /out/api /usr/local/bin/api
COPY --from=builder /out/migrate /usr/local/bin/migrate
COPY --from=builder /out/seed /usr/local/bin/seed
COPY --from=builder /workspace/apps/api/migrations /app/apps/api/migrations

USER appuser

EXPOSE 8080

CMD ["/usr/local/bin/api"]
