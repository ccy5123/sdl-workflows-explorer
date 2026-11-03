// Copies a text to the clipboard and says so for a moment (SPEC-UI-001 REQ-006, AC-10).
import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  useEffect(() => {
    if (state === "idle") return;
    const timer = window.setTimeout(() => setState("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [state]);

  const copy = () => {
    // navigator.clipboard is missing outside a secure context; the failure is said instead of thrown.
    const write = navigator.clipboard?.writeText(text) ?? Promise.reject(new Error("no clipboard"));
    write.then(
      () => setState("copied"),
      () => setState("failed"),
    );
  };

  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm copy-button"
      data-copied={state === "copied" ? "true" : undefined}
      onClick={copy}
    >
      {state === "copied" ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
      <span aria-live="polite">{state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label}</span>
    </button>
  );
}
