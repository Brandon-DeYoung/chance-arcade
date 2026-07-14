import { cloneData } from "./platform";

export type Rail = { id: string; ax: number; ay: number; bx: number; by: number; width: number; color: string; platform?: boolean };
export type Peg = { id: string; x: number; y: number; radius: number; color: string; bounce?: number; kick?: number };
export type Spinner = { id: string; x: number; y: number; length: number; arms: number; speed: number; color?: string };
export type Cannon = { id: string; x: number; y: number; minAngle: number; maxAngle: number; phase: number; delay: number; interval: number; speed: number; distance?: number; color: string };
export type TrackLabel = { id: string; x: number; y: number; text: string };

export type Level = {
  version: 1;
  name: string;
  width: number;
  height: number;
  finishY: number;
  start: { x: number; y: number; outerRadius: number; innerRadius: number };
  background: string;
  rails: Rail[];
  pegs: Peg[];
  spinners: Spinner[];
  cannons: Cannon[];
  labels: TrackLabel[];
};

export type LevelObjectType = "rail" | "peg" | "bumper" | "spinner" | "cannon" | "label";
export type LevelObject = Rail | Peg | Spinner | Cannon | TrackLabel;

export const cloneLevel = (level: Level): Level => cloneData(level);
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const text = (value: unknown, maximum = 120) => typeof value === "string" && value.trim().length > 0 && value.length <= maximum;
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);

function requireNumbers(value: Record<string, unknown>, keys: string[], label: string) {
  for (const key of keys) if (!finite(value[key])) throw new Error(`${label} has an invalid ${key} value.`);
}

function validateObjects<T>(value: unknown, label: string, validator: (entry: Record<string, unknown>, index: number) => void): T[] {
  if (!Array.isArray(value)) throw new Error(`The ${label} collection is missing.`);
  if (value.length > 10_000) throw new Error(`The ${label} collection is too large.`);
  value.forEach((entry, index) => {
    if (!record(entry)) throw new Error(`${label} item ${index + 1} is invalid.`);
    if (!text(entry.id)) throw new Error(`${label} item ${index + 1} needs a valid id.`);
    validator(entry, index);
  });
  return value as T[];
}

export function parseLevel(raw: string): Level {
  let value: unknown;
  try { value = JSON.parse(raw) as unknown; }
  catch { throw new Error("The level is not valid JSON. Check for missing commas or quotation marks."); }
  if (!record(value)) throw new Error("The level file must contain a JSON object.");
  if (value.version !== 1) throw new Error("This level file uses an unsupported version.");
  if (!text(value.name)) throw new Error("The level needs a name shorter than 120 characters.");
  requireNumbers(value, ["width", "height", "finishY"], "The level");
  if ((value.width as number) < 500 || (value.width as number) > 10_000) throw new Error("The level width must be between 500 and 10,000 pixels.");
  if ((value.height as number) < 1_200 || (value.height as number) > 100_000) throw new Error("The level height must be between 1,200 and 100,000 pixels.");
  if ((value.finishY as number) <= 0 || (value.finishY as number) > (value.height as number) + 100) throw new Error("The finish line must be inside the level.");
  if (!record(value.start)) throw new Error("The start chamber is invalid.");
  requireNumbers(value.start, ["x", "y", "outerRadius", "innerRadius"], "The start chamber");
  if ((value.start.outerRadius as number) <= 0 || (value.start.innerRadius as number) < 0 || (value.start.innerRadius as number) > (value.start.outerRadius as number)) throw new Error("The start chamber radii are invalid.");
  if (!text(value.background, 64)) throw new Error("The level background color is invalid.");

  const rails = validateObjects<Rail>(value.rails, "rails", (entry, index) => {
    requireNumbers(entry, ["ax", "ay", "bx", "by", "width"], `Rail ${index + 1}`);
    if ((entry.width as number) <= 0 || !text(entry.color, 64)) throw new Error(`Rail ${index + 1} has invalid styling.`);
  });
  const pegs = validateObjects<Peg>(value.pegs, "pegs", (entry, index) => {
    requireNumbers(entry, ["x", "y", "radius"], `Peg ${index + 1}`);
    if ((entry.radius as number) <= 0 || !text(entry.color, 64)) throw new Error(`Peg ${index + 1} has invalid styling.`);
    if (entry.bounce !== undefined && !finite(entry.bounce)) throw new Error(`Peg ${index + 1} has an invalid bounce value.`);
    if (entry.kick !== undefined && !finite(entry.kick)) throw new Error(`Peg ${index + 1} has an invalid kick value.`);
  });
  const spinners = validateObjects<Spinner>(value.spinners, "spinners", (entry, index) => {
    requireNumbers(entry, ["x", "y", "length", "arms", "speed"], `Spinner ${index + 1}`);
    if ((entry.length as number) <= 0 || !Number.isInteger(entry.arms) || (entry.arms as number) < 1 || (entry.arms as number) > 32) throw new Error(`Spinner ${index + 1} has invalid dimensions.`);
  });
  const cannons = validateObjects<Cannon>(value.cannons, "cannons", (entry, index) => {
    requireNumbers(entry, ["x", "y", "minAngle", "maxAngle", "phase", "delay", "interval", "speed"], `Cannon ${index + 1}`);
    if ((entry.interval as number) <= 0 || (entry.speed as number) <= 0 || !text(entry.color, 64)) throw new Error(`Cannon ${index + 1} has invalid firing settings.`);
    if (entry.distance !== undefined && (!finite(entry.distance) || entry.distance <= 0)) throw new Error(`Cannon ${index + 1} has an invalid distance.`);
  });
  const labels = validateObjects<TrackLabel>(value.labels, "labels", (entry, index) => {
    requireNumbers(entry, ["x", "y"], `Label ${index + 1}`);
    if (!text(entry.text, 200)) throw new Error(`Label ${index + 1} needs text shorter than 200 characters.`);
  });

  const ids = new Set<string>();
  for (const object of [...rails, ...pegs, ...spinners, ...cannons, ...labels]) {
    if (ids.has(object.id)) throw new Error(`Duplicate level object id: ${object.id}`);
    ids.add(object.id);
  }
  return cloneData({ ...value, rails, pegs, spinners, cannons, labels }) as Level;
}

export const objectKind = (object: LevelObject): LevelObjectType => {
  if ("ax" in object) return "rail";
  if ("radius" in object) return object.kick ? "bumper" : "peg";
  if ("arms" in object) return "spinner";
  if ("minAngle" in object) return "cannon";
  return "label";
};

export const levelObjects = (level: Level): LevelObject[] => [...level.rails, ...level.pegs, ...level.spinners, ...level.cannons, ...level.labels];
