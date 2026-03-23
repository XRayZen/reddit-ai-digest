import type {
  AdminJob,
  ArticleDetail,
  Theme,
  ThemeDetail,
} from "@/types/content";
import { resolveContentApi } from "@/lib/api/resolve-content-api";

export async function getThemes(): Promise<Theme[]> {
  return resolveContentApi().getThemes();
}

export async function getThemeDetail(slug: string): Promise<ThemeDetail> {
  return resolveContentApi().getThemeDetail(slug);
}

export async function getArticleDetail(id: string): Promise<ArticleDetail> {
  return resolveContentApi().getArticleDetail(id);
}

export async function getAdminJobs(): Promise<AdminJob[]> {
  return resolveContentApi().getAdminJobs();
}
