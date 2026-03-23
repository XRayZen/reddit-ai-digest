import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ErrorMessage } from "./error-message";

const meta = {
  title: "States/ErrorMessage",
  component: ErrorMessage,
  tags: ["autodocs"],
  args: {
    title: "表示できませんでした",
    description:
      "回帰テストではエラーパネルの余白、色、文字組みも検知対象にします。",
  },
} satisfies Meta<typeof ErrorMessage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
