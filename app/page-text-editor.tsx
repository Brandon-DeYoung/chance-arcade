"use client";

import { useEffect, useRef, useState } from "react";
import { cloneData } from "./platform";

export type TextTree = { [key: string]: string | TextTree };
type Field = { path: string[]; value: string };

const fields = (tree: TextTree, path: string[] = []): Field[] => Object.entries(tree).flatMap(([name, value]) => typeof value === "string" ? [{ path: [...path, name], value }] : fields(value, [...path, name]));
const label = (path: string[]) => path.map((part) => part.replace(/([a-z])([A-Z])/g, "$1 $2")).join(" · ");

export function PageTextEditor<T extends TextTree>({ heading, value, onSave, onClose }: { heading: string; value: T; onSave: (value: T) => void; onClose: () => void }) {
  const initialFields = fields(value);
  const dialog = useRef<HTMLElement>(null);
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(initialFields.map((field) => [field.path.join("."), field.value])));
  useEffect(() => {
    dialog.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  const save = () => {
    const next = cloneData(value);
    for (const [joinedPath, text] of Object.entries(draft)) {
      const path = joinedPath.split(".");
      let target: TextTree = next;
      for (const part of path.slice(0, -1)) target = target[part] as TextTree;
      target[path[path.length - 1]] = text;
    }
    onSave(next);
    onClose();
  };
  return <div className="text-editor-backdrop" role="presentation">
    <section ref={dialog} className="text-editor" role="dialog" aria-modal="true" aria-labelledby="text-editor-title" tabIndex={-1}>
      <header><div><span>PAGE WORDING</span><h2 id="text-editor-title">{heading}</h2><p>Changes are saved on this device. Shared defaults remain in app/ui-text.json.</p></div><button onClick={onClose} aria-label="Close text editor">×</button></header>
      <div className="text-editor-fields">{initialFields.map((field) => { const id = field.path.join("."); return <label key={id}><span>{label(field.path)}</span><input value={draft[id]} onChange={(event) => setDraft((current) => ({ ...current, [id]: event.target.value }))}/></label>; })}</div>
      <footer><button onClick={onClose}>CANCEL</button><button className="primary" onClick={save}>SAVE TEXT</button></footer>
    </section>
  </div>;
}
