import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingSkeleton({ label }: { label: string }) {
  return (
    // screen reader には用途別ラベルだけを伝え、見た目は同じ skeleton を使い回す。
    <Card aria-label={label} className="py-0">
      <CardContent className="grid gap-4 px-6 py-6">
        <Skeleton className="h-4 w-3/5 rounded-full" />
        <Skeleton className="h-4 w-full rounded-full" />
        <Skeleton className="h-4 w-5/6 rounded-full" />
        <Skeleton className="h-4 w-2/3 rounded-full" />
      </CardContent>
    </Card>
  );
}
