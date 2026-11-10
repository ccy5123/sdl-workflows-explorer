// Whether a CSS media query matches, updated when it changes (the phone layout and reduced motion of the graph,
// SPEC-UI-001 UI AC-36, UI AC-38). False where matchMedia is missing.
import { useEffect, useState } from "react";

/** The phone breakpoint of the site's CSS (styles.css): below it the phone layouts apply. */
export const PHONE_QUERY = "(max-width: 799.98px)";

const matches = (query: string) => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(query).matches;

export function useMedia(query: string): boolean {
  const [match, setMatch] = useState(() => matches(query));
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(query);
    const update = () => setMatch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return match;
}
