import Link from "next/link";

import { ErrorMessage } from "@/components/error-message";

export default function NotFound() {
  return (
    <div className="stack-xl">
      <ErrorMessage
        title="対象が見つかりません"
        description="モックデータに存在しないテーマまたは記事です。"
      />
      <Link className="back-link" href="/">
        ホームへ戻る
      </Link>
    </div>
  );
}
