import { TriangleAlertIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function ErrorMessage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    // error / not-found の両方で使えるよう、見た目だけを共通化して文言は呼び出し元で決める。
    <Alert
      variant="destructive"
      className="rounded-[calc(var(--radius)+6px)] shadow-[var(--shadow)] backdrop-blur-xl"
    >
      <TriangleAlertIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}
