export function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5 max-w-3xl space-y-3">
      <p className="eyebrow">{eyebrow}</p>
      <div className="space-y-2">
        <h2 className="font-display text-3xl leading-none tracking-tight md:text-4xl">
          {title}
        </h2>
        <p className="text-sm leading-7 text-muted-foreground md:text-base">
          {description}
        </p>
      </div>
    </div>
  );
}
