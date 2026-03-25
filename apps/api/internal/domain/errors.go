package domain

import "errors"

// ErrNotFound はリソースが見つからないことを示すエラー。
// Repository層から返され、Usecase/Transport層で適切なHTTPステータスコードへ変換される。
var ErrNotFound = errors.New("resource not found")
