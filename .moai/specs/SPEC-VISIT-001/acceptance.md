# Acceptance: SPEC-VISIT-001

AC-1 to AC-4 are Vitest unit tests (`tests/visitorCounter.test.ts`, `tests/visitors.test.ts`). AC-5 to AC-7 are
Playwright tests (`e2e/visitors.spec.ts`) against the `dist-e2e/` build, with the counting service mocked by
`page.route`. AC-8 is checked on the live site after deployment.

### AC-1 Counting (REQ-001, REQ-003)
- Two check-ins from the same IP and User-Agent on one UTC day give `visitors` 1; a second IP gives 2.
- The same person on the next UTC day counts again (`visitors` 2); `since` stays the first day.
- `online` counts a hash checked in 4 minutes ago and drops one checked in 6 minutes ago.

### AC-2 What is kept (REQ-002)
- After a check-in, no stored value contains the IP address or the User-Agent.
- A new UTC day replaces the salt and empties the day's hashes and online rows; the next midnight is returned as the
  alarm time.

### AC-3 Origins and bots (REQ-004, REQ-005)
- A check-in from another origin or from a User-Agent containing "bot", "crawler", "spider" or "HeadlessChrome" is
  not counted, and the counts are still returned.
- The allowed origin gets `Access-Control-Allow-Origin`; another origin does not.

### AC-4 Client module (REQ-006, REQ-008)
- `visitorEndpoint` returns the Worker URL on `https://ccy5123.github.io`, the `.invalid` URL in mode `e2e`, and
  `null` on `localhost` in other modes.
- `parseCounts` accepts the documented JSON and rejects negative, fractional, missing or non-numeric values and a
  malformed date.
- `visitorText` gives "3 online · 1,204 visitors since 10 Nov 2026" for `{3, 1204, "2026-11-10"}`.
- The module passes the UI-free check of `tests/libBoundary.test.ts`; the Worker's online window equals the window the
  About text states.

### AC-5 Footer shows both numbers (REQ-006, REQ-007)
- With the service mocked, the footer shows the count text on `#/` and after navigating to `#/about`; the request is a
  `POST` without cookies.

### AC-6 Quiet failure (REQ-008)
- With the request aborted, answered 500, or answered with malformed JSON, the footer shows no count and no page error
  is raised.

### AC-7 About section (REQ-009)
- `#/about` has a "Visitor count" section with the text of `VISITOR_ABOUT`.

### AC-8 Live site (REQ-001 to REQ-008)
- On `https://ccy5123.github.io/sdl-workflows-explorer/` the footer shows both numbers, and `GET /` on the Worker
  returns the same counts.
