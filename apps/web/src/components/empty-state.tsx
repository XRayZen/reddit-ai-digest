import { InboxIcon } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    // 文言差し替えだけで空状態を量産できるよう、装飾とレイアウトを共通化する。
    <Empty className="rounded-[calc(var(--radius)+8px)] border border-dashed border-border bg-card/90 px-6 py-12 shadow-[var(--shadow)] backdrop-blur-2xl">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="surface-inline rounded-2xl">
          <InboxIcon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
