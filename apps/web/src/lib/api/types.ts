import type {
  AdminJob,
  ArticleDetail,
  Theme,
  ThemeDetail,
} from "@/types/content";

export type ContentApi = {
  getThemes(): Promise<Theme[]>;
  getThemeDetail(slug: string): Promise<ThemeDetail>;
  getArticleDetail(id: string): Promise<ArticleDetail>;
  getAdminJobs(): Promise<AdminJob[]>;
};
