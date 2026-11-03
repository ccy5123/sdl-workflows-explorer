// Column chooser of a browser table: one checkbox per column (REQ-012), in a "Columns · N" popover beside the table's
// other tools (SPEC-UI-001 REQ-028); N is the number of columns shown.
import { useRef, useState } from "react";
import { Popover } from "./Popover";

export interface ChooserItem {
  id: string;
  label: string;
  checked: boolean;
  /** The id and Select columns stay shown: their boxes are checked and disabled. */
  disabled: boolean;
  onToggle: () => void;
}

export function ColumnChooser({ id, legend, items }: { id: string; legend: string; items: ChooserItem[] }) {
  const [open, setOpen] = useState(false);
  const close = useRef(() => setOpen(false)).current;
  const shown = items.filter((item) => item.checked).length;
  return (
    <Popover id={id} label={`Columns · ${shown}`} open={open} onOpen={() => setOpen(true)} onClose={close}>
      <fieldset className="filter-group column-chooser">
        <legend>{legend}</legend>
        {items.map((item) => (
          <label key={item.id} className="filter-option">
            <input type="checkbox" checked={item.checked} disabled={item.disabled} onChange={item.onToggle} />
            <span className="filter-option-name">{item.label}</span>
          </label>
        ))}
      </fieldset>
    </Popover>
  );
}
