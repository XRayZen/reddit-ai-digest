"use server";

import { queueIngestion, queueResummarization } from "@/lib/api/client";
import type {
  AdminActionResult,
  QueueIngestionInput,
  QueueResummarizationInput,
} from "@/types/content";

const WEB_ADMIN_REQUESTED_BY = "web-admin";

function toErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return "unknown error";
}

export async function queueIngestionAction(
  input: Pick<QueueIngestionInput, "themeSlug">,
): Promise<AdminActionResult> {
  if (input.themeSlug.trim().length === 0) {
    return {
      ok: false,
      message: "収集対象のテーマを選択してください。",
    };
  }

  try {
    const job = await queueIngestion({
      themeSlug: input.themeSlug,
      requestedBy: WEB_ADMIN_REQUESTED_BY,
      idempotencyKey: crypto.randomUUID(),
    });

    return {
      ok: true,
      message: `収集ジョブ ${job.id} を投入しました。`,
    };
  } catch (error) {
    return {
      ok: false,
      message: `収集ジョブの投入に失敗しました: ${toErrorMessage(error)}`,
    };
  }
}

export async function queueResummarizationAction(
  input: Pick<QueueResummarizationInput, "articleId">,
): Promise<AdminActionResult> {
  if (input.articleId.trim().length === 0) {
    return {
      ok: false,
      message: "再要約対象の記事を選択してください。",
    };
  }

  try {
    const job = await queueResummarization({
      articleId: input.articleId,
      requestedBy: WEB_ADMIN_REQUESTED_BY,
      idempotencyKey: crypto.randomUUID(),
    });

    return {
      ok: true,
      message: `再要約ジョブ ${job.id} を投入しました。`,
    };
  } catch (error) {
    return {
      ok: false,
      message: `再要約ジョブの投入に失敗しました: ${toErrorMessage(error)}`,
    };
  }
}
