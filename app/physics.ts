import type { Cannon, Level, Peg, Rail, Spinner } from "./level-types";

export const BALL_RADIUS = 16;

export type Ball = { id: number; slot: number; x: number; y: number; vx: number; vy: number; angle: number; omega: number; finished: boolean; cannonBoost?: number };
export type Projectile = { x: number; y: number; vx: number; vy: number; angle: number; travelled: number; maxDistance: number; color: string };
type CollisionIndex = { cellSize: number; rails: Map<string, number[]>; pegs: Map<string, number[]> };
export type RuntimeTrack = Level & { projectiles: Projectile[]; cannonState: { lastElapsed: number; nextShots: number[] }; collisionIndex: CollisionIndex };
export type WaitingRing = { radius: number; startSlot: number; count: number; direction: 1 | -1; speed: number };

const STATIC_CELL_SIZE = 256;
const BALL_PAIR_CELL_SIZE = 96;
const waitingLayoutCache = new Map<string, WaitingRing[]>();

const cellKey = (x: number, y: number, size: number) => `${Math.floor(x / size)},${Math.floor(y / size)}`;

function addBounds(index: Map<string, number[]>, itemIndex: number, left: number, top: number, right: number, bottom: number, cellSize: number) {
  const startX = Math.floor(left / cellSize), endX = Math.floor(right / cellSize);
  const startY = Math.floor(top / cellSize), endY = Math.floor(bottom / cellSize);
  for (let x = startX; x <= endX; x += 1) for (let y = startY; y <= endY; y += 1) {
    const key = `${x},${y}`;
    const entries = index.get(key);
    if (entries) entries.push(itemIndex);
    else index.set(key, [itemIndex]);
  }
}

function createCollisionIndex(level: Level): CollisionIndex {
  const rails = new Map<string, number[]>(), pegs = new Map<string, number[]>();
  level.rails.forEach((rail, index) => {
    const margin = BALL_RADIUS + rail.width / 2;
    addBounds(rails, index, Math.min(rail.ax, rail.bx) - margin, Math.min(rail.ay, rail.by) - margin, Math.max(rail.ax, rail.bx) + margin, Math.max(rail.ay, rail.by) + margin, STATIC_CELL_SIZE);
  });
  level.pegs.forEach((peg, index) => {
    const margin = BALL_RADIUS + peg.radius;
    addBounds(pegs, index, peg.x - margin, peg.y - margin, peg.x + margin, peg.y + margin, STATIC_CELL_SIZE);
  });
  return { cellSize: STATIC_CELL_SIZE, rails, pegs };
}

export function createRuntimeTrack(level: Level): RuntimeTrack {
  const copy = structuredClone(level) as RuntimeTrack;
  copy.projectiles = [];
  copy.cannonState = { lastElapsed: 0, nextShots: copy.cannons.map((cannon) => cannon.delay) };
  copy.collisionIndex = createCollisionIndex(copy);
  return copy;
}

export function createBalls(count: number, level: Level, random = Math.random): Ball[] {
  const slots = Array.from({ length: count }, (_, index) => index);
  for (let index = slots.length - 1; index > 0; index -= 1) { const swap = Math.floor(random() * (index + 1)); [slots[index], slots[swap]] = [slots[swap], slots[index]]; }
  return slots.map((slot, index) => ({ id: index, slot, x: level.start.x, y: level.start.y, vx: 0, vy: 0, angle: random() * Math.PI * 2, omega: 0, finished: false }));
}

