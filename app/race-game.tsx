"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildRaceRoster, displayName, type Member } from "./members";
import { COLORS, Profile } from "./profile";
import {
  createBalls,
  createRuntimeTrack,
  nudgeBalls,
  positionWaitingBalls,
  releaseWaitingBalls,
  stepPhysics,
  type Ball,
} from "./physics";
import { drawBackground, drawBall, drawTrack } from "./track-drawing";
import type { Level } from "./level-types";
import { selectPositionBoard } from "./standings";

type Leader = { member: Member; y: number; color: string; time: number };
type FinishResult = { member: Member; color: string; time: number };

export const WINNER_TOAST_HOLD_MS = 5_000;
export const WINNER_TOAST_EXIT_MS = 450;

type RaceGameProps = {
  level: Level;
  onEdit: () => void;
  onBack?: () => void;
  members: Member[];
  participantCount: number;
  presentation: boolean;
};

export function RaceGame({ level, onEdit, onBack, members, participantCount, presentation }: RaceGameProps) {
  const racers = useMemo(() => buildRaceRoster(members, participantCount), [members, participantCount]);
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useRef<number | null>(null);
  const balls = useRef<Ball[]>([]);
  const camera = useRef(0);
  const elapsed = useRef(0);
  const waiting = useRef(true);
  const startRef = useRef<() => void>(() => undefined);
  const runToken = useRef(0);
  const finishIds = useRef(new Set<number>());
  const track = useRef(createRuntimeTrack(level));
  const portraits = useRef(new Map<string, HTMLImageElement>());

  const [racing, setRacing] = useState(false);
  const [winner, setWinner] = useState<Member | null>(null);
  const [showWinnerToast, setShowWinnerToast] = useState(false);
  const [winnerToastExiting, setWinnerToastExiting] = useState(false);
  const [results, setResults] = useState<FinishResult[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [depth, setDepth] = useState(0);
  const [raceNumber, setRaceNumber] = useState(1);
  const [imageRevision, setImageRevision] = useState(0);
  const [raceComplete, setRaceComplete] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const draw = useCallback((time: number) => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context) return;
    const box = element.getBoundingClientRect();
    const ratio = Math.min(1.6, window.devicePixelRatio || 1);
    const scale = box.width / level.width;
    const viewHeight = box.height / scale;
    const width = Math.round(box.width * ratio);
    const height = Math.round(box.height * ratio);
    if (element.width !== width || element.height !== height) {
      element.width = width;
      element.height = height;
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, box.width, box.height);
    context.save();
    context.scale(scale, scale);
    context.translate(0, -camera.current);
    drawBackground(context, level, camera.current, viewHeight);
    drawTrack(context, track.current, time / 1000, undefined, { top: camera.current, bottom: camera.current + viewHeight });
    const top = camera.current - 60;
    const bottom = camera.current + viewHeight + 60;
    for (const ball of balls.current) {
      if (ball.y < top || ball.y > bottom) continue;
      const member = racers[ball.id];
      drawBall(context, ball, member, COLORS[ball.id % COLORS.length], portraits.current.get(member.name), waiting.current);
    }
    context.restore();
  }, [level, racers]);

  const animateWaiting = useCallback((token: number) => {
    const loop = (now: number) => {
      if (token !== runToken.current || !waiting.current) return;
      positionWaitingBalls(balls.current, level, now / 1000);
      draw(now);
      frame.current = requestAnimationFrame(loop);
    };
    frame.current = requestAnimationFrame(loop);
  }, [draw, level]);

  useEffect(() => {
    balls.current = createBalls(racers.length, level);
    waiting.current = true;
    animateWaiting(runToken.current);
    return () => {
      runToken.current += 1;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [animateWaiting, level, racers.length]);

  useEffect(() => {
    let cancelled = false;
    portraits.current.clear();
    const loads = racers.filter((member) => member.image).map((member) => new Promise<void>((resolve) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => {
        if (!cancelled) portraits.current.set(member.name, image);
        resolve();
      };
      image.onerror = () => resolve();
      image.src = member.image!;
    }));
    void Promise.all(loads).then(() => { if (!cancelled) setImageRevision((value) => value + 1); });
    return () => { cancelled = true; };
  }, [racers]);

  useEffect(() => {
    if (!racing) draw(elapsed.current * 1000);
  }, [draw, imageRevision, racing]);

  useEffect(() => {
    if (!winner) return;
    const exitTimer = window.setTimeout(() => setWinnerToastExiting(true), WINNER_TOAST_HOLD_MS);
    const hideTimer = window.setTimeout(() => setShowWinnerToast(false), WINNER_TOAST_HOLD_MS + WINNER_TOAST_EXIT_MS);
    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
    };
  }, [winner]);

  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      const target = event.target;
      const isEditing = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable);
      if (event.code !== "Space" || event.repeat || isEditing) return;
      event.preventDefault();
      startRef.current();
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, []);

  const startRace = async () => {
    if (racing || countdown !== null) return;
    const token = ++runToken.current;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    finishIds.current.clear();
    setWinner(null);
    setShowWinnerToast(false);
    setWinnerToastExiting(false);
    setResults([]);
    setRaceComplete(false);
    setShowLeaderboard(false);
    camera.current = 0;
    elapsed.current = 0;
    track.current = createRuntimeTrack(level);
    if (!waiting.current || balls.current.length !== racers.length) {
      balls.current = createBalls(racers.length, level);
      positionWaitingBalls(balls.current, level, performance.now() / 1000);
    }
    waiting.current = true;
    animateWaiting(token);
    setLeaders([]);
    setDepth(0);
    setCountdown(3);
    for (const count of [2, 1, 0]) {
      await wait(650);
      if (token !== runToken.current) return;
      setCountdown(count);
    }
    setRacing(true);
    window.setTimeout(() => { if (token === runToken.current) setCountdown(null); }, 500);
    waiting.current = false;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    releaseWaitingBalls(balls.current, level);
    let previous = performance.now();
    let accumulator = 0;
    let lastHud = 0;

    const animate = (now: number) => {
      if (token !== runToken.current) return;
      accumulator += Math.min(.04, (now - previous) / 1000);
      previous = now;
      while (accumulator >= 1 / 120) {
        elapsed.current += 1 / 120;
        stepPhysics(balls.current, track.current, 1 / 120, elapsed.current);
        accumulator -= 1 / 120;
      }

      const newFinishers = balls.current
        .filter((ball) => ball.finished && !finishIds.current.has(ball.id))
        .sort((a, b) => b.y - a.y);
      if (newFinishers.length) {
        newFinishers.forEach((ball) => finishIds.current.add(ball.id));
        const finishResults = newFinishers.map((ball) => ({
          member: racers[ball.id],
          color: COLORS[ball.id % COLORS.length],
          time: elapsed.current,
        }));
        setResults((current) => [...current, ...finishResults]);
        if (finishIds.current.size === newFinishers.length) {
          setWinner(finishResults[0].member);
          setShowWinnerToast(true);
          setWinnerToastExiting(false);
          setRaceNumber((value) => value + 1);
        }
      }

      let leader: Ball | null = null;
      let activeCount = 0;
      for (const ball of balls.current) {
        if (ball.finished) continue;
        activeCount += 1;
        if (!leader || ball.y > leader.y) leader = ball;
      }
      if (leader) {
        const target = Math.max(0, Math.min(level.height - 700, leader.y - 260));
        camera.current += (target - camera.current) * .08;
      }
      draw(elapsed.current * 1000);

      if (now - lastHud > 140 && leader) {
        const sorted = balls.current.filter((ball) => !ball.finished).sort((a, b) => b.y - a.y);
        setLeaders(sorted.slice(0, 6).map((ball) => ({
          member: racers[ball.id],
          y: ball.y,
          color: COLORS[ball.id % COLORS.length],
          time: elapsed.current,
        })));
        setDepth(Math.max(0, Math.min(100, leader.y / level.finishY * 100)));
        lastHud = now;
      }
      if (activeCount === 0) {
        setLeaders([]);
        setRacing(false);
        setRaceComplete(true);
        setCountdown(null);
        setDepth(100);
        return;
      }
      frame.current = requestAnimationFrame(animate);
    };
    frame.current = requestAnimationFrame(animate);
  };
  useEffect(() => {
    startRef.current = () => { void startRace(); };
  });

  const reset = () => {
    const token = ++runToken.current;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    finishIds.current.clear();
    track.current = createRuntimeTrack(level);
    setRacing(false);
    setCountdown(null);
    setWinner(null);
    setShowWinnerToast(false);
    setWinnerToastExiting(false);
    setResults([]);
    setRaceComplete(false);
    setShowLeaderboard(false);
    setLeaders([]);
    setDepth(0);
    camera.current = 0;
    elapsed.current = 0;
    balls.current = createBalls(racers.length, level);
    waiting.current = true;
    animateWaiting(token);
  };

  const shown = leaders.length ? leaders : racers.slice(0, 6).map((member, index) => ({ member, y: 0, color: COLORS[index], time: 0 }));
  const placed = new Set(results.map((result) => result.member.name));
  const finishedStandings = results.map((result, index) => ({ ...result, place: index + 1, detail: "FINISHED" }));
  const activeStandings = shown.filter((leader) => !placed.has(leader.member.name)).map((leader, index) => ({ ...leader, place: results.length + index + 1, detail: racing ? "RACING" : "AT GATE" }));
  const standings = selectPositionBoard(finishedStandings, activeStandings);

  return <main className="race-experience">
    <header className="race-bar">
      <div>{!presentation && onBack && <button onClick={onBack}>← GAME ROOM</button>}<b>MARBLE PURSUIT</b><span>RACE #{String(raceNumber).padStart(2, "0")}</span></div>
      <div className="race-actions">{!presentation && <button onClick={onEdit}>✎ LEVEL EDITOR</button>}<button onClick={() => nudgeBalls(balls.current)} disabled={!racing}>✦ NUDGE</button>{raceComplete && <button onClick={() => setShowLeaderboard(true)}>☰ LEADERBOARD</button>}<button className="primary" onClick={() => void startRace()} disabled={racing || countdown !== null}>{racing ? "RACING…" : winner ? "RACE AGAIN" : "▶ START RACE"}</button></div>
    </header>
    <section className="race-stage" aria-label={`${level.name} marble race`}>
      <canvas ref={canvas} aria-label={`${racers.length} portrait marbles racing with physics`} />
      <div className="course-card"><span>ACTIVE COURSE</span><h1>{level.name}</h1><button onClick={reset}>↻ RESET RACE</button></div>
      <div className="race-count"><span className={racing ? "live" : ""}/><b>{racers.length}</b><small>MARBLES</small></div>
      <aside className="standings" aria-label="Race positions"><h2>POSITION <time>TIME</time></h2>{standings.map((entry, index) => <div className={results.length && index === 3 ? "chasing" : ""} key={entry.member.name}><b>{entry.place}</b><i style={{ background: entry.color }}/><span>{displayName(entry.member)}<small>{entry.detail}</small></span><time>{entry.time ? formatTime(entry.time) : "--:--.--"}</time></div>)}</aside>
      {countdown !== null && <div className={`countdown ${countdown === 0 ? "go" : ""}`} aria-live="assertive">{countdown === 0 ? "GO!" : countdown}</div>}
      {!racing && countdown === null && !winner && <div className="ready-card"><span>REAL-TIME PHYSICS</span><h2>{level.name}</h2><p>{racers.length} portrait marbles orbit the release chamber. Gravity takes over when the gate opens.</p><button onClick={() => void startRace()}>▶ RELEASE MARBLES</button><small>Press SPACE to release · First through FINISH wins.</small></div>}
      <div className="depth"><span style={{ height: `${depth}%` }}/><b>START</b><i>FINISH</i></div>
      {showLeaderboard && <div className="leaderboard-backdrop"><section className="leaderboard-modal" role="dialog" aria-modal="true" aria-label="Final race leaderboard"><header><div><span>FINAL RESULTS</span><h2>RACE LEADERBOARD</h2></div><button onClick={() => setShowLeaderboard(false)} aria-label="Close leaderboard">×</button></header><div className="leaderboard-list">{results.map((result, index) => <div key={result.member.name}><b>{index + 1}</b><Profile member={result.member}/><span>{displayName(result.member)}</span><time>{formatTime(result.time)}</time></div>)}</div></section></div>}
    </section>
    {winner && showWinnerToast && <aside className={`winner-toast ${winnerToastExiting ? "is-exiting" : ""}`} aria-live="polite"><button onClick={() => setShowWinnerToast(false)} aria-label="Dismiss winner">×</button><Profile member={winner}/><div><span>FIRST PLACE</span><b>{displayName(winner)}</b><small>{raceComplete ? `Won in ${formatTime(results[0]?.time ?? 0)} · View the full leaderboard.` : "Race continues for the remaining places."}</small></div></aside>}
  </main>;
}

const wait = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
export const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(2).padStart(5, "0")}`;
