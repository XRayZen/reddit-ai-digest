import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { getThemeFixture } from "@/mocks/fixtures/content-fixtures";

import { ArticleCard } from "./article-card";

const softwareTheme = getThemeFixture("software-engineering");

if (!softwareTheme) {
  throw new Error("software-engineering fixture is required for Storybook");
}

const meta = {
  title: "Features/ArticleCard",
  component: ArticleCard,
  tags: ["autodocs"],
  args: {
    article: softwareTheme.articles[0],
  },
} satisfies Meta<typeof ArticleCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongSummary: Story = {
  args: {
    article: {
      ...softwareTheme.articles[1],
      title:
        "Teams are restructuring release review rituals because AI-assisted code reviews amplify coordination drift",
      summary:
        "レビュー待ち、調整待ち、AI 提案の再確認を別々に扱うのではなく、出荷判断に必要な情報だけをまとめて扱うべきだという長文サマリーを表示する状態です。",
      pointCount: 9,
    },
  },
};
