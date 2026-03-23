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
    const themes = await getThemes();

    expect(themes.length).toBeGreaterThan(0);
    expect(themes[0]).toMatchObject({
      slug: expect.any(String),
      name: expect.any(String),
    });
  });

  it("returns theme detail with articles", async () => {
    const detail = await getThemeDetail("software-engineering");

    expect(detail.slug).toBe("software-engineering");
    expect(detail.articles.length).toBeGreaterThan(0);
  });

  it("returns article detail by id", async () => {
    const article = await getArticleDetail("se-001");

    expect(article.id).toBe("se-001");
    expect(article.keyPoints.length).toBeGreaterThan(0);
  });

  it("returns admin jobs", async () => {
    const jobs = await getAdminJobs();

    expect(jobs.length).toBeGreaterThan(0);
    expect(jobs[0]).toMatchObject({
      id: expect.any(String),
      status: expect.any(String),
    });
  });

  it("returns article detail for every article exposed on theme pages", async () => {
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
    await expect(getThemeDetail("missing")).rejects.toBeInstanceOf(
      ApiNotFoundError,
    );
    await expect(getArticleDetail("missing")).rejects.toBeInstanceOf(
      ApiNotFoundError,
    );
  });

  it("formats dates in a stable Tokyo timezone", () => {
    expect(formatDate("2026-03-16T02:00:00Z")).toBe("2026年3月16日");
  });
});
