"use client";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ErrorMessage } from "@/components/error-message";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getThemeFixture } from "@/mocks/fixtures/content-fixtures";

import { ThemeDetailClient } from "./theme-detail-client";

const defaultTheme = getThemeFixture("software-engineering");

if (!defaultTheme) {
  throw new Error("software-engineering fixture is required for Storybook");
}

const meta = {
  title: "Features/ThemeDetailClient",
  component: ThemeDetailClient,
  tags: ["autodocs"],
  args: {
    theme: defaultTheme,
  },
} satisfies Meta<typeof ThemeDetailClient>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SortedByPoints: Story = {
  parameters: {
    reduxState: {
      uiPreferences: {
        themeSortOrder: "points",
      },
    },
  },
};

export const FilteredByQuality: Story = {
  parameters: {
    reduxState: {
      uiPreferences: {
        themeFilterLabel: "品質戦略",
      },
    },
  },
};

export const Loading: Story = {
  render: () => (
    <div className="grid gap-6">
      <section className="rounded-[calc(var(--radius)+10px)] border border-border bg-card px-7 py-7 shadow-[var(--shadow)] backdrop-blur-xl">
        <p className="eyebrow">Theme Overview</p>
        <h1 className="font-display mt-3 text-[clamp(2.8rem,7vw,5rem)] leading-none">
          Software Engineering
        </h1>
        <p className="mt-4 text-sm leading-8 text-muted-foreground md:text-base">
          テーマ詳細のロード中状態を確認します。
        </p>
      </section>
      <Card>
        <CardHeader className="gap-3">
          <p className="eyebrow">List Controls</p>
          <h2 className="font-display text-3xl leading-none">記事一覧</h2>
        </CardHeader>
        <CardContent className="pt-0">
          <LoadingSkeleton label="テーマ詳細を読み込み中" />
        </CardContent>
      </Card>
    </div>
  ),
};

export const ErrorState: Story = {
  render: () => (
    <ErrorMessage
      title="テーマ詳細を取得できませんでした"
      description="固定回帰ではエラー表示の余白とアラート表現も baseline に含めます。"
    />
  ),
};
