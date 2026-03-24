import {
  getAdminJobs,
  getArticleDetail,
  getThemeDetail,
  getThemes,
} from "@/lib/api/client";
import { ApiNotFoundError } from "@/lib/api/errors";
import { formatDate } from "@/lib/format";

describe("mock api client", () => {
  const originalMode = process.env.CONTENT_API_MODE;

  beforeEach(() => {
    // mock 固定にして、fixture 由来の画面データだけを検証する。
    process.env.CONTENT_API_MODE = "mock";
  });

  afterEach(() => {
    if (originalMode === undefined) {
      delete process.env.CONTENT_API_MODE;
    } else {
      process.env.CONTENT_API_MODE = originalMode;
    }
  });

  it("returns all themes for the home screen", async () => {
    // ホーム画面の最小契約として、テーマ一覧に slug と名前が揃っていることを見る。
    const themes = await getThemes();

    expect(themes.length).toBeGreaterThan(0);
    expect(themes[0]).toMatchObject({
      slug: expect.any(String),
      name: expect.any(String),
    });
  });

  it("returns theme detail with articles", async () => {
    // テーマ詳細が空メタ情報だけでなく、記事一覧導線まで返すことを確認する。
    const detail = await getThemeDetail("software-engineering");

    expect(detail.slug).toBe("software-engineering");
    expect(detail.articles.length).toBeGreaterThan(0);
  });

  it("returns article detail by id", async () => {
    // 一覧カードから詳細へ遷移した先で必要な論点配列まで取得できることを固定する。
    const article = await getArticleDetail("se-001");

    expect(article.id).toBe("se-001");
    expect(article.keyPoints.length).toBeGreaterThan(0);
  });

  it("returns admin jobs", async () => {
    // 管理画面のテーブル表示に必要な最小列が揃うことを見る。
    const jobs = await getAdminJobs();

    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs[0]).toMatchObject({
      id: expect.any(String),
      status: expect.any(String),
    });
  });

  it("returns article detail for every article exposed on theme pages", async () => {
    // 一覧に出した ID が詳細取得で落ちないことを見て、fixture 間の参照切れを防ぐ。
    const themes = await getThemes();
    const details = await Promise.all(
      themes.map((theme) => getThemeDetail(theme.slug)),
    );

    const articleIds = details.flatMap((detail) =>
      detail.articles.map((article) => article.id),
    );

    await expect(
      Promise.all(articleIds.map((id) => getArticleDetail(id))),
    ).resolves.toHaveLength(articleIds.length);
  });

  it("returns not found errors for missing resources", async () => {
    // mock でも詳細 page と同じ 404 分岐を通せるよう、例外型を live と揃える。
    await expect(getThemeDetail("missing")).rejects.toBeInstanceOf(
      ApiNotFoundError,
    );
    await expect(getArticleDetail("missing")).rejects.toBeInstanceOf(
      ApiNotFoundError,
    );
  });

  it("returns cloned payloads so fixture mutations do not leak", async () => {
    const firstThemes = await getThemes();
    firstThemes[0].name = "mutated";

    const secondThemes = await getThemes();
    expect(secondThemes[0].name).toBe("Software Engineering");

    const firstArticle = await getArticleDetail("se-001");
    firstArticle.keyPoints[0] = "mutated";

    const secondArticle = await getArticleDetail("se-001");
    expect(secondArticle.keyPoints[0]).toBe(
      "スプリント速度より、リリース意図の共有が重視されている。",
    );
  });

  it("formats dates in a stable Tokyo timezone", () => {
    // Node 実行環境差で日付表示がずれないことを、整形関数単位で固定する。
    expect(formatDate("2026-03-16T02:00:00Z")).toBe("2026年3月16日");
  });
});
