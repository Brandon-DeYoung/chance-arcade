"use client";

import { useEffect, useMemo, useState } from "react";
import { createDefaultLevel } from "./default-level";
import { createDefaultRosterDocument } from "./default-roster";
import { GameLobby } from "./game-lobby";
import { LevelEditor } from "./level-editor";
import type { Level } from "./level-types";
import { MAX_RACE_MARBLES, parseRosterDocument, type Member } from "./members";
import { cloneData } from "./platform";
import { enterPresentation, PresentationControl } from "./presentation-control";
import { RaceGame } from "./race-game";
import { readLocalJson, writeLocalJson } from "./storage";
import { WheelGame } from "./wheel-game";
import defaultUiText from "./ui-text.json";

type Screen = "lobby" | "wheel" | "marbles" | "edit";
type UiText = typeof defaultUiText;
type SavedRoster = { members?: unknown; excluded?: unknown };

const ROSTER_STORAGE_KEY = "random-selector-game-room-roster-v1";
const LEGACY_ROSTER_STORAGE_KEY = "wheel-deals-game-room-roster";
const TEXT_STORAGE_KEY = "random-selector-game-room-text-v3";
const bundledRoster = createDefaultRosterDocument();

export const mergeUiText = (saved: Partial<UiText>): UiText => ({
  mainMenu: {
    ...defaultUiText.mainMenu,
    ...saved.mainMenu,
    wheel: { ...defaultUiText.mainMenu.wheel, ...saved.mainMenu?.wheel },
    marbles: { ...defaultUiText.mainMenu.marbles, ...saved.mainMenu?.marbles },
  },
  wheelScreen: { ...defaultUiText.wheelScreen, ...saved.wheelScreen },
});

export default function Home() {
  const [level, setLevel] = useState<Level>(() => createDefaultLevel());
  const [members, setMembers] = useState<Member[]>(() => cloneData(bundledRoster.members));
  const [screen, setScreen] = useState<Screen>("lobby");
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set(bundledRoster.excluded));
  const [raceSize, setRaceSize] = useState(bundledRoster.members.length);
  const [testMode, setTestMode] = useState(false);
  const [raceKey, setRaceKey] = useState(0);
  const [uiText, setUiText] = useState<UiText>(() => cloneData(defaultUiText));
  const [presentation, setPresentation] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const eligible = useMemo(
    () => members.filter((member) => !excluded.has(member.name)),
    [members, excluded],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const current = readLocalJson<SavedRoster>(ROSTER_STORAGE_KEY);
      const legacy = current.value ? current : readLocalJson<SavedRoster>(LEGACY_ROSTER_STORAGE_KEY);
      if (legacy.error) setNotice(legacy.error);
      if (!legacy.value) return;
      try {
        const saved = legacy.value;
        const document = parseRosterDocument(JSON.stringify(saved.members ?? saved));
        const nextExcluded = new Set(document.excluded);
        if (Array.isArray(saved.excluded)) {
          for (const name of saved.excluded) {
            if (typeof name === "string" && document.members.some((member) => member.name === name)) nextExcluded.add(name);
          }
        }
        setMembers(document.members);
        setExcluded(nextExcluded);
        setRaceSize(Math.min(document.members.length, MAX_RACE_MARBLES));
      } catch (error) {
        setNotice(error instanceof Error ? `Saved roster ignored: ${error.message}` : "The saved roster could not be loaded.");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = readLocalJson<Partial<UiText>>(TEXT_STORAGE_KEY);
      if (saved.error) setNotice(saved.error);
      if (saved.value) setUiText(mergeUiText(saved.value));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key.toLocaleLowerCase() !== "p" || event.repeat) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      setPresentation((active) => !active);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const persistRoster = (roster: Member[], nextExcluded: Set<string>) => {
    const error = writeLocalJson(ROSTER_STORAGE_KEY, { members: roster, excluded: [...nextExcluded] });
    if (error) setNotice(error);
  };
  const updateRoster = (roster: Member[]) => {
    const nextExcluded = new Set([...excluded].filter((name) => roster.some((member) => member.name === name)));
    setMembers(roster);
    setRaceSize(Math.min(roster.length, MAX_RACE_MARBLES));
    setExcluded(nextExcluded);
    persistRoster(roster, nextExcluded);
  };
  const applyGameRoster = (roster: Member[], requestedExcluded: Set<string>) => {
    const nextExcluded = new Set([...requestedExcluded].filter((name) => roster.some((member) => member.name === name)));
    setMembers(roster);
    setRaceSize(Math.min(roster.length, MAX_RACE_MARBLES));
    setExcluded(nextExcluded);
    persistRoster(roster, nextExcluded);
  };
  const saveUiText = (next: UiText) => {
    setUiText(next);
    const error = writeLocalJson(TEXT_STORAGE_KEY, next);
    if (error) setNotice(error);
  };
  const returnToLobby = () => {
    setTestMode(false);
    setScreen("lobby");
  };

  let content;
  if (screen === "wheel") {
    content = <WheelGame members={eligible} copy={uiText.wheelScreen} presentation={presentation} onCopyChange={(wheelScreen) => saveUiText({ ...uiText, wheelScreen })} onBack={returnToLobby} />;
  } else if (screen === "edit") {
    content = <LevelEditor level={level} members={members} onMembersChange={updateRoster} onChange={setLevel} onRace={(count) => { setRaceSize(count); setTestMode(true); setRaceKey((value) => value + 1); setScreen("marbles"); }} />;
  } else if (screen === "marbles") {
    content = <RaceGame key={raceKey} level={level} members={testMode ? members : eligible} participantCount={testMode ? raceSize : eligible.length} presentation={presentation} onEdit={() => setScreen("edit")} onBack={returnToLobby} />;
  } else {
    content = <GameLobby members={members} excluded={excluded} copy={uiText.mainMenu} presentation={presentation} onPresentation={() => void enterPresentation(setPresentation, setNotice)} onCopyChange={(mainMenu) => saveUiText({ ...uiText, mainMenu })} onRosterChange={applyGameRoster} onSelect={(game) => { setTestMode(false); setScreen(game); }} />;
  }

  return <div className={`app-shell ${presentation ? "is-presenting" : ""}`}>
    {content}
    <PresentationControl active={presentation} onChange={setPresentation} onError={setNotice} />
    {notice && <div className="app-notice" role="status"><span>{notice}</span><button onClick={() => setNotice(null)} aria-label="Dismiss message">×</button></div>}
  </div>;
}
