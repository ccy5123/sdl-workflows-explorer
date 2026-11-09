// Visitor count in the footer (SPEC-VISIT-001 REQ-006 to REQ-008): checks in on load and every minute while the tab is
// visible, without cookies, and shows nothing when the service cannot be reached or answers anything unexpected.
import { useEffect, useState } from "react";
import { HEARTBEAT_MS, parseCounts, visitorEndpoint, visitorText, type VisitorCounts } from "../lib/visitors";

export function VisitorCount() {
  const [counts, setCounts] = useState<VisitorCounts | null>(null);

  useEffect(() => {
    const url = visitorEndpoint(import.meta.env.MODE, window.location.origin);
    if (!url) return;
    let stopped = false;
    const checkIn = () => {
      if (document.visibilityState !== "visible") return;
      fetch(url, { method: "POST", credentials: "omit", cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((json: unknown) => !stopped && setCounts(parseCounts(json)))
        .catch(() => !stopped && setCounts(null));
    };
    checkIn();
    const timer = window.setInterval(checkIn, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", checkIn);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", checkIn);
    };
  }, []);

  if (!counts) return null;
  return <span className="footer-visitors">{visitorText(counts)}</span>;
}
