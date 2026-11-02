// Taxonomy explorer: the overview of the release taxonomy and one page per class, with counts that open the matching
// browser rows, example platforms and the correspondence to other vocabularies (SPEC-TAXO-001 REQ-009 to REQ-016).
// Loaded lazily; data/taxonomy.json is fetched by this module on first use and kept for the page's lifetime.
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { IssueLink } from "../components/IssueLink";
import type { IndexJson, TaxonomyClass, TaxonomyJson, TaxonomySource } from "../data/types";
import { TAXONOMY_LINK_TEXT, taxonomyUrl } from "../lib/contribute";
import { offeredValues } from "../lib/filterState";
import { platformHash, taxonomyHash } from "../lib/route";
import {
  BACK_LINK_TEXT,
  JUMP_LIST_NAME,
  NO_EXAMPLE_TEXT,
  NO_ROW_TEXT,
  NOT_FOUND_HEADING,
  classLinks,
  correspondenceRows,
  exampleCaption,
  exampleCount,
  familyGroups,
  itemsText,
  kindHeading,
  kindIsMapped,
  kindLabel,
  kindsInOrder,
  loadErrorText,
  noMappingText,
  notFoundText,
  overviewCaption,
  papersText,
  platformsText,
  relationMeaning,
  splitReference,
} from "../lib/taxonomy";

export type TaxonomyRoute = { kind: "taxonomy"; source?: string } | { kind: "taxonomyClass"; classKind: string; cls: string };

let request: Promise<TaxonomyJson> | null = null;

/** data/taxonomy.json, requested at most once per page load. */
function loadTaxonomy(): Promise<TaxonomyJson> {
  request ??= fetch("data/taxonomy.json").then((response) => {
    if (!response.ok) throw new Error(`data/taxonomy.json: HTTP ${response.status}`);
    return response.json() as Promise<TaxonomyJson>;
  });
  return request;
}

const DASH = "—";
const headingId = (text: string) => `taxo-${text.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

function Reference({ source }: { source: TaxonomySource }) {
  const { before, doiText, after } = splitReference(source);
  return (
    <>
      {before}
      {doiText && <a href={`https://doi.org/${source.doi}`}>{doiText}</a>}
      {after}
    </>
  );
}

function Section({ title, level = 2, children }: { title: string; level?: 2 | 3; children: ReactNode }) {
  const id = headingId(title);
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <section aria-labelledby={id}>
      {/* tabIndex -1: the jump list moves focus to a kind's heading. */}
      <Heading id={id} tabIndex={-1}>
        {title}
      </Heading>
      {children}
    </section>
  );
}

/** A name that may break across lines only after "_" (and at spaces): a <wbr> after each "_", no inserted character. */
function Breakable({ text }: { text: string }) {
  const parts = text.split(/(?<=_)/);
  return (
    <span className="taxo-name">
      {parts.map((p, i) => (
        <Fragment key={i}>
          {p}
          {i < parts.length - 1 && <wbr />}
        </Fragment>
      ))}
    </span>
  );
}

