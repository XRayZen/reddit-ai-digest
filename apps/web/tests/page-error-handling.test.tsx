import { ApiNotFoundError, ApiRequestError } from "@/lib/api/errors";

const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

const getThemeDetail = vi.fn();
const getArticleDetail = vi.fn();

vi.mock("next/navigation", () => ({
  notFound,
}));

vi.mock("@/lib/api/client", () => ({
  getThemeDetail,
  getArticleDetail,
}));

describe("page error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes only missing themes to notFound", async () => {
    // page が 404 だけを notFound へ変換する契約を固定する。
    getThemeDetail.mockRejectedValue(new ApiNotFoundError("missing"));
    const { default: ThemePage } = await import("@/app/themes/[slug]/page");

    await expect(
      ThemePage({ params: Promise.resolve({ slug: "missing" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it("rethrows theme request failures to the app error boundary", async () => {
    // transport / 設定ミスまで notFound 扱いしないことを確認する。
    getThemeDetail.mockRejectedValue(new ApiRequestError("boom", 500));
    const { default: ThemePage } = await import("@/app/themes/[slug]/page");

    await expect(
      ThemePage({ params: Promise.resolve({ slug: "software-engineering" }) }),
    ).rejects.toMatchObject({
      name: "ApiRequestError",
      status: 500,
      message: "boom",
    });
    expect(notFound).not.toHaveBeenCalled();
  });

  it("routes only missing articles to notFound", async () => {
    // 記事詳細もテーマ詳細と同じ例外変換規則に揃える。
    getArticleDetail.mockRejectedValue(new ApiNotFoundError("missing"));
    const { default: ArticlePage } = await import("@/app/articles/[id]/page");

    await expect(
      ArticlePage({ params: Promise.resolve({ id: "missing" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it("rethrows article request failures to the app error boundary", async () => {
    getArticleDetail.mockRejectedValue(new ApiRequestError("boom", 500));
    const { default: ArticlePage } = await import("@/app/articles/[id]/page");

    await expect(
      ArticlePage({ params: Promise.resolve({ id: "se-001" }) }),
    ).rejects.toMatchObject({
      name: "ApiRequestError",
      status: 500,
      message: "boom",
    });
    expect(notFound).not.toHaveBeenCalled();
  });
});
