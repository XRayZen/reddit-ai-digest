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
    <div className="mb-5 flex max-w-3xl flex-col gap-3">
      <p className="eyebrow">{eyebrow}</p>
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-3xl leading-none tracking-tight md:text-4xl">
          {title}
        </h2>
        <p className="text-sm leading-7 text-muted-foreground md:text-base">
          {description}
        </p>
      </div>
      <div className="surface-rule" />
    </div>
  );
}
