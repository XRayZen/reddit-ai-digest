import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { listThemes } from "@/mocks/fixtures/content-fixtures";

import { HomeScreen } from "./home-screen";

const meta = {
  title: "Pages/HomeScreen",
  component: HomeScreen,
  tags: ["autodocs"],
  parameters: {
    pageShell: true,
  },
} satisfies Meta<typeof HomeScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    themes: listThemes(),
  },
};

export const Empty: Story = {
  args: {
    themes: [],
  },
};
