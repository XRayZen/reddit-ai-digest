import { LoadingSkeleton } from "@/components/loading-skeleton";

export default function Loading() {
  return (
    <div className="grid gap-4">
      {/* 画面固有のレイアウト差分が出ても破綻しにくいよう、汎用 skeleton を並べる。 */}
      <LoadingSkeleton label="ページを読み込み中" />
      <LoadingSkeleton label="セクションを読み込み中" />
    </div>
  );
}
