// Skeleton shown while a view's data loads (SPEC-UI-001 REQ-006). Its only text is "Loading…" for screen readers;
// the bars carry no text, so the main region still reads "Loading…".
export function Skeleton({ width = "100%", height = 16 }: { width?: string; height?: number }) {
  return <span className="skeleton" aria-hidden="true" style={{ width, height }} />;
}

export function Loading() {
  return (
    <div className="loading" role="status">
      <span className="visually-hidden">Loading…</span>
      <Skeleton width="40%" height={32} />
      <Skeleton width="70%" />
      <Skeleton width="55%" />
      <Skeleton height={160} />
    </div>
  );
}
