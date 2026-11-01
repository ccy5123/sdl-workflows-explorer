// Browse URL format of spec §3: encode a filter state to the hash query and decode it back (REQ-002). Pure: never throws.
import {
  DEFAULT_STATE,
  sortedNumbers,
  sortedText,
  type FilterState,
  type Match,
  type Offered,
  type YearRange,
} from "./filterState";

function decode(text: string): string | null {
  try {
    return decodeURIComponent(text);
  } catch {
    return null;
  }
}

const list = (xs: readonly (string | number)[]) => xs.map((x) => encodeURIComponent(String(x))).join(",");
const sameYears = (a: YearRange, b: YearRange) => a.from === b.from && a.to === b.to;

/** Query text (no leading "?") holding only the parameters that differ from their default, in §3 order. */
export function encodeFilters(state: FilterState): string {
  const parts: string[] = [];
  const add = (key: string, value: string) => parts.push(`${key}=${value}`);
  if (state.view !== DEFAULT_STATE.view) add("view", state.view);
  if (!sameYears(state.years, DEFAULT_STATE.years)) add("years", `${state.years.from ?? ""}-${state.years.to ?? ""}`);
  if (state.field.length) add("field", list(sortedText(state.field)));
  if (state.im.length) add("im", list(sortedText(state.im)));
  if (state.sw.length) add("sw", list(sortedNumbers(state.sw)));
  if (state.hw.length) add("hw", list(sortedNumbers(state.hw)));
  if (state.mt.length) add("mt", list(sortedText(state.mt)));
  if (state.mtMatch !== DEFAULT_STATE.mtMatch) add("mtMatch", state.mtMatch);
  if (state.tm.length) add("tm", list(sortedText(state.tm)));
  if (state.tmMatch !== DEFAULT_STATE.tmMatch) add("tmMatch", state.tmMatch);
  const q = state.q.trim();
  if (q) add("q", encodeURIComponent(q));
  return parts.join("&");
}

/** `#/browse`, plus `?<query>` when the state is not the default. */
export function browseHash(state: FilterState): string {
  const query = encodeFilters(state);
  return query ? `#/browse?${query}` : "#/browse";
}

function decodeYears(raw: string): YearRange | null {
  const m = /^(\d{4})?-(\d{4})?$/.exec(raw);
  if (!m || (!m[1] && !m[2])) return null;
  const from = m[1] ? Number(m[1]) : null;
  const to = m[2] ? Number(m[2]) : null;
  if (from !== null && to !== null && from > to) return null;
  return { from, to };
}

function decodeTextList(raw: string, offered: readonly string[]): string[] | null {
  const items = raw.split(",").map(decode).filter((x): x is string => x !== null && offered.includes(x));
  return items.length ? sortedText(items) : null;
}

function decodeNumberList(raw: string, offered: readonly number[]): number[] | null {
  const items = raw
    .split(",")
    .filter((x) => /^\d+$/.test(x) && String(Number(x)) === x)
    .map(Number)
    .filter((n) => offered.includes(n));
  return items.length ? sortedNumbers(items) : null;
}

const decodeMatch = (raw: string): Match | null => (raw === "all" || raw === "any" ? raw : null);

/**
 * Filter state of a hash query. Unknown parameters are ignored; for a repeated parameter only the last occurrence is
 * read, and when it yields no valid value the parameter keeps its default. List values come back sorted, de-duplicated.
 */
export function decodeFilters(query: string, offered: Offered): FilterState {
  const raw = new Map<string, string>();
  for (const part of query.split("&")) {
    const eq = part.indexOf("=");
    if (eq > 0) raw.set(part.slice(0, eq), part.slice(eq + 1));
  }
  const read = <T>(key: string, parse: (value: string) => T | null, fallback: T): T => {
    const value = raw.get(key);
    return (value === undefined ? null : parse(value)) ?? fallback;
  };
  return {
    view: read("view", (v) => (v === "papers" || v === "platforms" ? v : null), DEFAULT_STATE.view),
    years: read("years", decodeYears, DEFAULT_STATE.years),
    field: read("field", (v) => decodeTextList(v, offered.field), DEFAULT_STATE.field),
    im: read("im", (v) => decodeTextList(v, offered.im), DEFAULT_STATE.im),
    sw: read("sw", (v) => decodeNumberList(v, offered.sw), DEFAULT_STATE.sw),
    hw: read("hw", (v) => decodeNumberList(v, offered.hw), DEFAULT_STATE.hw),
    mt: read("mt", (v) => decodeTextList(v, offered.mt), DEFAULT_STATE.mt),
    mtMatch: read("mtMatch", decodeMatch, DEFAULT_STATE.mtMatch),
    tm: read("tm", (v) => decodeTextList(v, offered.tm), DEFAULT_STATE.tm),
    tmMatch: read("tmMatch", decodeMatch, DEFAULT_STATE.tmMatch),
    q: read("q", (v) => decode(v)?.trim() || null, DEFAULT_STATE.q),
  };
}
