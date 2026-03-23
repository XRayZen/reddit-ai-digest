import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  render: () => (
    <div className="grid gap-6">
      <section className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader className="gap-4">
            <p className="eyebrow">Frontend First</p>
            <h1 className="font-display max-w-[14ch] text-[clamp(2.6rem,6vw,5.5rem)] leading-none">
              Reddit の技術議論を、整理された読み物へ。
            </h1>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="max-w-2xl text-sm leading-8 text-muted-foreground md:text-base">
              データ取得前の状態でも、情報設計が崩れないことを確認します。
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="gap-3">
            <p className="eyebrow">MVP Focus</p>
            <h2 className="font-display text-3xl leading-none">
              いま固めるもの
            </h2>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm leading-8 text-muted-foreground md:text-base">
              Storybook では page
              ではなく表示コンポーネント単位で回帰を固定します。
            </p>
          </CardContent>
        </Card>
      </section>
      <EmptyState
        title="テーマはまだありません"
        description="取得層が空レスポンスを返しても、ホーム画面の構造は維持されます。"
      />
    </div>
  ),
};