export function waitingRingLayout(count: number, level: Level): WaitingRing[] {
  if (count <= 0) return [];
  const cacheKey = `${count}:${level.width}:${level.start.x}:${level.start.y}:${level.start.innerRadius}:${level.start.outerRadius}`;
  const cached = waitingLayoutCache.get(cacheKey);
  if (cached) return cached;
  const spacing = BALL_RADIUS * 2 + 3;
  const innerRadius = Math.max(BALL_RADIUS + 4, level.start.innerRadius);
  const edgeRadius = Math.min(level.start.x, level.width - level.start.x, level.start.y) - BALL_RADIUS - 4;
  const normalOuterRadius = Math.max(innerRadius, Math.min(level.start.outerRadius, edgeRadius));
  const expandedOuterRadius = Math.max(normalOuterRadius, edgeRadius);
  const maxRingCount = Math.max(1, Math.floor((expandedOuterRadius - innerRadius) / spacing) + 1);
  const capacity = (radius: number) => Math.max(1, Math.floor(Math.PI / Math.asin(Math.min(1, spacing / (2 * radius)))));
  let radii = [normalOuterRadius];
  for (let ringCount = 1; ringCount <= maxRingCount; ringCount += 1) {
    const outerRadius = ringCount === maxRingCount ? expandedOuterRadius : normalOuterRadius;
    const candidate = ringCount === 1
      ? [normalOuterRadius]
      : Array.from({ length: ringCount }, (_, index) => innerRadius + (outerRadius - innerRadius) * index / (ringCount - 1));
    radii = candidate;
    if (candidate.reduce((total, radius) => total + capacity(radius), 0) >= count) break;
  }
  const capacities = radii.map(capacity), totalCapacity = capacities.reduce((total, value) => total + value, 0);
  const exactCounts = capacities.map((value) => count * value / totalCapacity);
  const counts = exactCounts.map(Math.floor);
  const remaining = count - counts.reduce((total, value) => total + value, 0);
  const remainderOrder = exactCounts.map((value, index) => ({ index, remainder: value - counts[index] })).sort((a, b) => b.remainder - a.remainder);
  for (let index = 0; index < remaining; index += 1) counts[remainderOrder[index % remainderOrder.length].index] += 1;
  let startSlot = 0;
  const layout = radii.map((radius, index) => {
    const ring: WaitingRing = { radius, startSlot, count: counts[index], direction: (radii.length - 1 - index) % 2 === 0 ? 1 : -1, speed: .34 + index * .09 };
    startSlot += ring.count;
    return ring;
  });
  waitingLayoutCache.set(cacheKey, layout);
  return layout;
}

const ringForSlot = (rings: WaitingRing[], slot: number) => rings.find((ring) => slot >= ring.startSlot && slot < ring.startSlot + ring.count) ?? rings[rings.length - 1];

export function positionWaitingBalls(balls: Ball[], level: Level, elapsed: number) {
  const rings = waitingRingLayout(balls.length, level);
  for (const ball of balls) {
    const ring = ringForSlot(rings, ball.slot), index = ball.slot - ring.startSlot;
    const angle = index * Math.PI * 2 / Math.max(1, ring.count) + ring.startSlot * 2.399963 + elapsed * ring.direction * ring.speed;
    ball.x = level.start.x + Math.cos(angle) * ring.radius; ball.y = level.start.y + Math.sin(angle) * ring.radius; ball.vx = 0; ball.vy = 0; ball.angle = elapsed * ring.direction * .8;
  }
}

export function releaseWaitingBalls(balls: Ball[], level: Level) {
  const rings = waitingRingLayout(balls.length, level);
  for (const ball of balls) { const dx = ball.x - level.start.x, dy = ball.y - level.start.y, direction = ringForSlot(rings, ball.slot).direction; ball.vx = -dy * direction * .34; ball.vy = Math.max(35, dx * direction * .16 + 55); ball.omega = direction * 2.4; }
}

const closestPoint = (ball: Ball, rail: Pick<Rail,"ax"|"ay"|"bx"|"by"|"width">) => {
  const dx = rail.bx - rail.ax, dy = rail.by - rail.ay, lengthSq = dx * dx + dy * dy;
  const amount = lengthSq ? Math.max(0, Math.min(1, ((ball.x - rail.ax) * dx + (ball.y - rail.ay) * dy) / lengthSq)) : 0;
  return { x: rail.ax + dx * amount, y: rail.ay + dy * amount };
};

