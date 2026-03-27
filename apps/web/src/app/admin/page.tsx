import {
  queueIngestionAction,
  queueResummarizationAction,
} from "@/app/admin/actions";
import { AdminDashboard } from "@/features/admin/components/admin-dashboard";
import { getContentApiMode } from "@/lib/api/live-content-api";
import { getAdminJobs, getThemeDetail, getThemes } from "@/lib/api/client";

async function listAdminArticleOptionsByTheme() {
  const themes = await getThemes();
  const articleOptionEntries = await Promise.all(
    themes.map(async (theme) => {
      const detail = await getThemeDetail(theme.slug);

      return [
        theme.slug,
        detail.articles.map((article) => ({
          id: article.id,
          title: article.title,
          themeSlug: article.themeSlug,
        })),
      ] as const;
    }),
  );

  return {
    themes,
    articleOptionsByTheme: Object.fromEntries(articleOptionEntries),
  };
}

export default async function AdminPage() {
  // 管理画面も取得境界は page でまとめ、client 側は選択状態と押下中表示に集中させる。
  // live 操作時は server action を渡し、API 接続情報や admin token を browser に出さない。
  const mode = getContentApiMode();
  const [jobs, { themes, articleOptionsByTheme }] = await Promise.all([
    getAdminJobs(),
    listAdminArticleOptionsByTheme(),
  ]);

  return (
    <AdminDashboard
      jobs={jobs}
      themes={themes}
      articleOptionsByTheme={articleOptionsByTheme}
      mode={mode}
      queueIngestionAction={mode === "live" ? queueIngestionAction : undefined}
      queueResummarizationAction={
        mode === "live" ? queueResummarizationAction : undefined
      }
    />
  );
}
