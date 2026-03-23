import { http, HttpResponse } from "msw";

import {
  getArticleFixture,
  getThemeFixture,
  listAdminJobs,
  listThemes,
} from "@/mocks/fixtures/content-fixtures";

export const handlers = [
  http.get("/api/themes", () => HttpResponse.json(listThemes())),
  http.get("/api/themes/:slug", ({ params }) => {
    const theme = getThemeFixture(String(params.slug));

    if (!theme) {
      return HttpResponse.json({ message: "Not found" }, { status: 404 });
    }

    return HttpResponse.json(theme);
  }),
  http.get("/api/articles/:id", ({ params }) => {
    const article = getArticleFixture(String(params.id));

    if (!article) {
      return HttpResponse.json({ message: "Not found" }, { status: 404 });
    }

    return HttpResponse.json(article);
  }),
  http.get("/api/admin/jobs", () => HttpResponse.json(listAdminJobs())),
];
