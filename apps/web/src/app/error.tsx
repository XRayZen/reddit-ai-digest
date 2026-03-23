"use client";

import { ErrorMessage } from "@/components/error-message";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="stack-xl">
      <ErrorMessage
        title="画面の描画に失敗しました"
        description={
          error.message ||
          "再読み込みしても改善しない場合は実装を確認してください。"
        }
      />
      <button type="button" onClick={() => reset()}>
        再試行
      </button>
    </div>
  );
}
