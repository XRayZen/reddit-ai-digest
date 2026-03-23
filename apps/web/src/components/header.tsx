import Link from "next/link";

import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="shell pb-7 pt-5">
      <div className="flex flex-col gap-4 rounded-[calc(var(--radius)+10px)] border border-border bg-card px-5 py-4 shadow-[var(--shadow)] backdrop-blur-xl md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <Link
            href="/"
            className="font-display text-xl font-semibold uppercase tracking-[0.18em]"
          >
            Reddit AI Digest
          </Link>
          <p className="text-sm text-muted-foreground">
            技術系 Reddit 議論を、日本語の読み物として再構成する。
          </p>
        </div>
        <nav
          className="flex flex-wrap items-center gap-2"
          aria-label="Main navigation"
        >
          <Button asChild variant="ghost" size="sm">
            <Link href="/">Home</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/themes/software-engineering">Themes</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin">Admin</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
