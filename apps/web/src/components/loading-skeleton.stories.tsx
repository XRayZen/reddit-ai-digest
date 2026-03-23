import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { LoadingSkeleton } from "./loading-skeleton";

const meta = {
  title: "States/LoadingSkeleton",
  component: LoadingSkeleton,
  tags: ["autodocs"],
  args: {
    label: "読み込み中",
  },
} satisfies Meta<typeof LoadingSkeleton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ArticleList: Story = {
  args: {
    label: "記事一覧を読み込み中",
  },
};
