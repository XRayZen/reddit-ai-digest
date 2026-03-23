import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { listThemes } from "@/mocks/fixtures/content-fixtures";

import { ThemeCard } from "./theme-card";

const meta = {
  title: "Features/ThemeCard",
  component: ThemeCard,
  tags: ["autodocs"],
  args: {
    theme: listThemes()[0],
  },
} satisfies Meta<typeof ThemeCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongCopy: Story = {
  args: {
    theme: {
      ...listThemes()[1],
      name: "Local LLM Infrastructure And Team Operations",
      description:
        "量子化、ローカル推論、評価運用、モデル配布、GPU 構成管理まで含めた長めの説明文を表示した状態です。",
      articleCount: 18,
    },
  },
};
