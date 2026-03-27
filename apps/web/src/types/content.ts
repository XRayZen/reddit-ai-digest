export type Theme = {
  slug: string;
  name: string;
  description: string;
  articleCount: number;
};

export type ArticleCardItem = {
  id: string;
  themeSlug: string;
  title: string;
  summary: string;
  sourceUrl: string;
  publishedAt: string;
  stanceLabel: string;
  pointCount: number;
};

export type ThemeDetail = Theme & {
  articles: ArticleCardItem[];
};

export type ArticleDetail = {
  id: string;
  themeSlug: string;
  title: string;
  sourceUrl: string;
  sourceSiteLabel: string;
  publishedAt: string;
  translation: string;
  summary: string;
  keyPoints: string[];
  stanceLabel: string;
};

export type AdminJob = {
  id: string;
  type: "ingest" | "resummarize";
  status: "queued" | "running" | "completed" | "failed";
  targetLabel: string;
  requestedAt: string;
};

export type ContentApiMode = "mock" | "live";

export type AdminArticleOption = {
  id: string;
  title: string;
  themeSlug: string;
};

export type AdminArticleOptionsByTheme = Record<string, AdminArticleOption[]>;

export type QueueIngestionInput = {
  themeSlug: string;
  requestedBy?: string;
  idempotencyKey?: string;
};

export type QueueResummarizationInput = {
  articleId: string;
  requestedBy?: string;
  idempotencyKey?: string;
};

export type AdminActionResult = {
  ok: boolean;
  message: string;
};
