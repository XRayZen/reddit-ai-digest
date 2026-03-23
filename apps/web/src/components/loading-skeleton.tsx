export function LoadingSkeleton({ label }: { label: string }) {
  return (
    <div className="skeleton" aria-label={label}>
      <div className="skeleton-bar skeleton-bar-wide" />
      <div className="skeleton-bar" />
      <div className="skeleton-bar skeleton-bar-short" />
    </div>
  );
}