function collideRail(ball: Ball, rail: Pick<Rail,"ax"|"ay"|"bx"|"by"|"width">, surfaceVx = 0, surfaceVy = 0) {
  const point = closestPoint(ball, rail), dx = ball.x - point.x, dy = ball.y - point.y, minimum = BALL_RADIUS + rail.width / 2, distanceSq = dx * dx + dy * dy;
  if (distanceSq >= minimum * minimum) return;
  const distance = Math.sqrt(distanceSq) || .001, nx = dx / distance, ny = dy / distance, overlap = minimum - distance;
  ball.x += nx * overlap; ball.y += ny * overlap;
  const relativeX = ball.vx - surfaceVx, relativeY = ball.vy - surfaceVy, normalSpeed = relativeX * nx + relativeY * ny;
  if (normalSpeed < 0) { const impulse = -1.42 * normalSpeed; ball.vx += nx * impulse; ball.vy += ny * impulse; }
  const tangentSpeed = relativeX * -ny + relativeY * nx; ball.vx -= -ny * tangentSpeed * .004; ball.vy -= nx * tangentSpeed * .004; ball.omega += (tangentSpeed / BALL_RADIUS - ball.omega) * .24;
}

function collidePeg(ball: Ball, peg: Peg) {
  const dx = ball.x - peg.x, dy = ball.y - peg.y, minimum = BALL_RADIUS + peg.radius, distanceSq = dx * dx + dy * dy;
  if (distanceSq >= minimum * minimum) return;
  const distance = Math.sqrt(distanceSq) || .001, nx = dx / distance, ny = dy / distance, overlap = minimum - distance;
  ball.x += nx * overlap; ball.y += ny * overlap;
  const speed = ball.vx * nx + ball.vy * ny;
  if (speed < 0) { const bounce = peg.bounce ?? 1.5; ball.vx -= nx * speed * bounce; ball.vy -= ny * speed * bounce; }
  if (peg.kick) { ball.vx += nx * peg.kick; ball.vy += ny * peg.kick; }
  const tangentSpeed = ball.vx * -ny + ball.vy * nx; ball.omega += (tangentSpeed / BALL_RADIUS - ball.omega) * .18;
}

function collideBalls(a: Ball, b: Ball) {
  const dx = b.x - a.x, dy = b.y - a.y, minimum = BALL_RADIUS * 2, distanceSq = dx * dx + dy * dy;
  if (!distanceSq || distanceSq >= minimum * minimum) return;
  const distance = Math.sqrt(distanceSq), nx = dx / distance, ny = dy / distance, overlap = (minimum - distance) / 2;
  a.x -= nx * overlap; a.y -= ny * overlap; b.x += nx * overlap; b.y += ny * overlap;
  const speed = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (speed < 0) { const impulse = speed * .72; a.vx += nx * impulse; a.vy += ny * impulse; b.vx -= nx * impulse; b.vy -= ny * impulse; }
}

function collideBallPairs(balls: Ball[]) {
  const grid = new Map<string, number[]>();
  for (let index = 0; index < balls.length; index += 1) {
    const key = cellKey(balls[index].x, balls[index].y, BALL_PAIR_CELL_SIZE);
    const entries = grid.get(key);
    if (entries) entries.push(index);
    else grid.set(key, [index]);
  }
  for (let first = 0; first < balls.length; first += 1) {
    const ball = balls[first], cellX = Math.floor(ball.x / BALL_PAIR_CELL_SIZE), cellY = Math.floor(ball.y / BALL_PAIR_CELL_SIZE);
    const candidates: number[] = [];
    for (let x = cellX - 1; x <= cellX + 1; x += 1) for (let y = cellY - 1; y <= cellY + 1; y += 1) {
      const entries = grid.get(`${x},${y}`);
      if (entries) for (const second of entries) if (second > first) candidates.push(second);
    }
    candidates.sort((a, b) => a - b);
    for (const second of candidates) collideBalls(ball, balls[second]);
  }
}

export const spinnerAngle = (spinner: Spinner, elapsed: number, arm = 0) => elapsed * spinner.speed + arm * Math.PI * 2 / spinner.arms;
export function cannonAngle(cannon: Cannon, elapsed: number) { const sweep = (Math.sin(elapsed * .72 + cannon.phase) + 1) / 2; return cannon.minAngle + (cannon.maxAngle - cannon.minAngle) * sweep; }

