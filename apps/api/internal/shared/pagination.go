// Package shared はアプリケーション全体で共有されるユーティリティを提供する。
package shared

import (
	"encoding/base64"
	"errors"
	"fmt"
	"strconv"
)

const (
	DefaultPageSize = 20
	MaxPageSize     = 100
)

var ErrInvalidPageToken = errors.New("invalid page token")

// NormalizePageSize はページサイズを妥当な範囲に正規化する。
// 0以下はデフォルト値、MaxPageSize超えは最大値に切り詰める。
func NormalizePageSize(pageSize int) int {
	switch {
	case pageSize <= 0:
		return DefaultPageSize
	case pageSize > MaxPageSize:
		return MaxPageSize
	default:
		return pageSize
	}
}

// DecodeOffsetToken はBase64エンコードされたページトークンをoffsetに復号する。
// 空文字列は最初のページとして0を返す。
func DecodeOffsetToken(token string) (int, error) {
	if token == "" {
		return 0, nil
	}
	raw, err := base64.StdEncoding.DecodeString(token)
	if err != nil {
		return 0, fmt.Errorf("%w: decode page token: %v", ErrInvalidPageToken, err)
	}
	offset, err := strconv.Atoi(string(raw))
	if err != nil {
		return 0, fmt.Errorf("%w: parse page token: %v", ErrInvalidPageToken, err)
	}
	if offset < 0 {
		return 0, fmt.Errorf("%w: page token must be non-negative", ErrInvalidPageToken)
	}
	return offset, nil
}

// EncodeOffsetToken はoffsetをBase64エンコードしたページトークンに変換する。
// 0以下のoffsetは空文字列として、最初のページを示す。
func EncodeOffsetToken(offset int) string {
	if offset <= 0 {
		return ""
	}
	return base64.StdEncoding.EncodeToString([]byte(strconv.Itoa(offset)))
}
