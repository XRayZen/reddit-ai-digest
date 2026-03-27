import { useRouter } from "next/navigation";
import { Provider } from "react-redux";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";

import {
  AdminDashboard,
  resolveResummarizationArticleID,
} from "@/features/admin/components/admin-dashboard";
import {
  listAdminArticleOptionsByTheme,
  listAdminJobs,
  listThemes,
} from "@/mocks/fixtures/content-fixtures";
import { makeStore } from "@/store";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

describe("AdminDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useRouter).mockReturnValue({
      refresh,
    } as unknown as ReturnType<typeof useRouter>);
  });

  it("renders the empty state when there are no jobs", () => {
    // ジョブ履歴ゼロをエラー扱いせず、正しい初期状態として表示できることを見る。
    const store = makeStore();

    render(
      <Provider store={store}>
        <AdminDashboard
          jobs={[]}
          themes={listThemes()}
          articleOptionsByTheme={listAdminArticleOptionsByTheme()}
        />
      </Provider>,
    );

    expect(screen.getByText("ジョブはまだありません")).toBeInTheDocument();
  });

  it("shows the action controls for ingest and resummarize", () => {
    // mock 実装でも「操作中は他ボタンを止める」体験を先に固定する。
    const store = makeStore();

    render(
      <Provider store={store}>
        <AdminDashboard
          jobs={[]}
          themes={listThemes()}
          articleOptionsByTheme={listAdminArticleOptionsByTheme()}
        />
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
        <AdminDashboard
          jobs={listAdminJobs()}
          themes={listThemes()}
          articleOptionsByTheme={listAdminArticleOptionsByTheme()}
        />
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

  it("resolves the first article of the selected theme when the previous target is no longer valid", () => {
    const articleID = resolveResummarizationArticleID(
      listAdminArticleOptionsByTheme(),
      "local-llm",
      "se-001",
    );

    expect(articleID).toBe("llm-001");
  });

  it("refreshes the job list after a successful live ingestion request", async () => {
    const queueIngestionAction = vi.fn().mockResolvedValue({
      ok: true,
      message: "収集ジョブ job_live_123 を投入しました。",
    });
    const store = makeStore();

    render(
      <Provider store={store}>
        <AdminDashboard
          jobs={listAdminJobs()}
          themes={listThemes()}
          articleOptionsByTheme={listAdminArticleOptionsByTheme()}
          mode="live"
          queueIngestionAction={queueIngestionAction}
        />
      </Provider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "収集実行" }));

    await waitFor(() => {
      expect(queueIngestionAction).toHaveBeenCalledWith({
        themeSlug: "software-engineering",
      });
    });
    await waitFor(() => {
      expect(refresh).toHaveBeenCalledTimes(1);
    });
    expect(
      screen.getByText("収集ジョブ job_live_123 を投入しました。"),
    ).toBeInTheDocument();
  });

  it("shows the failure message without refreshing on live resummarization errors", async () => {
    const queueResummarizationAction = vi.fn().mockResolvedValue({
      ok: false,
      message: "再要約ジョブの投入に失敗しました: backend unavailable",
    });
    const store = makeStore();

    render(
      <Provider store={store}>
        <AdminDashboard
          jobs={listAdminJobs()}
          themes={listThemes()}
          articleOptionsByTheme={listAdminArticleOptionsByTheme()}
          mode="live"
          queueResummarizationAction={queueResummarizationAction}
        />
      </Provider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "再要約実行" }));

    await waitFor(() => {
      expect(queueResummarizationAction).toHaveBeenCalledWith({
        articleId: "se-001",
      });
    });
    expect(refresh).not.toHaveBeenCalled();
    expect(
      screen.getByText("再要約ジョブの投入に失敗しました: backend unavailable"),
    ).toBeInTheDocument();
  });
});
