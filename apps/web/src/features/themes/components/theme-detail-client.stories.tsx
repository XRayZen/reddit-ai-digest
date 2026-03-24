"use client";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ErrorMessage } from "@/components/error-message";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
        themeFilterBySlug: {
          "software-engineering": "品質戦略",
        },
      },
    },
  },
};

export const Loading: Story = {
  render: () => (
    <div className="page-grid">
      <Card className="py-0">
        <CardHeader className="gap-5 border-b pb-6">
          <p className="eyebrow">Theme Overview</p>
          <CardTitle className="font-display text-[clamp(3rem,7vw,5.2rem)] leading-none tracking-tight">
            Software Engineering
          </CardTitle>
          <CardDescription className="leading-8">
            テーマ詳細のロード中状態を確認します。
          </CardDescription>
        </CardHeader>
      </Card>
      <Card className="py-0">
        <CardHeader className="gap-3 border-b pb-5">
          <p className="eyebrow">List Controls</p>
          <CardTitle className="font-display text-3xl leading-none">
            記事一覧
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6">
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
