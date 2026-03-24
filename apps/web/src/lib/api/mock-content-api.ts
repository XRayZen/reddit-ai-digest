import {
  getArticleFixture,
  getThemeFixture,
  listAdminJobs,
  listThemes,
} from "@/mocks/fixtures/content-fixtures";

import { ApiNotFoundError } from "@/lib/api/errors";
import type { ContentApi } from "@/lib/api/types";

function cloneMockValue<T>(value: T): T {
  // fixture の参照をそのまま返すと、UI やテストでの mutation が次の取得へ漏れる。
  return JSON.parse(JSON.stringify(value)) as T;
}

function withLatency<T>(value: T): Promise<T> {
  return new Promise((resolve) => {
    // Promise 化だけで終わらせず少し待たせ、loading UI の確認をローカルでも再現しやすくする。
    setTimeout(() => resolve(cloneMockValue(value)), 30);
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
      // mock でも live と同じ not-found 契約を返し、page の分岐を共通化する。
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
