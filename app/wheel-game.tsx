"use client";

import { useEffect, useRef, useState } from "react";
import { displayName, initials, type Member } from "./members";
import { PageTextEditor } from "./page-text-editor";
import { COLORS, Profile } from "./profile";
import { selectRandomIndex } from "./selection";
import defaultUiText from "./ui-text.json";
import {
  advanceFlapper,
  FLAPPER_SHAPE,
  MIN_PEG_RADIUS,
  MIN_PEG_STROKE,
  PEG_ORBIT_RATIO,
  PEG_RADIUS_RATIO,
  PEG_STROKE_RATIO,
  resolveFlapperAngle,
  segmentIndexAtFlapperTip,
  WHEEL_RADIUS_RATIO,
} from "./flapper-physics.mjs";

const MIN_SPIN_SPEED = 130;
const MAX_SPIN_SPEED = 180;
const FLAPPER_SPRING = 330;
const FLAPPER_DAMPING = 22;
const DEFAULT_FLAPPER_LENGTH = 116;
type WheelScreenText = typeof defaultUiText.wheelScreen;
const pointerDelta = (next: number, previous: number) => (next - previous + 540) % 360 - 180;

export function WheelGame({ onBack, members, copy, presentation, onCopyChange }: { onBack: () => void; members: Member[]; copy: WheelScreenText; presentation: boolean; onCopyChange: (copy: WheelScreenText) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const flapper = useRef<HTMLDivElement>(null);
  // A page load intentionally starts on a different face; subsequent renders reuse this lazy state value.
  const [rotation, setRotation] = useState(() => Math.random() * 360);
  const rotationRef = useRef(rotation);
  const flapperAngleRef = useRef(0);
  const drag = useRef<{ pointerId: number; angle: number; time: number; velocity: number } | null>(null);
  const portraits = useRef(new Map<string, HTMLImageElement>());
  const [flapperAngle, setFlapperAngle] = useState(0);
  const [imagesReady, setImagesReady] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<Member | null>(null);
  const [showFlapperLength, setShowFlapperLength] = useState(false);
  const [flapperLength, setFlapperLength] = useState(DEFAULT_FLAPPER_LENGTH);
  const [editingText, setEditingText] = useState(false);

  useEffect(() => {
    let cancelled = false;
    portraits.current.clear();
    const loaded = members.filter((member) => member.image).map((member) => new Promise<void>((resolve) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => { if (!cancelled) portraits.current.set(member.name, image); resolve(); };
      image.onerror = () => resolve();
      image.src = member.image!;
    }));
    void Promise.all(loaded).then(() => { if (!cancelled) setImagesReady((count) => count + 1); });
    return () => { cancelled = true; };
  }, [members]);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context) return;
    const draw = () => {
      const box = element.getBoundingClientRect();
      const size = Math.max(1, Math.min(box.width, box.height));
      const ratio = window.devicePixelRatio || 1;
      element.width = size * ratio; element.height = size * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0); context.clearRect(0, 0, size, size);
      const center = size / 2, radius = size * WHEEL_RADIUS_RATIO, step = Math.PI * 2 / members.length;
      context.save(); context.translate(center, center); context.rotate((rotation - 90) * Math.PI / 180);
      members.forEach((member, index) => {
        const start = index * step, end = start + step;
        const fill = context.createRadialGradient(0, 0, radius * .1, 0, 0, radius);
        fill.addColorStop(0, COLORS[index % COLORS.length]); fill.addColorStop(1, `${COLORS[(index + 1) % COLORS.length]}c9`);
        context.beginPath(); context.moveTo(0, 0); context.arc(0, 0, radius, start, end); context.closePath();
        context.fillStyle = fill; context.fill(); context.strokeStyle = "rgba(255,255,255,.76)"; context.lineWidth = 1; context.stroke();
        const angle = start + step / 2;
        context.save(); context.rotate(angle); context.translate(radius * .77, 0);
        context.fillStyle = "rgba(255,255,255,.98)"; context.font = `800 ${Math.max(7.4, size * .012)}px Arial, sans-serif`;
        context.textAlign = "right"; context.textBaseline = "middle"; context.shadowColor = "rgba(20,24,61,.3)"; context.shadowBlur = 2;
        context.fillText(displayName(member), 0, 0); context.restore();
        context.save(); context.rotate(angle); context.translate(radius * .86, 0); context.rotate(Math.PI / 2);
        const badge = Math.max(10, size * .020); context.beginPath(); context.arc(0, 0, badge, 0, Math.PI * 2); context.clip();
        const portrait = portraits.current.get(member.name);
        if (portrait) context.drawImage(portrait, -badge, -badge, badge * 2, badge * 2);
        else { context.fillStyle = "rgba(255,255,255,.96)"; context.fillRect(-badge, -badge, badge * 2, badge * 2); context.fillStyle = "#202857"; context.font = `900 ${Math.max(6, size * .012)}px Arial`; context.textAlign = "center"; context.textBaseline = "middle"; context.fillText(initials(displayName(member)), 0, .5); }
        context.restore(); context.save(); context.rotate(angle); context.translate(radius * .86, 0); context.beginPath(); context.arc(0, 0, badge, 0, Math.PI * 2); context.lineWidth = Math.max(2, size * .004); context.strokeStyle = COLORS[index % COLORS.length]; context.stroke(); context.restore();
      });
      context.beginPath(); context.arc(0, 0, radius, 0, Math.PI * 2); context.lineWidth = Math.max(6, size * .013); context.strokeStyle = "#fff"; context.stroke();
      members.forEach((_, index) => {
        // Each sliver is bounded by two pegs on the wheel's outer rim.
        context.save(); context.rotate(index * step); context.translate(radius * PEG_ORBIT_RATIO, 0);
        const peg = Math.max(MIN_PEG_RADIUS, size * PEG_RADIUS_RATIO); context.beginPath(); context.arc(0, 0, peg, 0, Math.PI * 2);
        context.fillStyle = "rgba(255,255,255,.96)"; context.fill(); context.lineWidth = Math.max(MIN_PEG_STROKE, size * PEG_STROKE_RATIO); context.strokeStyle = "rgba(25,29,71,.4)"; context.stroke(); context.restore();
      });
      context.restore();
    };
    draw();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(draw);
      observer.observe(element);
      return () => observer.disconnect();
    }
    globalThis.addEventListener("resize", draw);
    return () => globalThis.removeEventListener("resize", draw);
  }, [rotation, imagesReady, members]);

  const getWheelGeometry = () => {
    const wheelElement = canvas.current, flapperElement = flapper.current;
    if (!wheelElement || !flapperElement) return null;
    const wheelSize = wheelElement.offsetWidth;
    return {
      pivot: { x: flapperElement.offsetLeft, y: flapperElement.offsetTop },
      flapperWidth: flapperElement.offsetWidth,
      flapperHeight: flapperElement.offsetHeight,
      wheelCenter: { x: wheelElement.offsetLeft, y: wheelElement.offsetTop + wheelSize / 2 },
      pegOrbit: wheelSize * WHEEL_RADIUS_RATIO * PEG_ORBIT_RATIO,
      pegRadius: Math.max(MIN_PEG_RADIUS, wheelSize * PEG_RADIUS_RATIO) + Math.max(MIN_PEG_STROKE, wheelSize * PEG_STROKE_RATIO) / 2,
      pegCount: members.length,
    };
  };

  const spin = (slowPreview = false) => {
    if (spinning || !members.length) return;
    setWinner(null); setSpinning(true);
    const geometry = getWheelGeometry();
    if (!geometry) { setSpinning(false); return; }
    const picked = selectRandomIndex(members.length), slice = 360 / members.length;
    // Do not manufacture a center hit: choose a natural position inside the selected sliver.
    const landingOffset = (Math.random() - .5) * slice * .72;
    const target = 360 - (picked * slice + slice / 2 + landingOffset), initial = rotationRef.current;
    // Both controls use the same deliberate one-turn motion profile; the preview simply skips the winner reveal.
    const landing = initial + 360 + ((target - (initial % 360) + 360) % 360);
    const audio = typeof window !== "undefined" && "AudioContext" in window ? new AudioContext() : null;
    const tick = () => {
      if (!audio) return;
      const oscillator = audio.createOscillator(), gain = audio.createGain();
      oscillator.type = "triangle"; oscillator.frequency.value = 720; gain.gain.setValueAtTime(.028, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .028);
      oscillator.connect(gain).connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + .03);
    };
    const initialVelocity = MIN_SPIN_SPEED + Math.random() * (MAX_SPIN_SPEED - MIN_SPIN_SPEED);
    let lastTickSlice = Math.floor(initial / slice), angle = initial, velocity = initialVelocity;
    const initialFlapper = resolveFlapperAngle(0, initial, geometry);
    let flapperAngle = initialFlapper.angle, flapperVelocity = 0;
    flapperAngleRef.current = flapperAngle; setFlapperAngle(flapperAngle);
    const distance = landing - initial;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const duration = reducedMotion ? Math.min(.9, 2 * distance / initialVelocity) : 2 * distance / initialVelocity;
    let previousTime = performance.now(), elapsed = 0;
    const frame = (now: number) => {
      const delta = Math.min(.034, (now - previousTime) / 1000); previousTime = now; elapsed += delta;
      // A quadratic ease-out preserves the initial speed and decelerates continuously to zero.
      // The angle only moves forward, so there is no final spring, overshoot, or corrective lunge.
      const progress = Math.min(1, elapsed / duration);
      const nextAngle = initial + distance * (1 - (1 - progress) ** 2);
      velocity = 2 * distance * (1 - progress) / duration;
      const turn = nextAngle - angle;
      // Small angular substeps prevent a fast-moving circular peg from tunneling through the triangle.
      const physicsSteps = Math.max(1, Math.ceil(Math.abs(turn) / .2)), physicsDelta = delta / physicsSteps;
      for (let step = 1; step <= physicsSteps; step += 1) {
        const wheelAtStep = angle + turn * step / physicsSteps;
        const state = advanceFlapper({ angle: flapperAngle, velocity: flapperVelocity }, wheelAtStep, velocity, physicsDelta, geometry, FLAPPER_SPRING, FLAPPER_DAMPING);
        flapperAngle = state.angle; flapperVelocity = state.velocity;
      }
      angle = nextAngle;
      const currentTickSlice = Math.floor(angle / slice);
      if (currentTickSlice !== lastTickSlice) {
        tick();
        lastTickSlice = currentTickSlice;
      }
      flapperAngleRef.current = flapperAngle; setFlapperAngle(flapperAngle);
      rotationRef.current = angle; setRotation(angle);
      if (progress >= 1) {
        const safeFinalAngle = resolveFlapperAngle(flapperAngle, landing, geometry).angle;
        const finalMemberIndex = segmentIndexAtFlapperTip(safeFinalAngle, landing, geometry);
        rotationRef.current = landing; flapperAngleRef.current = safeFinalAngle; setRotation(landing); setFlapperAngle(safeFinalAngle); setSpinning(false);
        if (!slowPreview) setWinner(members[finalMemberIndex]);
        void audio?.close();
      } else requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  const coastFromDrag = (releaseVelocity: number) => {
    const geometry = getWheelGeometry();
    if (!geometry) return;
    setSpinning(true);
    const slice = 360 / members.length;
    const audio = typeof window !== "undefined" && "AudioContext" in window ? new AudioContext() : null;
    const tick = () => {
      if (!audio) return;
      const oscillator = audio.createOscillator(), gain = audio.createGain();
      oscillator.type = "triangle"; oscillator.frequency.value = 720; gain.gain.setValueAtTime(.028, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .028);
      oscillator.connect(gain).connect(audio.destination); oscillator.start(); oscillator.stop(audio.currentTime + .03);
    };
    let angle = rotationRef.current, velocity = Math.max(-320, Math.min(320, releaseVelocity));
    let flapperAngle = resolveFlapperAngle(flapperAngleRef.current, angle, geometry).angle, flapperVelocity = 0;
    let lastTickSlice = Math.floor(angle / slice), previousTime = performance.now(), elapsed = 0;
    flapperAngleRef.current = flapperAngle; setFlapperAngle(flapperAngle);
    const frame = (now: number) => {
      const delta = Math.min(.034, (now - previousTime) / 1000); previousTime = now; elapsed += delta;
      const friction = 28 + Math.abs(velocity) * .18;
      const nextVelocity = Math.abs(velocity) <= friction * delta ? 0 : velocity - Math.sign(velocity) * friction * delta;
      const turn = (velocity + nextVelocity) * .5 * delta, nextAngle = angle + turn;
      const physicsSteps = Math.max(1, Math.ceil(Math.abs(turn) / .2)), physicsDelta = delta / physicsSteps;
      for (let step = 1; step <= physicsSteps; step += 1) {
        const wheelAtStep = angle + turn * step / physicsSteps;
        const state = advanceFlapper({ angle: flapperAngle, velocity: flapperVelocity }, wheelAtStep, Math.abs(velocity), physicsDelta, geometry, FLAPPER_SPRING, FLAPPER_DAMPING);
        flapperAngle = state.angle; flapperVelocity = state.velocity;
      }
      angle = nextAngle; velocity = nextVelocity;
      const currentTickSlice = Math.floor(angle / slice);
      if (currentTickSlice !== lastTickSlice) { tick(); lastTickSlice = currentTickSlice; }
      rotationRef.current = angle; flapperAngleRef.current = flapperAngle; setRotation(angle); setFlapperAngle(flapperAngle);
      if (Math.abs(velocity) < 1.5 || elapsed > 12) {
        const safeFinalAngle = resolveFlapperAngle(flapperAngle, angle, geometry).angle;
        const finalMemberIndex = segmentIndexAtFlapperTip(safeFinalAngle, angle, geometry);
        rotationRef.current = angle; flapperAngleRef.current = safeFinalAngle; setRotation(angle); setFlapperAngle(safeFinalAngle); setSpinning(false); setWinner(members[finalMemberIndex]);
        void audio?.close();
      } else requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  const pointerAngle = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return Math.atan2(event.clientY - (box.top + box.height / 2), event.clientX - (box.left + box.width / 2)) * 180 / Math.PI;
  };

  const beginWheelDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (spinning) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, angle: pointerAngle(event), time: performance.now(), velocity: 0 };
    setWinner(null);
  };

  const moveWheelDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const activeDrag = drag.current;
    if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
    const now = performance.now(), nextPointerAngle = pointerAngle(event);
    // The flapper is a one-way pawl: reverse drag is resisted instead of sending it through the back of the wedge.
    const turn = Math.max(0, pointerDelta(nextPointerAngle, activeDrag.angle)), elapsed = Math.max(.008, (now - activeDrag.time) / 1000);
    const nextRotation = rotationRef.current + turn, geometry = getWheelGeometry();
    activeDrag.angle = nextPointerAngle; activeDrag.time = now;
    activeDrag.velocity = activeDrag.velocity * .65 + turn / elapsed * .35;
    rotationRef.current = nextRotation; setRotation(nextRotation);
    if (geometry) {
      const safeFlapperAngle = resolveFlapperAngle(flapperAngleRef.current, nextRotation, geometry).angle;
      flapperAngleRef.current = safeFlapperAngle; setFlapperAngle(safeFlapperAngle);
    }
  };

  const endWheelDrag = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const activeDrag = drag.current;
    if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (Math.abs(activeDrag.velocity) >= 30) coastFromDrag(activeDrag.velocity);
  };

  return <main className="experience">
    {!presentation && <button className="game-back" onClick={onBack}>{copy.backButton}</button>}
    <header className="hero"><div className="eyebrow">{!presentation && <button className="copy-edit-dot" onClick={() => setEditingText(true)} aria-label="Edit wheel screen text" title="Edit page text"><span /></button>} {copy.eyebrow}</div><h1>{copy.headlineStart} <em>{copy.headlineEmphasis}</em><br />{copy.headlineEnd}{presentation ? "." : <span className="tuning-wrap"><button className="flapper-toggle" onClick={() => setShowFlapperLength((visible) => !visible)} disabled={spinning} aria-label={copy.flapperToggleLabel} aria-expanded={showFlapperLength} title={copy.flapperToggleTitle}>.</button>{showFlapperLength && <span className="tuning-popover" role="dialog" aria-label={copy.flapperPanelLabel}><b>{copy.flapperPanelHeading}</b><label>{copy.flapperLengthLabel} <output>{flapperLength}px</output><input type="range" min="100" max="188" step="2" value={flapperLength} onChange={(event) => setFlapperLength(Number(event.target.value))} /></label><small>{copy.flapperHelp}</small></span>}</span>}</h1><p>{copy.promptFirstLine}<br />{copy.promptSecondLine}</p></header>
    <section className="wheel-stage" aria-label={copy.wheelLabel}>
      <div ref={flapper} className="pointer" style={{ "--flapper-angle": `${flapperAngle}deg`, height: `${flapperLength}px` } as React.CSSProperties} aria-hidden="true"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><polygon points={FLAPPER_SHAPE.map((point) => `${point.x * 100},${point.y * 100}`).join(" ")} /></svg><span /></div><div className="wheel-shadow" />
      <canvas ref={canvas} className="wheel" aria-label={`Wheel containing ${members.length} ${copy.eligibleSuffix}. ${copy.dragInstruction}`} onPointerDown={beginWheelDrag} onPointerMove={moveWheelDrag} onPointerUp={endWheelDrag} onPointerCancel={endWheelDrag} />
      <div className="hub"><span>✦</span><small>GO</small></div>
    </section>
    <section className="action-panel"><button className="spin-button" onClick={() => spin()} disabled={spinning}>{spinning ? copy.spinningButton : copy.spinButton}<span>→</span></button><p><b>{members.length} {copy.eligibleSuffix}</b></p></section>
    {winner && <WinnerCelebration winner={winner} copy={copy} onDismiss={() => setWinner(null)} />}
    {editingText && <PageTextEditor heading="Edit wheel screen text" value={copy} onSave={onCopyChange} onClose={() => setEditingText(false)}/>}
  </main>;
}

