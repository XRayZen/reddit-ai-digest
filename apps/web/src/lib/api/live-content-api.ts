import type {
  AdminJob,
  ArticleDetail,
  Theme,
  ThemeDetail,
} from "@/types/content";

import { ApiNotFoundError, ApiRequestError } from "@/lib/api/errors";
import type { ContentApi } from "@/lib/api/types";

type ContentApiMode = "mock" | "live";

type ContentApiErrorPayload = {
  message?: string;
};

function getBaseUrl(): string {
  const baseUrl = process.env.CONTENT_API_BASE_URL;

  if (!baseUrl) {
    throw new Error(
      "CONTENT_API_BASE_URL is required when CONTENT_API_MODE=live.",
    );
  }

  return baseUrl.replace(/\/+$/, "");
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as ContentApiErrorPayload;

    if (typeof payload.message === "string" && payload.message.length > 0) {
      return payload.message;
    }
  } catch {
    // Fall back to a generic message when the response body is not JSON.
  }

  return `Request failed: ${response.status}`;
}

export async function fetchJson<T>(path: string): Promise<T> {
  // 通信処理とエラー変換をここに集約しておき、
  // 将来 proto / Connect に差し替えるときも UI 側を変えないようにする。
  const response = await fetch(`${getBaseUrl()}${path}`, {
    headers: {
      Accept: "application/json",
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

export const liveContentApi: ContentApi = {
  getThemes() {
    return fetchJson<Theme[]>("/api/themes");
  },

  getThemeDetail(slug) {
    return fetchJson<ThemeDetail>(`/api/themes/${encodeURIComponent(slug)}`);
  },

  getArticleDetail(id) {
    return fetchJson<ArticleDetail>(`/api/articles/${encodeURIComponent(id)}`);
  },

  getAdminJobs() {
    return fetchJson<AdminJob[]>("/api/admin/jobs");
  },
};

export function getContentApiMode(): ContentApiMode {
  // 明示的に live が指定されるまでは mock を既定にし、
  // ローカル UI / Storybook / テストの安定性を優先する。
  return process.env.CONTENT_API_MODE === "live" ? "live" : "mock";
}
