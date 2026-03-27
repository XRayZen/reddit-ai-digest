import { Code, ConnectError } from "@connectrpc/connect";

import { ApiNotFoundError, ApiRequestError } from "@/lib/api/errors";
import { fetchJson, liveContentApi } from "@/lib/api/live-content-api";
import * as rpcClients from "@/lib/api/rpc-clients";

describe("live content api", () => {
  const originalMode = process.env.CONTENT_API_MODE;
  const originalBaseUrl = process.env.CONTENT_API_BASE_URL;
  const originalAdminToken = process.env.CONTENT_API_ADMIN_TOKEN;

  beforeEach(() => {
    process.env.CONTENT_API_MODE = "live";
    process.env.CONTENT_API_BASE_URL = "https://example.test";
    process.env.CONTENT_API_ADMIN_TOKEN = "secret-token";
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();

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

    if (originalAdminToken === undefined) {
      delete process.env.CONTENT_API_ADMIN_TOKEN;
    } else {
      process.env.CONTENT_API_ADMIN_TOKEN = originalAdminToken;
    }
  });

  it("uses the configured base url for connect read clients", async () => {
    const listThemes = vi.fn().mockResolvedValue({
      themes: [
        {
          slug: "software-engineering",
          name: "Software Engineering",
          description: "desc",
          articleCount: 3,
        },
      ],
      nextPageToken: "",
    });

    vi.spyOn(rpcClients, "createThemeServiceClient").mockReturnValue({
      listThemes,
      getTheme: vi.fn(),
    } as ReturnType<typeof rpcClients.createThemeServiceClient>);

    await liveContentApi.getThemes();

    expect(rpcClients.createThemeServiceClient).toHaveBeenCalledWith(
      "https://example.test",
    );
    expect(listThemes).toHaveBeenCalledWith({
      pageSize: 50,
      pageToken: "",
    });
  });

  it("maps connect not found responses to ApiNotFoundError", async () => {
    vi.spyOn(rpcClients, "createThemeServiceClient").mockReturnValue({
      listThemes: vi.fn(),
      getTheme: vi
        .fn()
        .mockRejectedValue(new ConnectError("Theme not found", Code.NotFound)),
    } as ReturnType<typeof rpcClients.createThemeServiceClient>);

    await expect(
      liveContentApi.getThemeDetail("missing"),
    ).rejects.toBeInstanceOf(ApiNotFoundError);
  });

  it("maps connect server errors to ApiRequestError", async () => {
    vi.spyOn(rpcClients, "createArticleServiceClient").mockReturnValue({
      listArticles: vi.fn(),
      getArticle: vi
        .fn()
        .mockRejectedValue(new ConnectError("Internal error", Code.Internal)),
    } as ReturnType<typeof rpcClients.createArticleServiceClient>);

    await expect(
      liveContentApi.getArticleDetail("se-001"),
    ).rejects.toMatchObject({
      name: "ApiRequestError",
      status: 500,
      message: "Internal error",
    });
  });

  it("composes theme detail from theme metadata and article list", async () => {
    vi.spyOn(rpcClients, "createThemeServiceClient").mockReturnValue({
      listThemes: vi.fn(),
      getTheme: vi.fn().mockResolvedValue({
        theme: {
          slug: "software-engineering",
          name: "Software Engineering",
          description: "desc",
          articleCount: 1,
        },
      }),
    } as ReturnType<typeof rpcClients.createThemeServiceClient>);
    vi.spyOn(rpcClients, "createArticleServiceClient").mockReturnValue({
      getArticle: vi.fn(),
      listArticles: vi.fn().mockResolvedValue({
        articles: [
          {
            id: "se-001",
            themeSlug: "software-engineering",
            title: "Title",
            summary: "Summary",
            sourceUrl: "https://reddit.com/se-001",
            publishedAt: { seconds: 1n, nanos: 0 },
            stanceLabel: "運用改善",
            pointCount: 4,
          },
        ],
        nextPageToken: "",
      }),
    } as ReturnType<typeof rpcClients.createArticleServiceClient>);

    await expect(
      liveContentApi.getThemeDetail("software-engineering"),
    ).resolves.toMatchObject({
      slug: "software-engineering",
      articleCount: 1,
      articles: [
        {
          id: "se-001",
          pointCount: 4,
        },
      ],
    });
  });

  it("includes the admin token header for admin REST calls", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await liveContentApi.getAdminJobs();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.test/api/admin/jobs",
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: "application/json",
          "X-Admin-Token": "secret-token",
        }),
      }),
    );
  });

  it("requires a base url in live mode", async () => {
    delete process.env.CONTENT_API_BASE_URL;
    vi.spyOn(rpcClients, "createThemeServiceClient");

    await expect(liveContentApi.getThemes()).rejects.toThrow(
      "CONTENT_API_BASE_URL is required when CONTENT_API_MODE=live.",
    );
  });

  it("fails when the admin REST response body is not valid JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not-json", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(fetchJson("/api/admin/jobs")).rejects.toBeInstanceOf(
      ApiRequestError,
    );
  });

  it("sends ingestion requests with the admin token header and JSON body", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "job_123",
          type: "ingest",
          status: "queued",
          targetLabel: "theme:software-engineering",
          requestedAt: "Sun, 23 Mar 2026 00:00:00 GMT",
        }),
        {
          status: 202,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    await liveContentApi.queueIngestion({
      themeSlug: "software-engineering",
      requestedBy: "web-admin",
      idempotencyKey: "idem-123",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.test/api/admin/ingestions/run",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Admin-Token": "secret-token",
        }),
        body: JSON.stringify({
          themeSlug: "software-engineering",
          requestedBy: "web-admin",
          idempotencyKey: "idem-123",
        }),
      }),
    );
  });

  it("maps admin REST failures to ApiRequestError", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "invalid theme" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(
      liveContentApi.queueResummarization({
        articleId: "missing",
        requestedBy: "web-admin",
        idempotencyKey: "idem-456",
      }),
    ).rejects.toMatchObject({
      name: "ApiRequestError",
      status: 400,
      message: "invalid theme",
    });
  });
});
