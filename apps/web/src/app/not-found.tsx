import Link from "next/link";

import { ErrorMessage } from "@/components/error-message";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid gap-4">
      <ErrorMessage
        title="対象が見つかりません"
        description="モックデータに存在しないテーマまたは記事です。"
      />
      {/* not-found 専用画面でも導線を切らず、ホームへ戻れることを優先する。 */}
      <Button asChild variant="secondary" className="justify-self-start">
        <Link href="/">ホームへ戻る</Link>
      </Button>
    </div>
  );
}
