import Link from "next/link";

import { Tag } from "@/components/tag";
import { formatDate } from "@/lib/format";
import type { ArticleDetail } from "@/types/content";

export function ArticleDetailView({ article }: { article: ArticleDetail }) {
  return (
    <div className="stack-xl">
      <section className="hero-card">
        <p className="eyebrow">{article.sourceSiteLabel}</p>
        <h1>{article.title}</h1>
        <div className="detail-meta">
          <span>{formatDate(article.publishedAt)}</span>
          <Tag>{article.stanceLabel}</Tag>
          <a href={article.sourceUrl} target="_blank" rel="noreferrer">
            原文スレッド
          </a>
        </div>
      </section>

      <section className="detail-grid">
        <article className="panel">
          <p className="eyebrow">Japanese Translation</p>
          <h2>翻訳</h2>
          <p className="detail-copy">{article.translation}</p>
        </article>
        <article className="panel">
          <p className="eyebrow">Summary</p>
          <h2>要約</h2>
          <p className="detail-copy">{article.summary}</p>
        </article>
      </section>

      <section className="panel">
        <p className="eyebrow">Key Points</p>
        <h2>主要論点</h2>
        <ul className="point-list">
          {article.keyPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      </section>

      <Link className="back-link" href={`/themes/${article.themeSlug}`}>
        テーマ一覧へ戻る
      </Link>
    </div>
  );
}