/** "On this page": one button per kind; scrolls to and focuses the kind's heading, leaving the hash unchanged. */
function JumpList({ kinds }: { kinds: readonly string[] }) {
  const jump = (title: string) => {
    const heading = document.getElementById(headingId(title));
    heading?.scrollIntoView({ block: "start" });
    heading?.focus({ preventScroll: true });
  };
  return (
    <nav aria-label={JUMP_LIST_NAME} className="taxo-jump">
      <ul>
        {kinds.map((k) => (
          <li key={k}>
            <button type="button" onClick={() => jump(kindHeading(k))}>
              {kindHeading(k)}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function ClassTable({ classes }: { classes: readonly TaxonomyClass[] }) {
  return (
    <table className="taxo-table">
      <thead>
        <tr>
          <th scope="col">Class</th>
          <th scope="col">Definition</th>
          <th scope="col">Items</th>
        </tr>
      </thead>
      <tbody>
        {classes.map((c) => (
          <tr key={c.class}>
            <td data-label="Class">
              <a href={taxonomyHash(c.class_kind, c.class)}>
                <Breakable text={c.class} />
              </a>
            </td>
            <td data-label="Definition">{c.definition}</td>
            <td data-label="Items" className="num">
              {itemsText(c)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Overview({ data, source }: { data: TaxonomyJson; source: string | undefined }) {
  const { classes } = data;
  const kinds = kindsInOrder(classes);
  const sourcesBody = useRef<HTMLTableSectionElement>(null);
  // The targeted sources row is scrolled into view on load and on every change of the target (REQ-011).
  useEffect(() => {
    if (source !== undefined) sourcesBody.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: "center" });
  }, [source]);
  return (
    <div className="taxonomy">
      <h1>Taxonomy</h1>
      <p className="caption">{overviewCaption(classes)}</p>
      <JumpList kinds={kinds} />
      {kinds.map((kind) => (
        <Section key={kind} title={kindHeading(kind)}>
          {kind === "unit_operation" ? (
            familyGroups(classes).map((g) => (
              <Section key={g.family} title={`Family: ${g.family}`} level={3}>
                <ClassTable classes={g.classes} />
              </Section>
            ))
          ) : (
            <ClassTable classes={classes.filter((c) => c.class_kind === kind)} />
          )}
        </Section>
      ))}
      <Section title="Sources of the correspondence">
        <table className="taxo-table">
          <thead>
            <tr>
              <th scope="col">Key</th>
              <th scope="col">Vocabulary</th>
              <th scope="col">Reference</th>
            </tr>
          </thead>
          <tbody ref={sourcesBody}>
            {data.sources.map((s) => (
              <tr key={s.keys.join(",")} aria-current={source !== undefined && s.keys.includes(source) ? "true" : undefined}>
                <td data-label="Key">{s.keys.join(", ")}</td>
                <td data-label="Vocabulary">{s.vocabulary}</td>
                <td data-label="Reference">
                  <Reference source={s} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
      <Section title="Relations">
        <table className="taxo-table">
          <thead>
            <tr>
              <th scope="col">Relation</th>
              <th scope="col">Meaning</th>
            </tr>
          </thead>
          <tbody>
            {data.relations.map((r) => (
              <tr key={r.match}>
                <td data-label="Relation">{r.match}</td>
                <td data-label="Meaning">{relationMeaning(r)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}

function Correspondence({ cls, data }: { cls: TaxonomyClass; data: TaxonomyJson }) {
  if (!kindIsMapped(cls.class_kind, data.classes)) return <p>{noMappingText(cls.class_kind)}</p>;
  if (cls.correspondence === null) return <p>{NO_ROW_TEXT}</p>;
  return (
    <table className="taxo-table">
      <thead>
        <tr>
          <th scope="col">Vocabulary</th>
          <th scope="col">Term</th>
          <th scope="col">Relation</th>
          <th scope="col">Source</th>
        </tr>
      </thead>
      <tbody>
        {correspondenceRows(cls, data.vocabularies, data.sources).map((r, i) => (
          <tr key={i}>
            {r.span > 0 && (
              <td data-label="Vocabulary" rowSpan={r.span}>
                {r.link ? (
                  <a href={r.link}>
                    <Breakable text={r.label} />
                  </a>
                ) : (
                  <Breakable text={r.label} />
                )}
              </td>
            )}
            <td data-label="Term">{r.term}</td>
            <td data-label="Relation">{r.relation}</td>
            {r.span > 0 && (
              <td data-label="Source" rowSpan={r.span}>
                {r.source}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ClassPage({ cls, data, index }: { cls: TaxonomyClass; data: TaxonomyJson; index: IndexJson }) {
  const offered = useMemo(() => offeredValues(index), [index]);
  const links = classLinks(cls, offered, { platforms: index.platforms.length, papers: index.papers.length });
  const platforms = platformsText(cls.n_platforms);
  const papers = papersText(cls.n_papers);
  return (
    <article className="taxonomy">
      <h1>{cls.class}</h1>
      <dl className="taxo-facts">
        <dt>Kind</dt>
        <dd>{kindLabel(cls.class_kind)}</dd>
        {cls.class_kind === "unit_operation" && cls.family !== null && (
          <>
            <dt>Family</dt>
            <dd>{cls.family}</dd>
          </>
        )}
      </dl>
      <p>{cls.definition}</p>
      {/* SPEC-CONTRIB-001 REQ-005 */}
      <p className="report">
        <IssueLink href={taxonomyUrl(cls.class_kind, cls.class)}>{TAXONOMY_LINK_TEXT}</IssueLink>
      </p>
      <Section title="Counts">
        <ul className="taxo-counts">
          {cls.class_kind !== "field_tag" && <li>{itemsText(cls)}</li>}
          <li>{links.kind === "none" ? platforms : <a href={links.platforms}>{platforms}</a>}</li>
          <li>{links.kind === "none" ? papers : <a href={links.papers}>{papers}</a>}</li>
        </ul>
        {links.note && <p className="note">{links.note}</p>}
      </Section>
      <Section title="Example platforms">
        {cls.examples.length === 0 ? (
          <p>{NO_EXAMPLE_TEXT}</p>
        ) : (
          <>
            <p className="caption">{exampleCaption(cls.class_kind)}</p>
            <ul className="taxo-examples">
              {cls.examples.map((e) => (
                <li key={e.platform_id}>
                  <a href={platformHash(e.platform_id)}>{e.platform_id}</a> {e.platform_name ?? DASH}
                  {e.n !== null && <> {exampleCount(cls.class_kind, e.n)}</>}
                </li>
              ))}
            </ul>
          </>
        )}
      </Section>
      <Section title="Correspondence">
        <Correspondence cls={cls} data={data} />
      </Section>
    </article>
  );
}

function ClassNotFound({ kind, cls }: { kind: string; cls: string }) {
  return (
    <section className="taxonomy">
      <h1>{NOT_FOUND_HEADING}</h1>
      <p>{notFoundText(kind, cls)}</p>
      <p>
        <a href="#/taxonomy">{BACK_LINK_TEXT}</a>
      </p>
    </section>
  );
}

export function Taxonomy({ index, route }: { index: IndexJson; route: TaxonomyRoute }) {
  const [data, setData] = useState<TaxonomyJson | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    loadTaxonomy().then(
      (d) => live && setData(d),
      (e: unknown) => live && setError(e instanceof Error ? e.message : String(e)),
    );
    return () => {
      live = false;
    };
  }, []);

  if (error) return <p role="alert">{loadErrorText(error)}</p>;
  if (!data) return <p>Loading…</p>;
  if (route.kind === "taxonomy") return <Overview data={data} source={route.source} />;
  const cls = data.classes.find((c) => c.class_kind === route.classKind && c.class === route.cls);
  return cls ? <ClassPage cls={cls} data={data} index={index} /> : <ClassNotFound kind={route.classKind} cls={route.cls} />;
}
