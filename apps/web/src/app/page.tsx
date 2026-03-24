import { HomeScreen } from "@/features/home/components/home-screen";
import { getThemes } from "@/lib/api/client";

export default async function HomePage() {
  // 読み取り中心の一覧なので Server Component のまま取得し、
  // client 化をホーム全体へ広げない。
  // 一覧データの取得は page で閉じ、表示責務は feature component に渡す。
  const themes = await getThemes();

  return <HomeScreen themes={themes} />;
}
