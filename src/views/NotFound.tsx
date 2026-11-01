// Shown for any hash the site cannot serve (REQ-002).
export function NotFound({ hash }: { hash: string }) {
  return (
    <section className="not-found" role="alert">
      <h1>Not found</h1>
      <p>
        Nothing to show for <code>{hash}</code>.
      </p>
      <p>
        <a href="#/">Go to the home page</a>
      </p>
    </section>
  );
}
