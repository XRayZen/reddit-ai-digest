import { ApiNotFoundError, ApiRequestError } from "@/lib/api/errors";
import { fetchJson, liveContentApi } from "@/lib/api/live-content-api";
import type { Theme } from "@/types/content";

describe("live content api", () => {
  const originalMode = process.env.CONTENT_API_MODE;
  const originalBaseUrl = process.env.CONTENT_API_BASE_URL;

  beforeEach(() => {
    // 各テストが同じ live 前提から始まるよう、env を毎回固定する。
    process.env.CONTENT_API_MODE = "live";
    process.env.CONTENT_API_BASE_URL = "https://example.test";
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();

    // 他テストへ env を漏らさないこと自体が、モード切替えテストの前提になる。
    if (originalMode === undefined) {
      delete process.env.CONTENT_API_MODE;
    } else {
      process.env.CONTENT_API_MODE = originalMode;
    }

    if (originalBaseUrl === undefined) {
      delete process.env.CONTENT_API_BASE_URL;
    } else {
      process.env.CONTENT_API_BASE_URL = originalBaseUrl;
    }
  });

  it("uses the configured base url for live requests", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([{ slug: "software-engineering" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await liveContentApi.getThemes();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.test/api/themes",
      expect.objectContaining({
        headers: { Accept: "application/json" },
        cache: "no-store",
      }),
    );
  });

  it("maps 404 responses to ApiNotFoundError", async () => {
    // HTTP transport の 404 を domain 寄りの例外へ揃え、UI 層の分岐を単純化する。
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Theme not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      liveContentApi.getThemeDetail("missing"),
    ).rejects.toBeInstanceOf(ApiNotFoundError);
  });

  it("maps server errors to ApiRequestError", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "Internal error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(fetchJson("/api/themes")).rejects.toMatchObject({
      name: "ApiRequestError",
      status: 500,
      message: "Internal error",
    });
  });

  it("fails when the response body is not valid JSON", async () => {
    // 200 でも payload が壊れていれば request error 扱いにする契約を守る。
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not-json", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(fetchJson<Theme[]>("/api/themes")).rejects.toBeInstanceOf(
      ApiRequestError,
    );
  });

  it("requires a base url in live mode", async () => {
    delete process.env.CONTENT_API_BASE_URL;
    vi.spyOn(globalThis, "fetch");

    await expect(fetchJson("/api/themes")).rejects.toThrow(
      "CONTENT_API_BASE_URL is required when CONTENT_API_MODE=live.",
    );
  });
});