function stepCannons(track: RuntimeTrack, balls: Ball[], dt: number, elapsed: number) {
  if (elapsed < track.cannonState.lastElapsed) { track.projectiles.length = 0; track.cannonState = { lastElapsed: 0, nextShots: track.cannons.map((cannon) => cannon.delay) }; }
  track.cannonState.lastElapsed = elapsed;
  track.cannons.forEach((cannon, index) => {
    while (elapsed >= track.cannonState.nextShots[index]) { const angle = cannonAngle(cannon, elapsed), cos = Math.cos(angle), sin = Math.sin(angle); track.projectiles.push({ x:cannon.x+cos*72,y:cannon.y+sin*72,vx:cos*cannon.speed,vy:sin*cannon.speed,angle,travelled:0,maxDistance:cannon.distance??2700,color:cannon.color }); track.cannonState.nextShots[index] += cannon.interval; }
  });
  for (const projectile of track.projectiles) { projectile.vy += 110 * dt; projectile.x += projectile.vx * dt; projectile.y += projectile.vy * dt; projectile.travelled += Math.hypot(projectile.vx,projectile.vy)*dt; for (const ball of balls) { const dx=ball.x-projectile.x,dy=ball.y-projectile.y,minimum=BALL_RADIUS+13; if(dx*dx+dy*dy>=minimum*minimum) continue; ball.vx+=projectile.vx*1.05;ball.vy+=projectile.vy*1.05;ball.omega+=projectile.vx/BALL_RADIUS*.12;ball.cannonBoost=.65;projectile.travelled=projectile.maxDistance;break; } }
  track.projectiles = track.projectiles.filter((projectile) => projectile.travelled < projectile.maxDistance);
}

export function stepPhysics(balls: Ball[], track: RuntimeTrack, dt: number, elapsed: number) {
  stepCannons(track, balls, dt, elapsed);
  for (const ball of balls) {
    ball.vy += 720 * dt; ball.vx *= .999; ball.vy *= .9996;
    if ((ball.cannonBoost ?? 0) > 0) ball.cannonBoost = Math.max(0, (ball.cannonBoost ?? 0) - dt);
    const maxSpeed = (ball.cannonBoost ?? 0) > 0 ? 1450 : 980, speed = Math.hypot(ball.vx, ball.vy); if (speed > maxSpeed) { ball.vx *= maxSpeed / speed; ball.vy *= maxSpeed / speed; }
    ball.omega *= .9997; ball.x += ball.vx * dt; ball.y += ball.vy * dt; ball.angle += ball.omega * dt;
    const key = cellKey(ball.x, ball.y, track.collisionIndex.cellSize);
    for (const index of track.collisionIndex.rails.get(key) ?? []) collideRail(ball, track.rails[index]);
    for (const index of track.collisionIndex.pegs.get(key) ?? []) collidePeg(ball, track.pegs[index]);
    for (const spinner of track.spinners) for (let arm=0;arm<spinner.arms;arm+=1) { const angle=spinnerAngle(spinner,elapsed,arm),cos=Math.cos(angle),sin=Math.sin(angle),rail={ax:spinner.x,ay:spinner.y,bx:spinner.x+cos*spinner.length,by:spinner.y+sin*spinner.length,width:18}; const point=closestPoint(ball,rail),rx=point.x-spinner.x,ry=point.y-spinner.y;collideRail(ball,rail,-ry*spinner.speed,rx*spinner.speed); }
    if (!ball.finished && ball.y > track.finishY) ball.finished = true;
    if (ball.y > track.height + 100) { if (ball.finished) { ball.y = track.height + 100; ball.vx = 0; ball.vy = 0; } else { ball.x = track.start.x; ball.y = Math.max(track.start.y, track.height - 700); ball.vx = 0; ball.vy = 0; } }
  }
  collideBallPairs(balls);
}

export const leadingBall = (balls: Ball[]) => balls.filter((ball) => !ball.finished).reduce<Ball|null>((leader,ball)=>!leader||ball.y>leader.y?ball:leader,null);
export function nudgeBalls(balls: Ball[], random=Math.random){for(const ball of balls)if(!ball.finished&&Math.hypot(ball.vx,ball.vy)<55){ball.vx+=(random()-.5)*260;ball.vy-=120+random()*120;}}
