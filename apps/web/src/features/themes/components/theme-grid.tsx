import { ThemeCard } from "@/features/themes/components/theme-card";
import type { Theme } from "@/types/content";

export function ThemeGrid({ themes }: { themes: Theme[] }) {
  return (
    <div className="theme-grid">
      {themes.map((theme) => (
        <ThemeCard key={theme.slug} theme={theme} />
      ))}
    </div>
  );
}
