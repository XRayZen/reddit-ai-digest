import { ThemeCard } from "@/features/themes/components/theme-card";
import type { Theme } from "@/types/content";

export function ThemeGrid({ themes }: { themes: Theme[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {/* ホーム側はテーマ配列を渡すだけにして、
          レスポンシブなカード配置の責務をここへ寄せる。 */}
      {themes.map((theme) => (
        <ThemeCard key={theme.slug} theme={theme} />
      ))}
    </div>
  );
}
