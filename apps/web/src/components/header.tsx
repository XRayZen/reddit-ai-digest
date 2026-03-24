"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "motion/react";
import { ArrowUpRightIcon, NewspaperIcon } from "lucide-react";

import { Tag } from "@/components/tag";
import { Button } from "@/components/ui/button";

export function Header() {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const reduceMotion = useReducedMotion();
  const [isScrolled, setIsScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (latestValue) => {
    setIsScrolled(latestValue > 18);
  });

  const navItems = [
    {
      href: "/",
      label: "Home",
      active: pathname === "/",
      variant: "ghost" as const,
    },
    {
      href: "/themes/software-engineering",
      label: "Themes",
      active:
        pathname.startsWith("/themes/") || pathname.startsWith("/articles/"),
      variant: "ghost" as const,
    },
    {
      href: "/admin",
      label: "Admin",
      active: pathname.startsWith("/admin"),
      variant: "outline" as const,
    },
  ];

  return (
    <header className="shell sticky top-4 z-40 pb-7">
      <motion.div
        className="rounded-[calc(var(--radius)+10px)] border border-border bg-card/90 shadow-[var(--shadow)] backdrop-blur-2xl"
        initial={false}
        animate={{
          paddingTop: isScrolled ? 12 : 16,
          paddingBottom: isScrolled ? 12 : 16,
          paddingLeft: 20,
          paddingRight: 20,
          y: reduceMotion ? 0 : isScrolled ? -2 : 0,
        }}
        transition={{
          duration: reduceMotion ? 0.01 : 0.28,
          ease: "easeOut",
        }}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="surface-inline flex size-11 items-center justify-center rounded-2xl">
              <NewspaperIcon className="text-primary" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="cluster items-center">
                <Link
                  href="/"
                  className="font-display text-lg font-semibold uppercase tracking-[0.18em] md:text-xl"
                >
                  Reddit AI Digest
                </Link>
                <Tag variant="outline">Editorial Mock</Tag>
              </div>
              <p className="max-w-xl text-sm text-muted-foreground">
                技術系 Reddit 議論を、日本語の読み物として再構成する。
              </p>
            </div>
          </div>
          <nav
            className="cluster items-center justify-start md:justify-end"
            aria-label="Main navigation"
          >
            {/* 現在地を強調しつつ、MVP の主要 3 導線だけを短距離で往復できるように保つ。 */}
            {navItems.map((item) => (
              <Button
                key={item.href}
                asChild
                variant={item.active ? "default" : item.variant}
                size="sm"
              >
                <Link href={item.href}>
                  {item.label}
                  {item.active ? (
                    <ArrowUpRightIcon data-icon="inline-end" />
                  ) : null}
                </Link>
              </Button>
            ))}
          </nav>
        </div>
      </motion.div>
    </header>
  );
}
