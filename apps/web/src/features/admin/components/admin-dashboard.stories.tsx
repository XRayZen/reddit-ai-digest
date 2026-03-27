"use client";

import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  listAdminArticleOptionsByTheme,
  listAdminJobs,
  listThemes,
} from "@/mocks/fixtures/content-fixtures";

import { AdminDashboard } from "./admin-dashboard";

const meta = {
  title: "Features/AdminDashboard",
  component: AdminDashboard,
  tags: ["autodocs"],
  args: {
    jobs: listAdminJobs(),
    themes: listThemes(),
    articleOptionsByTheme: listAdminArticleOptionsByTheme(),
    mode: "mock",
  },
} satisfies Meta<typeof AdminDashboard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    jobs: [],
  },
};

export const PendingAction: Story = {
  parameters: {
    reduxState: {
      uiPreferences: {
        adminActionPending: true,
        adminMessage: "再要約 をキュー投入中です",
      },
    },
  },
};
