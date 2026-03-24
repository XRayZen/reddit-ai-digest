import { HomeScreen } from "@/features/home/components/home-screen";
import { getThemes } from "@/lib/api/client";

export default async function HomePage() {
  // 一覧データの取得は page で閉じ、表示責務は feature component に渡す。
  const themes = await getThemes();

  return <HomeScreen themes={themes} />;
}
