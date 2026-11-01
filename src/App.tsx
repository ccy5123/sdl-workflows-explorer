// Step 1 shell: shows the release counts read from data/index.json and the data version footer (REQ-015).
import { useEffect, useState, type CSSProperties } from "react";
import { COUNT_NAMES, type CountName, type IndexJson } from "./data/types";

const LABELS: Record<CountName, string> = {
  papers: "Papers",
  platforms: "Platforms",
  modules: "Modules",
  steps: "Steps",
  connections: "Connections",
  material_connections: "Material connections",
  candidates: "Screened candidates",
};

const page: CSSProperties = {
  fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  maxWidth: "40rem",
  margin: "0 auto",
  padding: "2rem 1rem",
  lineHeight: 1.5,
  color: "#1f2328",
};
const cell: CSSProperties = { padding: "0.35rem 0.75rem", borderBottom: "1px solid #d0d7de" };

export function App() {
  const [index, setIndex] = useState<IndexJson | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("data/index.json")
      .then((response) => {
        if (!response.ok) throw new Error(`data/index.json: HTTP ${response.status}`);
        return response.json() as Promise<IndexJson>;
      })
      .then(setIndex)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  return (
    <main style={page}>
      <h1 style={{ fontSize: "1.6rem" }}>SDL Workflows Explorer</h1>
      {error && <p role="alert">Could not load the data: {error}</p>}
      {!index && !error && <p>Loading…</p>}
      {index && (
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <caption style={{ textAlign: "left", fontWeight: 600, paddingBottom: "0.5rem" }}>
            Counts in release {index.release.version}
          </caption>
          <tbody>
            {COUNT_NAMES.map((name) => (
              <tr key={name}>
                <th scope="row" style={{ ...cell, textAlign: "left", fontWeight: 400 }}>
                  {LABELS[name]}
                </th>
                <td style={{ ...cell, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {index.counts[name].toLocaleString("en")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {index && (
        <footer style={{ marginTop: "2rem", fontSize: "0.9rem", color: "#57606a" }}>
          Data version {index.release.version} ·{" "}
          <a href={`https://doi.org/${index.release.doi}`}>doi:{index.release.doi}</a>
        </footer>
      )}
    </main>
  );
}
