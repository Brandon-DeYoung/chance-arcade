export const FLAPPER_SHAPE = Object.freeze([
  { x: 0.08, y: 0 },
  { x: 0.92, y: 0 },
  { x: 0.66, y: 0.73 },
  { x: 0.55, y: 1 },
  { x: 0.45, y: 1 },
  { x: 0.34, y: 0.73 },
]);

export const WHEEL_RADIUS_RATIO = 0.465;
export const PEG_ORBIT_RATIO = 0.985;
export const PEG_RADIUS_RATIO = 0.006;
export const MIN_PEG_RADIUS = 2.5;
export const PEG_STROKE_RATIO = 0.0012;
export const MIN_PEG_STROKE = 0.75;
export const MIN_FLAPPER_ANGLE = -46;
export const MAX_FLAPPER_ANGLE = 4;

const radians = (degrees) => degrees * Math.PI / 180;
const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

export function flapperPolygon(angle, geometry) {
  const turn = radians(angle), cosine = Math.cos(turn), sine = Math.sin(turn);
  return FLAPPER_SHAPE.map((point) => {
    const x = (point.x - 0.5) * geometry.flapperWidth;
    const y = point.y * geometry.flapperHeight;
    return {
      x: geometry.pivot.x + x * cosine - y * sine,
      y: geometry.pivot.y + x * sine + y * cosine,
    };
  });
}

export function flapperTip(angle, geometry) {
  const turn = radians(angle), cosine = Math.cos(turn), sine = Math.sin(turn);
  const x = 0;
  const y = geometry.flapperHeight;
  return {
    x: geometry.pivot.x + x * cosine - y * sine,
    y: geometry.pivot.y + x * sine + y * cosine,
  };
}

export function segmentIndexAtFlapperTip(angle, wheelRotation, geometry) {
  const tip = flapperTip(angle, geometry);
  const screenAngle = Math.atan2(tip.y - geometry.wheelCenter.y, tip.x - geometry.wheelCenter.x) * 180 / Math.PI;
  const wheelAngle = ((screenAngle - wheelRotation + 90) % 360 + 360) % 360;
  return Math.min(geometry.pegCount - 1, Math.floor(wheelAngle / (360 / geometry.pegCount)));
}

export function pegCenter(index, wheelRotation, geometry) {
  const angle = radians(index * 360 / geometry.pegCount + wheelRotation - 90);
  return {
    x: geometry.wheelCenter.x + geometry.pegOrbit * Math.cos(angle),
    y: geometry.wheelCenter.y + geometry.pegOrbit * Math.sin(angle),
  };
}

function pointInsidePolygon(point, polygon) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const a = polygon[index], b = polygon[previous];
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

function distanceToSegmentSquared(point, start, end) {
  const dx = end.x - start.x, dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const amount = lengthSquared === 0 ? 0 : clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
  const x = start.x + amount * dx, y = start.y + amount * dy;
  return (point.x - x) ** 2 + (point.y - y) ** 2;
}

export function circleIntersectsPolygon(center, radius, polygon) {
  if (pointInsidePolygon(center, polygon)) return true;
  const radiusSquared = radius * radius;
  return polygon.some((point, index) => distanceToSegmentSquared(center, point, polygon[(index + 1) % polygon.length]) <= radiusSquared);
}

function nearbyPegIndices(wheelRotation, pegCount) {
  const step = 360 / pegCount;
  const nearest = Math.round(-wheelRotation / step);
  return [-2, -1, 0, 1, 2].map((offset) => ((nearest + offset) % pegCount + pegCount) % pegCount);
}

export function collidingPegIndices(angle, wheelRotation, geometry) {
  const polygon = flapperPolygon(angle, geometry);
  return nearbyPegIndices(wheelRotation, geometry.pegCount).filter((index) =>
    circleIntersectsPolygon(pegCenter(index, wheelRotation, geometry), geometry.pegRadius, polygon));
}

export function resolveFlapperAngle(angle, wheelRotation, geometry) {
  const desired = clamp(angle, MIN_FLAPPER_ANGLE, MAX_FLAPPER_ANGLE);
  const initialHits = collidingPegIndices(desired, wheelRotation, geometry);
  if (initialHits.length === 0) return { angle: desired, contact: false, pegIndices: [] };

  let blocked = desired, clear = desired;
  while (clear > MIN_FLAPPER_ANGLE) {
    clear = Math.max(MIN_FLAPPER_ANGLE, clear - 1);
    if (collidingPegIndices(clear, wheelRotation, geometry).length === 0) break;
    blocked = clear;
  }

  // Refine the first collision-free angle so the visible shapes remain in contact without overlapping.
  for (let iteration = 0; iteration < 8; iteration += 1) {
    const middle = (blocked + clear) / 2;
    if (collidingPegIndices(middle, wheelRotation, geometry).length === 0) clear = middle;
    else blocked = middle;
  }
  return { angle: clear, contact: true, pegIndices: initialHits };
}

export function advanceFlapper(state, wheelRotation, wheelVelocity, delta, geometry, spring, damping) {
  let velocity = state.velocity + (-spring * state.angle - damping * state.velocity) * delta;
  const desiredAngle = clamp(state.angle + velocity * delta, MIN_FLAPPER_ANGLE, MAX_FLAPPER_ANGLE);
  const resolved = resolveFlapperAngle(desiredAngle, wheelRotation, geometry);
  if (resolved.contact) velocity = Math.min(velocity, -Math.min(270, 36 + Math.abs(wheelVelocity) * 0.3));
  if (resolved.angle === MIN_FLAPPER_ANGLE && velocity < 0) velocity = 0;
  return { angle: resolved.angle, velocity, contact: resolved.contact };
}
