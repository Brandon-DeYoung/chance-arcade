import { displayName, initials, type Member } from "./members";
import { BALL_RADIUS, cannonAngle, spinnerAngle, type Ball, type RuntimeTrack } from "./physics";
import type { Cannon, Level, LevelObject } from "./level-types";

type Viewport = { top: number; bottom: number };
const portraitSizes = new WeakMap<HTMLImageElement, { width: number; height: number }>();
let ballShine: HTMLCanvasElement | null = null;

const isVisible = (y: number, radius: number, viewport?: Viewport) => !viewport || (y + radius >= viewport.top && y - radius <= viewport.bottom);

export function drawBackground(context: CanvasRenderingContext2D, level: Level, cameraY: number, viewHeight: number) {
  context.fillStyle = level.background;
  context.fillRect(0, cameraY, level.width, viewHeight);
  context.fillStyle = "rgba(255,255,255,.64)";
  for (let index = 0; index < 32; index += 1) {
    const x = 90 + (index * 283) % (level.width - 80);
    const y = 100 + (index * 467) % level.height;
    if (y < cameraY - 80 || y > cameraY + viewHeight + 80) continue;
    context.beginPath();
    context.arc(x, y, 25, 0, Math.PI * 2);
    context.arc(x + 28, y + 4, 20, 0, Math.PI * 2);
    context.arc(x - 25, y + 8, 17, 0, Math.PI * 2);
    context.fill();
  }
}

export function drawTrack(context: CanvasRenderingContext2D, track: RuntimeTrack | Level, elapsed: number, selectedId?: string, viewport?: Viewport) {
  context.lineCap = "round";
  context.lineJoin = "round";
  for (const rail of track.rails) {
    if (viewport && Math.max(rail.ay, rail.by) + rail.width < viewport.top) continue;
    if (viewport && Math.min(rail.ay, rail.by) - rail.width > viewport.bottom) continue;
    const selected = rail.id === selectedId;
    if (rail.platform) {
      context.fillStyle = selected ? "#fff" : "#171b31";
      context.fillRect(rail.ax - 8, rail.ay - 8, 16, 16);
      context.fillStyle = rail.color;
      context.fillRect(rail.ax - 5, rail.ay - 5, 10, 10);
      continue;
    }
    context.strokeStyle = selected ? "#fff" : "#171b31";
    context.lineWidth = rail.width + (selected ? 18 : 10);
    context.beginPath();
    context.moveTo(rail.ax, rail.ay);
    context.lineTo(rail.bx, rail.by);
    context.stroke();
    context.strokeStyle = rail.color;
    context.lineWidth = rail.width;
    context.stroke();
  }
  for (const peg of track.pegs) {
    if (!isVisible(peg.y, peg.radius + 10, viewport)) continue;
    context.fillStyle = peg.id === selectedId ? "#fff" : "#171b31";
    context.beginPath();
    context.arc(peg.x, peg.y, peg.radius + (peg.id === selectedId ? 10 : 5), 0, Math.PI * 2);
    context.fill();
    context.fillStyle = peg.color;
    context.beginPath();
    context.arc(peg.x, peg.y, peg.radius, 0, Math.PI * 2);
    context.fill();
  }
  for (const spinner of track.spinners) {
    if (!isVisible(spinner.y, spinner.length + 40, viewport)) continue;
    context.save();
    context.translate(spinner.x, spinner.y);
    for (let arm = 0; arm < spinner.arms; arm += 1) {
      const angle = spinnerAngle(spinner, elapsed, arm);
      context.save();
      context.rotate(angle);
      context.strokeStyle = spinner.id === selectedId ? "#fff" : "#171b31";
      context.lineWidth = spinner.id === selectedId ? 36 : 28;
      context.beginPath();
      context.moveTo(0, 0);
      context.lineTo(spinner.length, 0);
      context.stroke();
      context.strokeStyle = spinner.color ?? "#ff5b70";
      context.lineWidth = 18;
      context.stroke();
      context.restore();
    }
    context.fillStyle = "#ffd052";
    context.beginPath();
    context.arc(0, 0, 34, 0, Math.PI * 2);
    context.fill();
    context.lineWidth = 8;
    context.strokeStyle = "#171b31";
    context.stroke();
    context.restore();
  }
  for (const cannon of track.cannons) {
    if (isVisible(cannon.y, 100, viewport)) drawCannon(context, cannon, cannonAngle(cannon, elapsed), cannon.id === selectedId);
  }
  if ("projectiles" in track) {
    for (const projectile of track.projectiles) {
      if (!isVisible(projectile.y, 30, viewport)) continue;
      context.save();
      context.translate(projectile.x, projectile.y);
      context.rotate(Math.atan2(projectile.vy, projectile.vx));
      context.fillStyle = "#171b31";
      context.fillRect(-15, -9, 30, 18);
      context.fillStyle = "#fff";
      context.fillRect(-12, -6, 24, 12);
      context.fillStyle = projectile.color;
      context.fillRect(-7, -10, 7, 20);
      context.fillRect(2, -10, 7, 20);
      context.restore();
    }
  }
  if (isVisible(track.finishY, 70, viewport)) {
    context.fillStyle = "#13c95b";
    context.strokeStyle = "#171b31";
    context.lineWidth = 8;
    context.fillRect(95, track.finishY, track.width - 190, 16);
    context.strokeRect(95, track.finishY, track.width - 190, 16);
    context.fillStyle = "#171b31";
    context.font = "900 30px Arial";
    context.textAlign = "center";
    context.fillText("FINISH", track.width / 2, track.finishY + 62);
    context.textAlign = "left";
  }
  for (const label of track.labels) {
    if (!isVisible(label.y, 35, viewport)) continue;
    context.fillStyle = label.id === selectedId ? "#fff" : "#171b31";
    context.font = "900 22px Arial";
    context.fillText(label.text, label.x, label.y);
  }
}

