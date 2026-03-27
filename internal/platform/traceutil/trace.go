package traceutil

import (
	"context"
	"crypto/rand"
	"encoding/hex"
)

const HeaderTraceID = "X-Trace-Id"

type contextKey string

const traceIDKey contextKey = "trace_id"

func NewID() string {
	buf := make([]byte, 8)
	if _, err := rand.Read(buf); err != nil {
		return "trc_fallback"
	}
	return "trc_" + hex.EncodeToString(buf)
}

func WithTraceID(ctx context.Context, traceID string) context.Context {
	return context.WithValue(ctx, traceIDKey, traceID)
}

func FromContext(ctx context.Context) string {
	traceID, _ := ctx.Value(traceIDKey).(string)
	return traceID
}

func FromHeaderOrNew(value string) string {
	if value != "" {
		return value
	}
	return NewID()
}
