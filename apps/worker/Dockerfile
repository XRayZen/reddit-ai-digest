FROM golang:1.26-bookworm AS builder

WORKDIR /workspace

# 依存解決を先に分離して、ソース変更のたびに module download をやり直さない。
COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Worker の runtime には Go toolchain を持ち込まない。
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/worker ./apps/worker/cmd/worker

FROM debian:bookworm-slim AS runner

# Worker は HTTP endpoint を持たないので、healthcheck 用の procps だけ残す。
RUN apt-get update \
	&& apt-get install -y --no-install-recommends procps ca-certificates \
	&& rm -rf /var/lib/apt/lists/* \
	&& groupadd -r appuser \
	&& useradd --no-log-init -r -g appuser appuser

WORKDIR /app

COPY --from=builder /out/worker /usr/local/bin/worker

USER appuser

CMD ["/usr/local/bin/worker"]
