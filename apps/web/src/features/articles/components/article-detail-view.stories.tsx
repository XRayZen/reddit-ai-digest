import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { getArticleFixture } from "@/mocks/fixtures/content-fixtures";

import { ArticleDetailView } from "./article-detail-view";

const defaultArticle = getArticleFixture("se-001");

if (!defaultArticle) {
  throw new Error("se-001 fixture is required for Storybook");
}

const meta = {
  title: "Features/ArticleDetailView",
  component: ArticleDetailView,
  tags: ["autodocs"],
  args: {
    article: defaultArticle,
  },
} satisfies Meta<typeof ArticleDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongCopy: Story = {
  args: {
    article: {
      ...defaultArticle,
      translation:
        "翻訳文を長めにした状態です。複数段落相当の長さを 1 カラム内で扱っても可読性が落ちないこと、見出しと本文の間隔が維持されることを確認します。",
      summary:
        "要約も長めにして、リンク、ラベル、日付、本文、主要論点リストのバランスが崩れないかを見るための story です。UI の意図した余白と行間が保たれることを重視します。",
      keyPoints: [
        ...defaultArticle.keyPoints,
        "追加の主要論点を表示してもリストの詰まりが起きないことを確認する。",
        "長文コンテンツでも back link の位置が安定することを見る。",
      ],
    },
  },
};
