import { Provider } from "react-redux";
import { fireEvent, render, screen, within } from "@testing-library/react";

import { AdminDashboard } from "@/features/admin/components/admin-dashboard";
import { listAdminJobs } from "@/mocks/fixtures/content-fixtures";
import { makeStore } from "@/store";

describe("AdminDashboard", () => {
  it("renders the empty state when there are no jobs", () => {
    // ジョブ履歴ゼロをエラー扱いせず、正しい初期状態として表示できることを見る。
    const store = makeStore();

    render(
      <Provider store={store}>
        <AdminDashboard jobs={[]} />
      </Provider>,
    );

    expect(screen.getByText("ジョブはまだありません")).toBeInTheDocument();
  });

  it("shows the action controls for ingest and resummarize", () => {
    // mock 実装でも「操作中は他ボタンを止める」体験を先に固定する。
    const store = makeStore();

    render(
      <Provider store={store}>
        <AdminDashboard jobs={[]} />
      </Provider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "収集実行" }));

    expect(screen.getByText("収集 をキュー投入中です")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "再要約実行" })).toBeDisabled();
  });

  it("renders a mobile-friendly job history summary with full job metadata", () => {
    // 横スクロールに頼らない mobile 表示でも、状態確認に必要な情報を欠かさない。
    const store = makeStore();

    render(
      <Provider store={store}>
        <AdminDashboard jobs={listAdminJobs()} />
      </Provider>,
    );

    expect(screen.getByText("モバイル履歴")).toBeInTheDocument();
    const mobileHistory = screen.getByRole("list", {
      name: "モバイル履歴カード",
    });

    expect(
      within(mobileHistory).getByText("job-20260323-001"),
    ).toBeInTheDocument();
    expect(within(mobileHistory).getByText("completed")).toBeInTheDocument();
    expect(
      within(mobileHistory).getByText("2026年3月23日 09:10"),
    ).toBeInTheDocument();
  });
});
