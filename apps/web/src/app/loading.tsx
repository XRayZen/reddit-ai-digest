import { LoadingSkeleton } from "@/components/loading-skeleton";

export default function Loading() {
  return (
    <div className="grid gap-4">
      <LoadingSkeleton label="ページを読み込み中" />
      <LoadingSkeleton label="セクションを読み込み中" />
    </div>
  );
}
