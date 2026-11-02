// Parser of the CITATION.cff subset the release uses (SPEC-SITE-001 REQ-001, REQ-002): top-level `key: value` lines
// and one `authors` list of `key: value` maps. Any other line stops the build, so a richer file is noticed rather than
// half read.
import type { Citation, CitationAuthor } from "../../src/data/types";

const FILE = "CITATION.cff";

/** `"quoted"` → quoted (no escapes in the release's file); bare → trimmed. */
function scalar(raw: string, line: number): string {
  const v = raw.trim();
  if (v.startsWith('"')) {
    if (!v.endsWith('"') || v.length < 2 || v.slice(1, -1).includes('"')) {
      throw new Error(`${FILE} line ${line}: unsupported quoted value ${v}`);
    }
    return v.slice(1, -1);
  }
  return v;
}

export function parseCitationCff(text: string): Citation {
  const top = new Map<string, string>();
  const authors: Map<string, string>[] = [];
  let inAuthors = false;
  text.split(/\r?\n/).forEach((content, i) => {
    const line = i + 1;
    if (content.trim() === "" || content.trimStart().startsWith("#")) return;
    let m = /^([a-z][a-z-]*):(?: (.*))?$/.exec(content);
    if (m) {
      const [, key, value] = m as unknown as [string, string, string | undefined];
      inAuthors = key === "authors" && value === undefined;
      if (value === undefined && !inAuthors) throw new Error(`${FILE} line ${line}: unsupported nested value for ${key}`);
      if (value !== undefined) top.set(key, scalar(value, line));
      return;
    }
    m = /^ {2}- ([a-z][a-z-]*): (.*)$/.exec(content);
    if (m && inAuthors) {
      authors.push(new Map([[m[1]!, scalar(m[2]!, line)]]));
      return;
    }
    m = /^ {4}([a-z][a-z-]*): (.*)$/.exec(content);
    if (m && inAuthors && authors.length > 0) {
      authors[authors.length - 1]!.set(m[1]!, scalar(m[2]!, line));
      return;
    }
    throw new Error(`${FILE} line ${line}: unsupported line "${content}"`);
  });

  const need = (key: string): string => {
    const v = top.get(key);
    if (!v) throw new Error(`${FILE}: missing field ${key}`);
    return v;
  };
  if (authors.length === 0) throw new Error(`${FILE}: missing field authors`);
  const toAuthor = (a: Map<string, string>, i: number): CitationAuthor => {
    const family = a.get("family-names");
    if (!family) throw new Error(`${FILE}: author ${i + 1} has no family-names`);
    return { family, given: a.get("given-names") || null, orcid: a.get("orcid") || null };
  };
  return {
    title: need("title"),
    version: need("version"),
    date_released: need("date-released"),
    doi: need("doi"),
    license: need("license"),
    authors: authors.map(toAuthor),
  };
}
