import type {
  AdminActionResult,
  AdminArticleOptionsByTheme,
  AdminJob,
  ArticleDetail,
  ContentApiMode,
  QueueIngestionInput,
  QueueResummarizationInput,
  Theme,
  ThemeDetail,
} from "@/types/content";

export type ContentApi = {
  getThemes(): Promise<Theme[]>;
  getThemeDetail(slug: string): Promise<ThemeDetail>;
  getArticleDetail(id: string): Promise<ArticleDetail>;
  getAdminJobs(): Promise<AdminJob[]>;
  queueIngestion(input: QueueIngestionInput): Promise<AdminJob>;
  queueResummarization(input: QueueResummarizationInput): Promise<AdminJob>;
};

export type QueueAdminAction = (
  input: QueueIngestionInput | QueueResummarizationInput,
) => Promise<AdminActionResult>;

export type AdminPageData = {
  jobs: AdminJob[];
  themes: Theme[];
  articleOptionsByTheme: AdminArticleOptionsByTheme;
  mode: ContentApiMode;
};
