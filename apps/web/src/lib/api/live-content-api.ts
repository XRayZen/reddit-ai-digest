import { Code, ConnectError } from "@connectrpc/connect";
import { timestampDate } from "@bufbuild/protobuf/wkt";

import type { AdminJob, Theme, ThemeDetail } from "@/types/content";

import { ApiNotFoundError, ApiRequestError } from "@/lib/api/errors";
import {
  createArticleServiceClient,
  createThemeServiceClient,
} from "@/lib/api/rpc-clients";
import type { ContentApi } from "@/lib/api/types";

type ContentApiMode = "mock" | "live";

type ContentApiErrorPayload = {
  message?: string;
};

function getBaseUrl(): string {
  const baseUrl = process.env.CONTENT_API_BASE_URL;

  if (!baseUrl) {
    // live 指定なのに接続先が未設定な状態は、fetch 前に明示的に失敗させる。
    throw new Error(
      "CONTENT_API_BASE_URL is required when CONTENT_API_MODE=live.",
    );
  }

  return baseUrl.replace(/\/+$/, "");
}

function getAdminToken(): string | undefined {
  return process.env.CONTENT_API_ADMIN_TOKEN ?? process.env.ADMIN_API_TOKEN;
}

function timestampToIsoString(
  timestamp?: Parameters<typeof timestampDate>[0],
): string {
  return timestamp ? timestampDate(timestamp).toISOString() : "";
}

function mapConnectError(error: unknown): Error {
  if (error instanceof ApiNotFoundError || error instanceof ApiRequestError) {
    return error;
  }

  if (error instanceof Error && !(error instanceof ConnectError)) {
    return error;
  }

  const connectError = ConnectError.from(error);

  if (connectError.code === Code.NotFound) {
    return new ApiNotFoundError(connectError.rawMessage);
  }

  return new ApiRequestError(connectError.rawMessage, 500);
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as ContentApiErrorPayload;

    if (typeof payload.message === "string" && payload.message.length > 0) {
      return payload.message;
    }
  } catch {
    // API が JSON 以外を返しても、呼び出し元は一貫したエラー型で扱えるようにする。
  }

  return `Request failed: ${response.status}`;
}

export async function fetchJson<T>(
  path: string,
  init?: { headers?: HeadersInit },
): Promise<T> {
  // 通信処理とエラー変換をここに集約しておき、
  // 将来 proto / Connect に差し替えるときも UI 側を変えないようにする。
  const response = await fetch(`${getBaseUrl()}${path}`, {
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (response.status === 404) {
    throw new ApiNotFoundError(await parseErrorMessage(response));
  }

  if (!response.ok) {
    throw new ApiRequestError(
      await parseErrorMessage(response),
      response.status,
    );
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    throw new ApiRequestError(
      error instanceof Error ? error.message : "Invalid JSON response",
      response.status,
    );
  }
}

async function listAllThemes(): Promise<Theme[]> {
  const client = createThemeServiceClient(getBaseUrl());
  const themes: Theme[] = [];
  let pageToken = "";

  while (true) {
    const response = await client.listThemes({
      pageSize: 50,
      pageToken,
    });

    themes.push(
      ...response.themes.map((theme) => ({
        slug: theme.slug,
        name: theme.name,
        description: theme.description,
        articleCount: theme.articleCount,
      })),
    );

    if (!response.nextPageToken) {
      return themes;
    }

    pageToken = response.nextPageToken;
  }
}

async function listAllArticles(
  themeSlug: string,
): Promise<ThemeDetail["articles"]> {
  const client = createArticleServiceClient(getBaseUrl());
  const articles: ThemeDetail["articles"] = [];
  let pageToken = "";

  while (true) {
    const response = await client.listArticles({
      themeSlug,
      pageSize: 50,
      pageToken,
    });

    articles.push(
      ...response.articles.map((article) => ({
        id: article.id,
        themeSlug: article.themeSlug,
        title: article.title,
        summary: article.summary,
        sourceUrl: article.sourceUrl,
        publishedAt: timestampToIsoString(article.publishedAt),
        stanceLabel: article.stanceLabel,
        pointCount: article.pointCount,
      })),
    );

    if (!response.nextPageToken) {
      return articles;
    }

    pageToken = response.nextPageToken;
  }
}

export const liveContentApi: ContentApi = {
  async getThemes() {
    try {
      return await listAllThemes();
    } catch (error) {
      throw mapConnectError(error);
    }
  },

  async getThemeDetail(slug) {
    try {
      const themeClient = createThemeServiceClient(getBaseUrl());
      const themeResponse = await themeClient.getTheme({ slug });

      if (!themeResponse.theme) {
        throw new ApiNotFoundError(`Theme not found: ${slug}`);
      }

      return {
        slug: themeResponse.theme.slug,
        name: themeResponse.theme.name,
        description: themeResponse.theme.description,
        articleCount: themeResponse.theme.articleCount,
        articles: await listAllArticles(slug),
      };
    } catch (error) {
      throw mapConnectError(error);
    }
  },

  async getArticleDetail(id) {
    try {
      const client = createArticleServiceClient(getBaseUrl());
      const response = await client.getArticle({ id });

      if (!response.article) {
        throw new ApiNotFoundError(`Article not found: ${id}`);
      }

      return {
        id: response.article.id,
        themeSlug: response.article.themeSlug,
        title: response.article.title,
        sourceUrl: response.article.sourceUrl,
        sourceSiteLabel: response.article.sourceSiteLabel,
        publishedAt: timestampToIsoString(response.article.publishedAt),
        translation: response.article.translation,
        summary: response.article.summary,
        keyPoints: response.article.keyPoints,
        stanceLabel: response.article.stanceLabel,
      };
    } catch (error) {
      throw mapConnectError(error);
    }
  },

  getAdminJobs() {
    return fetchJson<AdminJob[]>("/api/admin/jobs", {
      headers: getAdminToken()
        ? {
            "X-Admin-Token": getAdminToken()!,
          }
        : undefined,
    });
  },
};

export function getContentApiMode(): ContentApiMode {
  // 明示的に live が指定されるまでは mock を既定にし、
  // ローカル UI / Storybook / テストの安定性を優先する。
  return process.env.CONTENT_API_MODE === "live" ? "live" : "mock";
}
