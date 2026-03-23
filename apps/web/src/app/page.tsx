import { HomeScreen } from "@/features/home/components/home-screen";
import { getThemes } from "@/lib/api/client";

export default async function HomePage() {
  const themes = await getThemes();

  return <HomeScreen themes={themes} />;
}
