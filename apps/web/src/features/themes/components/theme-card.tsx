import Link from "next/link";

import type { Theme } from "@/types/content";

export function ThemeCard({ theme }: { theme: Theme }) {
  return (
    <Link className="theme-card" href={`/themes/${theme.slug}`}>
      <div className="theme-card-top">
        <p className="eyebrow">Theme</p>
        <span className="metric">{theme.articleCount} topics</span>
      </div>
      <h3>{theme.name}</h3>
      <p>{theme.description}</p>
    </Link>
  );
}
