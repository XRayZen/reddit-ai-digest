import { Badge } from "@/components/ui/badge";

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <Badge
      variant="secondary"
      className="rounded-full px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em]"
    >
      {children}
    </Badge>
  );
}
