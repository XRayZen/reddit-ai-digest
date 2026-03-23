import { http, HttpResponse } from "msw";

import { ApiNotFoundError } from "@/lib/api/errors";
import { mockContentApi } from "@/lib/api/mock-content-api";

export async function themesResponse() {
  const themes = await mockContentApi.getThemes();

  return HttpResponse.json(themes);
}

export async function themeDetailResponse(slug: string) {
  try {
    const theme = await mockContentApi.getThemeDetail(slug);

    return HttpResponse.json(theme);
  } catch (error) {
    if (error instanceof ApiNotFoundError) {
      return HttpResponse.json({ message: error.message }, { status: 404 });
    }

    throw error;
  }
}

export async function articleDetailResponse(id: string) {
  try {
    const article = await mockContentApi.getArticleDetail(id);

    return HttpResponse.json(article);
  } catch (error) {
    if (error instanceof ApiNotFoundError) {
      return HttpResponse.json({ message: error.message }, { status: 404 });
    }

    throw error;
  }
}

export async function adminJobsResponse() {
  const jobs = await mockContentApi.getAdminJobs();

  return HttpResponse.json(jobs);
}

// MSW もアプリ本体と同じ mock adapter を使い、
// fixture 参照を複数レイヤへ散らさないようにする。
export const handlers = [
  http.get("/api/themes", () => themesResponse()),
  http.get("/api/themes/:slug", ({ params }) =>
    themeDetailResponse(String(params.slug)),
  ),
  http.get("/api/articles/:id", ({ params }) =>
    articleDetailResponse(String(params.id)),
  ),
  http.get("/api/admin/jobs", () => adminJobsResponse()),
];
