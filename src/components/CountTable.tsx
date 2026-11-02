// Count table of a split (SPEC-TRENDS-001 REQ-008, REQ-011): the chart of a multi-valued split (shaded) and the table
// view below a bar chart (unshaded). Every count is a link to the browser rows it counts.
import { RAMP, rampStep, textColorFor, tokenVar } from "../lib/chartTokens";
import type { FilterState, View } from "../lib/filterState";
import { browseHash } from "../lib/filterUrl";
import { linkState, segmentName, totalName, valueLabel, type CountTable as Table, type Split } from "../lib/trends";

export function CountTable({
  state,
  split,
  table,
  unit,
  shaded,
}: {
  state: FilterState;
  split: Split;
  table: Table;
  unit: View;
  shaded: boolean;
}) {
  const max = Math.max(0, ...table.counts.flat());
  // A shaded cell takes its ramp step as background and black or white text; others keep the table's ink.
  const cellStyle = (count: number) => {
    const step = shaded ? rampStep(count, max) : null;
    return step === null ? undefined : { background: tokenVar(`--chart-ramp-${step}`), color: textColorFor(RAMP[step]!) };
  };

  return (
    <div className="count-table-wrap">
      <table className="count-table">
        <thead>
          <tr>
            <td />
            {table.bins.map((b) => (
              <th key={b.label} scope="col" className="num">
                {b.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">n</th>
            {table.bins.map((b, i) => (
              <td key={b.label} className="num">
                <a href={browseHash(linkState(state, b, split))} aria-label={totalName(b.label, table.n[i]!, unit)}>
                  {table.n[i]}
                </a>
              </td>
            ))}
          </tr>
          {table.values.map((value, v) => (
            <tr key={value}>
              <th scope="row">{valueLabel(split, value)}</th>
              {table.bins.map((b, i) => {
                const count = table.counts[v]![i]!;
                return (
                  <td key={b.label} className="num" style={cellStyle(count)}>
                    <a
                      href={browseHash(linkState(state, b, split, value))}
                      aria-label={segmentName(b.label, valueLabel(split, value), count, table.n[i]!, unit)}
                    >
                      {count}
                    </a>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
