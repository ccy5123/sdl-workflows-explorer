// "How this works": the closed disclosure that holds a page's method notes (how a number is computed, assumptions,
// command listings), so the page opens on its heading and results (SPEC-UI-001 phase 5). One per page.
import type { ReactNode } from "react";

export function HowItWorks({ children }: { children: ReactNode }) {
  return (
    <details className="card how-it-works">
      <summary>How this works</summary>
      {children}
    </details>
  );
}
