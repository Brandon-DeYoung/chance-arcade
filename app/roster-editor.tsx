"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_ROSTER_MEMBERS, parseRoster, parseRosterDocument, serializeRoster, type Member } from "./members";
import { Profile } from "./profile";

type DraftMember = Member & { key: string; eligible: boolean };

let nextKey = 0;
const key = () => `roster-${nextKey++}`;
const toDraft = (members: Member[], excluded: Set<string>): DraftMember[] => members.map((member) => ({ ...member, key: key(), eligible: !excluded.has(member.name) }));

function importedDraft(raw: string): DraftMember[] {
  const { members, excluded } = parseRosterDocument(raw);
  return members.map((member) => ({ ...member, key: key(), eligible: !excluded.has(member.name) }));
}

function downloadRoster(rows: DraftMember[]) {
  const members = rows.map(({ name, nickname, image }) => ({ name: name.trim(), ...(nickname?.trim() ? { nickname: nickname.trim() } : {}), ...(image?.trim() ? { image: image.trim() } : {}) }));
  const excluded = new Set(rows.filter((row) => !row.eligible).map((row) => row.name.trim()));
  const url = URL.createObjectURL(new Blob([serializeRoster(members, excluded)], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "random-selector-roster.json";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function RosterEditor({ members, excluded, onApply, onClose }: { members: Member[]; excluded: Set<string>; onApply: (members: Member[], excluded: Set<string>) => void; onClose: () => void }) {
  const [rows, setRows] = useState<DraftMember[]>(() => toDraft(members, excluded));
  const [message, setMessage] = useState("");
  const importInput = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    dialog.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  const update = (rowKey: string, patch: Partial<DraftMember>) => setRows((current) => current.map((row) => row.key === rowKey ? { ...row, ...patch } : row));
  const save = () => {
    try {
      const roster = parseRoster(JSON.stringify(rows.map(({ name, nickname, image }) => ({ name, nickname, image }))));
      const nextExcluded = new Set(rows.filter((row) => !row.eligible).map((row) => row.name.trim()));
      onApply(roster, nextExcluded);
      onClose();
    } catch (error) { setMessage(error instanceof Error ? error.message : "The roster could not be saved."); }
  };
  const importFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 1_000_000) { setMessage("Roster files must be smaller than 1 MB."); return; }
    try { setRows(importedDraft(await file.text())); setMessage(`${file.name} imported. Review the roster, then save.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : "The roster could not be imported."); }
  };

  return <div className="roster-backdrop" role="presentation">
    <section ref={dialog} className="roster-editor" role="dialog" aria-modal="true" aria-labelledby="roster-title" tabIndex={-1}>
      <header><div><span>ROSTER SETUP</span><h2 id="roster-title">Edit roster</h2><p>Edit people and choose who appears in both games.</p></div><button onClick={onClose} aria-label="Close roster editor">×</button></header>
      <div className="roster-tools">
        <button onClick={() => setRows((current) => current.map((row) => ({ ...row, eligible: true })))}>SELECT ALL</button>
        <button onClick={() => setRows((current) => current.map((row) => ({ ...row, eligible: false })))}>UNSELECT ALL</button>
        <button onClick={() => importInput.current?.click()}>IMPORT JSON</button>
        <button onClick={() => downloadRoster(rows)}>EXPORT JSON</button>
        <input ref={importInput} type="file" accept="application/json,.json" onChange={(event) => { void importFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
      </div>
      <div className="roster-columns" aria-hidden="true"><span>PLAY</span><span>PORTRAIT</span><span>FULL NAME</span><span>NICKNAME</span><span>IMAGE PATH OR URL</span><span /></div>
      <div className="roster-rows">{rows.map((row) => <div className={`roster-row ${row.eligible ? "" : "is-unselected"}`} key={row.key}>
        <label className="roster-eligible"><input type="checkbox" checked={row.eligible} onChange={(event) => update(row.key, { eligible: event.target.checked })}/><span>{row.eligible ? "IN" : "OUT"}</span></label>
        <Profile member={{ name: row.name || "New person", nickname: row.nickname, image: row.image }}/>
        <label><span>Full name</span><input value={row.name} placeholder="Full name" onChange={(event) => update(row.key, { name: event.target.value })}/></label>
        <label><span>Nickname</span><input value={row.nickname ?? ""} placeholder="Optional" onChange={(event) => update(row.key, { nickname: event.target.value })}/></label>
        <label><span>Image</span><input value={row.image ?? ""} placeholder="/profiles/photo.jpg" onChange={(event) => update(row.key, { image: event.target.value })}/></label>
        <button className="roster-remove" onClick={() => setRows((current) => current.filter((entry) => entry.key !== row.key))} disabled={rows.length === 1} aria-label={`Remove ${row.name || "new person"}`}>REMOVE</button>
      </div>)}</div>
      <button className="roster-add" disabled={rows.length >= MAX_ROSTER_MEMBERS} onClick={() => setRows((current) => [...current, { key: key(), name: "", nickname: "", image: "", eligible: true }])}>＋ ADD PERSON</button>
      {message && <p className="roster-message" role="status">{message}</p>}
      <footer><span><b>{rows.filter((row) => row.eligible).length}</b> selected · {rows.length} total</span><button onClick={onClose}>CANCEL</button><button className="primary" onClick={save}>SAVE ROSTER</button></footer>
    </section>
  </div>;
}
