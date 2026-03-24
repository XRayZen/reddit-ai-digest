import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function Tag({
  children,
  variant = "secondary",
  className,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: React.ComponentProps<typeof Badge>["variant"];
}) {
  return (
    <Badge
      variant={variant}
      className={cn(
        "rounded-full px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.14em]",
        className,
      )}
    >
      {children}
    </Badge>
  );
}
