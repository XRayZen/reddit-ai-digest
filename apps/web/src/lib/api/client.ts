import type {
  QueueIngestionInput,
  QueueResummarizationInput,
  AdminJob,
  ArticleDetail,
  Theme,
  ThemeDetail,
} from "@/types/content";
import { resolveContentApi } from "@/lib/api/resolve-content-api";

export async function getThemes(): Promise<Theme[]> {
  // page / feature からは実装差分を見せず、取得入口は常にこの facade を通す。
  return resolveContentApi().getThemes();
}

export async function getThemeDetail(slug: string): Promise<ThemeDetail> {
  // 一覧系と詳細系で入口を揃え、live/mock の切替え条件を呼び出し側へ漏らさない。
  return resolveContentApi().getThemeDetail(slug);
}

export async function getArticleDetail(id: string): Promise<ArticleDetail> {
  return resolveContentApi().getArticleDetail(id);
}

export async function getAdminJobs(): Promise<AdminJob[]> {
  // 管理用途も同じ facade を通し、REST/gRPC の実装差し替え先をこの層に閉じ込める。
  return resolveContentApi().getAdminJobs();
}

export async function queueIngestion(
  input: QueueIngestionInput,
): Promise<AdminJob> {
  return resolveContentApi().queueIngestion(input);
}

export async function queueResummarization(
  input: QueueResummarizationInput,
): Promise<AdminJob> {
  return resolveContentApi().queueResummarization(input);
}
