import {
  getArticleFixture,
  getThemeFixture,
  listAdminJobs,
  listThemes,
} from "@/mocks/fixtures/content-fixtures";
import type {
  AdminJob,
  ArticleDetail,
  Theme,
  ThemeDetail,
} from "@/types/content";

function withLatency<T>(value: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), 30);
  });
}

export async function getThemes(): Promise<Theme[]> {
  return withLatency(listThemes());
}

export async function getThemeDetail(slug: string): Promise<ThemeDetail> {
  const theme = getThemeFixture(slug);

  if (!theme) {
    throw new Error(`Theme not found: ${slug}`);
  }

  return withLatency(theme);
}

export async function getArticleDetail(id: string): Promise<ArticleDetail> {
  const article = getArticleFixture(id);

  if (!article) {
    throw new Error(`Article not found: ${id}`);
  }

  return withLatency(article);
}

export async function getAdminJobs(): Promise<AdminJob[]> {
  return withLatency(listAdminJobs());
}
