import { AdminDashboard } from "@/features/admin/components/admin-dashboard";
import { getAdminJobs } from "@/lib/api/client";

export default async function AdminPage() {
  // 管理画面も初期描画データは Server Component で取得し、
  // ボタン操作だけを client 側の責務に留める。
  // 管理画面も公開画面と同じ取得境界を使い、mock / live 切替えを page に漏らさない。
  const jobs = await getAdminJobs();

  return <AdminDashboard jobs={jobs} />;
}
