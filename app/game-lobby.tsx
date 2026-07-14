"use client";

import { useState, type CSSProperties } from "react";
import type { Member } from "./members";
import { PageTextEditor } from "./page-text-editor";
import { RosterEditor } from "./roster-editor";
import defaultUiText from "./ui-text.json";

type GameId = "wheel" | "marbles";
type MainMenuText = typeof defaultUiText.mainMenu;

export function GameLobby({ members, excluded, copy, presentation, onPresentation, onCopyChange, onSelect, onRosterChange }: { members: Member[]; excluded: Set<string>; copy: MainMenuText; presentation: boolean; onPresentation: () => void; onCopyChange: (copy: MainMenuText) => void; onSelect: (game: GameId) => void; onRosterChange: (members: Member[], excluded: Set<string>) => void }) {
  const [editingRoster, setEditingRoster] = useState(false);
  const [editingText, setEditingText] = useState(false);
  const eligibleCount = members.filter((member) => !excluded.has(member.name)).length;
  return <main className="game-room"><div className="room-shell"><header className="room-hero"><p className="room-eyebrow">{!presentation && <button className="copy-edit-dot" onClick={() => setEditingText(true)} aria-label="Edit main menu text" title="Edit page text"><span/></button>} {copy.eyebrow}</p><h1>{copy.titleFirstLine}<br/><em>{copy.titleSecondLine}</em></h1><p>{copy.subtitle}</p><div className="room-actions"><span className="room-roster">{eligibleCount} {copy.eligibleLabel} · {excluded.size} {copy.unselectedLabel}</span>{!presentation && <><button onClick={() => setEditingRoster(true)}>✎ {copy.editRosterButton}</button><button onClick={onPresentation}>▣ PRESENT</button></>}</div>{!eligibleCount && <p className="empty-roster" role="alert">Select at least one person in the roster to play.</p>}</header><section className="game-grid" aria-label="Choose a game"><GameCard id="wheel" accent="#ff4f75" {...copy.wheel} onSelect={onSelect} disabled={!eligibleCount}/><GameCard id="marbles" accent="#4f68e8" {...copy.marbles} onSelect={onSelect} disabled={!eligibleCount}/></section></div>{editingRoster && <RosterEditor members={members} excluded={excluded} onApply={onRosterChange} onClose={() => setEditingRoster(false)}/>} {editingText && <PageTextEditor heading="Edit main menu text" value={copy} onSave={onCopyChange} onClose={() => setEditingText(false)}/>}</main>;
}

function GameCard({ id, accent, kicker, name, action, onSelect, disabled }: { id: GameId; accent: string; kicker: string; name: string; action: string; onSelect: (game: GameId) => void; disabled: boolean }) {
  return <button className={`game-card game-card-${id}`} onClick={() => onSelect(id)} disabled={disabled} style={{ "--game-accent": accent } as CSSProperties}><span className="game-card-art" aria-hidden="true">{id === "wheel" ? <span className="mini-wheel"><i/></span> : <span className="mini-marbles">{Array.from({ length: 9 }, (_, index) => <i key={index}/>)}<b/></span>}</span><span className="game-card-copy"><small>{kicker}</small><strong>{name}</strong><b>{action} <i>→</i></b></span></button>;
}
