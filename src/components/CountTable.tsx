// Count table of a split (SPEC-TRENDS-001 REQ-008, REQ-011): the chart of a multi-valued split (shaded) and the table
// view below a bar chart (unshaded). Every count is a link to the browser rows it counts.
import { RAMP, rampStep, textColorFor, tokenVar } from "../lib/chartTokens";
import type { FilterState, View } from "../lib/filterState";
import { browseHash } from "../lib/filterUrl";
import { linkState, segmentName, totalName, valueCode, valueLabel, type CountTable as Table, type Split, type SplitValue } from "../lib/trends";

/** A split value's readable name, with its code in `title` (SPEC-UI-001 REQ-028); shared with the chart legend. */
export function ValueName({ split, value }: { split: Split; value: SplitValue }) {
  const code = valueCode(split, value);
  return code ? <span title={code}>{valueLabel(split, value)}</span> : <>{valueLabel(split, value)}</>;
}

export function CountTable({
  state,
  split,
  table,
  unit,
  shaded,
  turned = false,
}: {
  state: FilterState;
  split: Split;
  table: Table;
  unit: View;
  shaded: boolean;
  /** Years down the side and values across the top (the phone view of a bar chart's table, which has few values). */
  turned?: boolean;
}) {
  const max = Math.max(0, ...table.counts.flat());
  // A shaded cell takes its ramp step as background and black or white text; others keep the table's ink.
  const cellStyle = (count: number) => {
    const step = shaded ? rampStep(count, max) : null;
    return step === null ? undefined : { background: tokenVar(`--chart-ramp-${step}`), color: textColorFor(RAMP[step]!) };
  };

  if (turned) {
    return (
      <div className="count-table-wrap">
        <table className="count-table count-table-turned">
          <thead>
            <tr>
              <td />
              <th scope="col" className="num">
                n
              </th>
              {table.values.map((value) => (
                <th key={value} scope="col" className="num">
                  <ValueName split={split} value={value} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.bins.map((b, i) => (
              <tr key={b.label}>
                <th scope="row">{b.label}</th>
                <td className="num">
                  <a href={browseHash(linkState(state, b, split))} aria-label={totalName(b.label, table.n[i]!, unit)}>
                    {table.n[i]}
                  </a>
                </td>
                {table.values.map((value, v) => {
                  const count = table.counts[v]![i]!;
                  return (
                    <td key={value} className="num" style={cellStyle(count)}>
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
              <th scope="row">
                <ValueName split={split} value={value} />
              </th>
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
