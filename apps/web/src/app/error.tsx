"use client";

import { ErrorMessage } from "@/components/error-message";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="grid gap-4">
      <ErrorMessage
        title="画面の描画に失敗しました"
        description={
          error.message ||
          "再読み込みしても改善しない場合は実装を確認してください。"
        }
      />
      <Button
        type="button"
        variant="outline"
        className="justify-self-start"
        onClick={() => reset()}
      >
        再試行
      </Button>
    </div>
  );
}
