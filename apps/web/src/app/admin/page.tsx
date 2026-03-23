import { AdminDashboard } from "@/features/admin/components/admin-dashboard";
import { getAdminJobs } from "@/lib/api/client";

export default async function AdminPage() {
  const jobs = await getAdminJobs();

  return <AdminDashboard jobs={jobs} />;
}
