import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ErrorMessage } from "@/components/error-message";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { getThemeFixture } from "@/mocks/fixtures/content-fixtures";

import { ArticleList } from "./article-list";

const softwareTheme = getThemeFixture("software-engineering");

if (!softwareTheme) {
  throw new Error("software-engineering fixture is required for Storybook");
}

const meta = {
  title: "Features/ArticleList",
  component: ArticleList,
  tags: ["autodocs"],
  args: {
    articles: softwareTheme.articles,
  },
} satisfies Meta<typeof ArticleList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    articles: [],
  },
};

export const Loading: Story = {
  render: () => <LoadingSkeleton label="記事一覧を読み込み中" />,
};

export const ErrorState: Story = {
  render: () => (
    <ErrorMessage
      title="記事一覧を取得できませんでした"
      description="API 境界や fixture を見直して、再実行後も表示崩れがないことを確認します。"
    />
  ),
};
