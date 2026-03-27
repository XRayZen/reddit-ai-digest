package domain

import "time"

// Theme は技術テーマを表すドメインモデル。
// テーマは Reddit 議論を分類する単位となり、複数の記事(Article)を持つ。
type Theme struct {
	Slug         string
	Name         string
	Description  string
	ArticleCount int
	UpdatedAt    time.Time
}

// ArticleCard は記事一覧で使用する軽量な記事表現。
// 詳細本文(KeyPointsの中身)を省略し、リスト表示に必要な情報のみを持つ。
type ArticleCard struct {
	ID          string
	ThemeSlug   string
	Title       string
	Summary     string
	SourceURL   string
	PublishedAt time.Time
	StanceLabel string
	PointCount  int
}

// ArticleDetail は記事詳細で使用する完全な記事表現。
// 翻訳文、要約、キーポイント全文を含む。
type ArticleDetail struct {
	ID              string
	ThemeSlug       string
	Title           string
	SourceURL       string
	SourceSiteLabel string
	PublishedAt     time.Time
	Translation     string
	Summary         string
	KeyPoints       []string
	StanceLabel     string
}