function WinnerCelebration({ winner, copy, onDismiss }: { winner: Member; copy: WheelScreenText; onDismiss: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 5800);
    return () => window.clearTimeout(timer);
  }, [onDismiss, winner]);

  return <div className="winner-layer" aria-live="assertive" aria-label={`Winner: ${displayName(winner)}`}>
    <div className="winner-burst" aria-hidden="true">{Array.from({ length: 42 }, (_, index) => {
      const angle = index * 137.5 * Math.PI / 180;
      const distance = 95 + index % 7 * 19;
      return <i key={index} style={{
        "--tx": `${Math.cos(angle) * distance}px`,
        "--ty": `${Math.sin(angle) * distance}px`,
        "--turn": `${index * 67}deg`,
        "--burst-color": COLORS[index % COLORS.length],
        "--burst-delay": `${index % 6 * .018}s`,
      } as React.CSSProperties} />;
    })}</div>
    {(["left", "right"] as const).map((side) => <div key={side} className={`winner-firework firework-${side}`} aria-hidden="true">
      {Array.from({ length: 14 }, (_, index) => <i key={index} style={{
        "--ray": `${index * 360 / 14}deg`,
        "--ray-color": COLORS[(index + (side === "left" ? 2 : 5)) % COLORS.length],
      } as React.CSSProperties} />)}
    </div>)}
    <section className="winner-float">
      <button className="winner-dismiss" onClick={onDismiss} aria-label={copy.dismissWinnerLabel}>×</button>
      <p>{copy.winnerBanner}</p>
      <Profile member={winner} className="winner-profile" />
      <h2>{displayName(winner)}</h2>
    </section>
  </div>;
}
