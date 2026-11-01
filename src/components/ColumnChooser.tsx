// Column chooser of a browser table: one checkbox per column (REQ-012).

export interface ChooserItem {
  id: string;
  label: string;
  checked: boolean;
  /** The id and Select columns stay shown: their boxes are checked and disabled. */
  disabled: boolean;
  onToggle: () => void;
}

export function ColumnChooser({ legend, items }: { legend: string; items: ChooserItem[] }) {
  return (
    <fieldset className="column-chooser">
      <legend>{legend}</legend>
      {items.map((item) => (
        <label key={item.id}>
          <input type="checkbox" checked={item.checked} disabled={item.disabled} onChange={item.onToggle} />
          {item.label}
        </label>
      ))}
    </fieldset>
  );
}
