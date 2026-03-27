import { ApiRequestError } from "@/lib/api/errors";

const queueIngestion = vi.fn();
const queueResummarization = vi.fn();

vi.mock("@/lib/api/client", () => ({
  queueIngestion,
  queueResummarization,
}));

describe("admin server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a success message for queued ingestion jobs", async () => {
    queueIngestion.mockResolvedValue({
      id: "job_ingest_123",
      type: "ingest",
      status: "queued",
      targetLabel: "theme:software-engineering",
      requestedAt: "Sun, 23 Mar 2026 00:00:00 GMT",
    });

    const { queueIngestionAction } = await import("@/app/admin/actions");
    const result = await queueIngestionAction({
      themeSlug: "software-engineering",
    });

    expect(queueIngestion).toHaveBeenCalledWith({
      themeSlug: "software-engineering",
      requestedBy: "web-admin",
      idempotencyKey: expect.any(String),
    });
    expect(result).toEqual({
      ok: true,
      message: "収集ジョブ job_ingest_123 を投入しました。",
    });
  });

  it("converts API failures into displayable error messages", async () => {
    queueResummarization.mockRejectedValue(
      new ApiRequestError("backend unavailable", 503),
    );

    const { queueResummarizationAction } = await import("@/app/admin/actions");
    const result = await queueResummarizationAction({
      articleId: "se-001",
    });

    expect(result).toEqual({
      ok: false,
      message: "再要約ジョブの投入に失敗しました: backend unavailable",
    });
  });
});