function drawCannon(context: CanvasRenderingContext2D, cannon: Cannon, angle: number, selected = false) {
  context.save();
  context.translate(cannon.x, cannon.y);
  if (selected) {
    context.fillStyle = "#fff";
    context.beginPath();
    context.arc(0, 7, 40, 0, Math.PI * 2);
    context.fill();
  }
  context.fillStyle = "#171b31";
  context.beginPath();
  context.arc(0, 7, 30, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#ffd052";
  context.beginPath();
  context.arc(0, 7, 20, 0, Math.PI * 2);
  context.fill();
  context.rotate(angle);
  context.fillStyle = "#171b31";
  context.fillRect(-8, -18, 77, 36);
  context.fillStyle = cannon.color;
  context.fillRect(-3, -12, 68, 24);
  context.beginPath();
  context.moveTo(60, -21);
  context.lineTo(82, -14);
  context.lineTo(82, 14);
  context.lineTo(60, 21);
  context.closePath();
  context.fillStyle = "#171b31";
  context.fill();
  context.fillStyle = "#fff";
  context.font = "900 10px Arial";
  context.textAlign = "center";
  context.fillText("TEE", 30, 4);
  context.restore();
}

function getBallShine() {
  if (ballShine || typeof document === "undefined") return ballShine;
  const size = BALL_RADIUS * 2;
  ballShine = document.createElement("canvas");
  ballShine.width = size;
  ballShine.height = size;
  const context = ballShine.getContext("2d");
  if (!context) return null;
  const center = BALL_RADIUS;
  const shine = context.createRadialGradient(center - 7, center - 8, 1, center, center, BALL_RADIUS);
  shine.addColorStop(0, "rgba(255,255,255,.82)");
  shine.addColorStop(.24, "rgba(255,255,255,.12)");
  shine.addColorStop(.72, "rgba(255,255,255,0)");
  shine.addColorStop(1, "rgba(15,20,45,.48)");
  context.fillStyle = shine;
  context.beginPath();
  context.arc(center, center, BALL_RADIUS - 1, 0, Math.PI * 2);
  context.fill();
  return ballShine;
}

export function drawBall(context: CanvasRenderingContext2D, ball: Ball, member: Member, color: string, portrait?: HTMLImageElement, showLabel = false) {
  context.save();
  context.translate(ball.x, ball.y);
  context.rotate(ball.angle);
  context.fillStyle = color;
  context.beginPath();
  context.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
  context.fill();
  context.save();
  context.beginPath();
  context.arc(0, 0, BALL_RADIUS - 2, 0, Math.PI * 2);
  context.clip();
  if (portrait) {
    let size = portraitSizes.get(portrait);
    if (!size) {
      const scale = Math.max(BALL_RADIUS * 2 / portrait.naturalWidth, BALL_RADIUS * 2 / portrait.naturalHeight);
      size = { width: portrait.naturalWidth * scale, height: portrait.naturalHeight * scale };
      portraitSizes.set(portrait, size);
    }
    context.drawImage(portrait, -size.width / 2, -size.height / 2, size.width, size.height);
  } else {
    context.fillStyle = color;
    context.fillRect(-BALL_RADIUS, -BALL_RADIUS, BALL_RADIUS * 2, BALL_RADIUS * 2);
    context.fillStyle = "#fff";
    context.font = "900 9px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(initials(displayName(member)), 0, 1);
  }
  context.restore();
  context.lineWidth = 3;
  context.strokeStyle = "#fff";
  context.beginPath();
  context.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
  context.stroke();
  context.restore();
  const shine = getBallShine();
  if (shine) context.drawImage(shine, ball.x - BALL_RADIUS, ball.y - BALL_RADIUS);
  if (showLabel || ball.y > 340) {
    const label = displayName(member).split(" ")[0];
    context.font = "800 11px Arial";
    const width = context.measureText(label).width + 10;
    context.fillStyle = "#11162dcc";
    context.fillRect(ball.x - width / 2, ball.y - 37, width, 17);
    context.fillStyle = "#fff";
    context.textAlign = "center";
    context.fillText(label, ball.x, ball.y - 25);
  }
}

export function objectPosition(object: LevelObject) {
  if ("ax" in object) return { x: (object.ax + object.bx) / 2, y: (object.ay + object.by) / 2 };
  return { x: object.x, y: object.y };
}
