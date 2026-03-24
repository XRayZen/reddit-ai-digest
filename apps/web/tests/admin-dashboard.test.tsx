import { Provider } from "react-redux";
import { fireEvent, render, screen } from "@testing-library/react";

import { AdminDashboard } from "@/features/admin/components/admin-dashboard";
import { makeStore } from "@/store";

describe("AdminDashboard", () => {
  it("renders the empty state when there are no jobs", () => {
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
});
