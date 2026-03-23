import {
  getArticleFixture,
  getThemeFixture,
  listAdminJobs,
  listThemes,
} from "@/mocks/fixtures/content-fixtures";

import { ApiNotFoundError } from "@/lib/api/errors";
import type { ContentApi } from "@/lib/api/types";

function withLatency<T>(value: T): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), 30);
  });
}

export const mockContentApi: ContentApi = {
  async getThemes() {
    // ごく小さい遅延を残し、loading 表示や呼び出し側の振る舞いを
    // 実 API 時の非同期動作に近づける。
    return withLatency(listThemes());
  },

  async getThemeDetail(slug) {
    const theme = getThemeFixture(slug);

    if (!theme) {
      throw new ApiNotFoundError(`Theme not found: ${slug}`);
    }

    return withLatency(theme);
  },

  async getArticleDetail(id) {
    const article = getArticleFixture(id);

    if (!article) {
      throw new ApiNotFoundError(`Article not found: ${id}`);
    }

    return withLatency(article);
  },

  async getAdminJobs() {
    return withLatency(listAdminJobs());
  },
};
