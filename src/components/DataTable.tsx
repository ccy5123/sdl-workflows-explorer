// The one TanStack Table wrapper of the site: sortable header buttons with aria-sort and a column chooser (REQ-010 to REQ-012).
// All @tanstack/react-table use stays in this file, so an API change of the library touches one place.
// The header stays in view while the rows scroll inside the table box, the row under the pointer is highlighted, and
// long text can be cut to one line with the full text in `title` (SPEC-UI-001 REQ-027).
import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  columnVisibilityFeature,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type ColumnDef,
  type Row,
  type RowData,
} from "@tanstack/react-table";
import { ColumnChooser } from "./ColumnChooser";

/** A column of a browser table. */
export interface Col<T> {
  id: string;
  header: string;
  /** Sort key; a column without one is not sortable. An undefined value sorts last in both directions. */
  sort?: { kind: "number" | "text"; value: (row: T) => number | string | undefined };
  cell: (row: T) => ReactNode;
  /** Cannot be hidden (id and Select columns). */
  fixed?: boolean;
  /** Numeric cells: right-aligned with tabular figures by the shared `.num` rule (SPEC-SITE-001 REQ-012). */
  num?: boolean;
}

const features = tableFeatures({ rowSortingFeature, columnVisibilityFeature, sortedRowModel: createSortedRowModel() });

const collator = new Intl.Collator("en", { sensitivity: "accent" });
const textSort = <R extends RowData>(a: Row<typeof features, R>, b: Row<typeof features, R>, id: string) =>
  collator.compare(String(a.getValue(id)), String(b.getValue(id)));
const numberSort = <R extends RowData>(a: Row<typeof features, R>, b: Row<typeof features, R>, id: string) =>
  Number(a.getValue(id)) - Number(b.getValue(id));

const ARIA_SORT = { asc: "ascending", desc: "descending" } as const;

/** Cell text cut to one line with an ellipsis; the full text is in `title`. */
export function Truncated({ text }: { text: string }) {
  return (
    <span className="truncate" title={text}>
      {text}
    </span>
  );
}

export function DataTable<T extends RowData>({
  name,
  chooserLabel,
  columns,
  rows,
  rowId,
  toolbar,
}: {
  /** Value of the table's data-table attribute. */
  name: string;
  chooserLabel: string;
  columns: Col<T>[];
  rows: T[];
  rowId: (row: T) => string;
  /** Controls shown beside the column chooser. */
  toolbar?: ReactNode;
}) {
  const byId = useMemo(() => new Map(columns.map((c) => [c.id, c])), [columns]);
  const defs = useMemo(
    () =>
      columns.map((c): ColumnDef<typeof features, T> => {
        const sort = c.sort;
        const base = { id: c.id, header: c.header, enableHiding: !c.fixed };
        if (!sort) return base;
        return {
          ...base,
          accessorFn: (row: T) => sort.value(row),
          sortFn: sort.kind === "number" ? numberSort : textSort,
          sortUndefined: "last",
        };
      }),
    [columns],
  );
  // Index order is the data order, so ties fall back to it and "no sort" restores it (REQ-011).
  const table = useTable({
    features,
    columns: defs,
    data: rows,
    getRowId: rowId,
    sortDescFirst: false,
    enableMultiSort: false,
  });

  // Columns out of view to either side of the box: shown by a fade at that edge and, while any column is hidden, a
  // note in the toolbar (SPEC-UI-001 UI AC-52). The page itself never scrolls sideways.
  const box = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState({ left: false, right: false });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const update = () => {
      const left = el.scrollLeft > 1;
      const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
      setMore((m) => (m.left === left && m.right === right ? m : { left, right }));
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <div className="table-tools">
        <ColumnChooser
          id={`${name}-columns`}
          legend={chooserLabel}
          items={table.getAllLeafColumns().map((column) => ({
            id: column.id,
            label: byId.get(column.id)?.header ?? column.id,
            checked: column.getIsVisible(),
            disabled: !column.getCanHide(),
            onToggle: () => column.toggleVisibility(),
          }))}
        />
        {toolbar}
        {(more.left || more.right) && (
          <p className="table-more">
            Scroll sideways for more columns
            <ArrowRight size={14} aria-hidden="true" />
          </p>
        )}
      </div>
      <div className={`table-frame${more.left ? " more-left" : ""}${more.right ? " more-right" : ""}`}>
      <div className="table-scroll table-scroll-sticky" ref={box}>
        <table className="data" data-table={name}>
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => {
                  const column = header.column;
                  const label = byId.get(column.id)?.header ?? column.id;
                  if (!column.getCanSort()) {
                    return (
                      <th key={header.id} scope="col">
                        {label}
                      </th>
                    );
                  }
                  const sorted = column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={sorted ? ARIA_SORT[sorted] : "none"}
                      className={byId.get(column.id)?.num ? "num" : undefined}
                    >
                      <button type="button" className="sort-button" onClick={column.getToggleSortingHandler()}>
                        {label}
                      </button>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className={byId.get(cell.column.id)?.num ? "num" : undefined}>
                    {byId.get(cell.column.id)?.cell(row.original)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>
    </>
  );
}
