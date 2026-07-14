export type Member = {
  name: string;
  nickname?: string;
  image?: string;
};

export type RosterEntry = Member & { eligible: boolean };
export type ParsedRoster = { members: Member[]; excluded: Set<string> };

export const MAX_RACE_MARBLES = 100;
export const MAX_ROSTER_MEMBERS = 100;

export const RANDOM_NAME_PARTS = [
  "Abbott", "Avery", "Bailey", "Barrett", "Beckett", "Bellamy", "Blair", "Blake", "Brooks",
  "Cameron", "Carson", "Carter", "Casey", "Chase", "Cooper", "Dallas", "Davis", "Ellis",
  "Emerson", "Finley", "Flynn", "Gordon", "Graham", "Grant", "Gray", "Harper", "Hayes",
  "Hunter", "Jordan", "Kendall", "Kennedy", "Lane", "Lee", "Lennon", "Lincoln", "Logan",
  "Mason", "Miller", "Morgan", "Palmer", "Parker", "Quinn", "Reed", "Reese", "Riley",
  "Rowan", "Taylor", "Vance", "Walker", "West",
] as const;

export const PLACEHOLDER_PORTRAITS = [
  "/portraits/avatar-blue.svg",
  "/portraits/avatar-coral.svg",
  "/portraits/avatar-gold.svg",
  "/portraits/avatar-green.svg",
  "/portraits/avatar-purple.svg",
  "/portraits/avatar-teal.svg",
] as const;

export function createRandomMember(existing: Member[], random: () => number = Math.random): Member {
  const existingNames = new Set(existing.map((member) => member.name.trim().toLocaleLowerCase()));
  const availableNames: string[] = [];
  for (const first of RANDOM_NAME_PARTS) {
    for (const last of RANDOM_NAME_PARTS) {
      if (first === last) continue;
      const fullName = `${first} ${last}`;
      if (!existingNames.has(fullName.toLocaleLowerCase())) availableNames.push(fullName);
    }
  }
  if (!availableNames.length) throw new Error("Every generated name combination is already in the roster.");
  const nameIndex = Math.min(availableNames.length - 1, Math.floor(Math.max(0, random()) * availableNames.length));
  const portraitIndex = Math.min(PLACEHOLDER_PORTRAITS.length - 1, Math.floor(Math.max(0, random()) * PLACEHOLDER_PORTRAITS.length));
  return { name: availableNames[nameIndex], image: PLACEHOLDER_PORTRAITS[portraitIndex] };
}

export function buildRaceRoster(members: Member[], requestedCount: number): Member[] {
  const count = Math.max(1, Math.min(MAX_RACE_MARBLES, Math.round(requestedCount)));
  const racers = members.slice(0, count);
  while (racers.length < count) racers.push({ name: `Test Marble ${racers.length + 1}` });
  return racers;
}

function parseJson(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new Error("The roster is not valid JSON. Check for missing commas or quotation marks.");
  }
}

export function parseRosterDocument(raw: string): ParsedRoster {
  const parsed = parseJson(raw);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && "version" in parsed) {
    const version = (parsed as { version?: unknown }).version;
    if (version !== 1) throw new Error("This roster file uses an unsupported version.");
  }

  const rows = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && "members" in parsed
      ? (parsed as { members: unknown }).members
      : null;

  if (!Array.isArray(rows) || !rows.length) {
    throw new Error("The roster must contain at least one person.");
  }
  if (rows.length > MAX_ROSTER_MEMBERS) {
    throw new Error(`The roster supports up to ${MAX_ROSTER_MEMBERS} people.`);
  }

  const excluded = new Set<string>();
  const members = rows.map((row, index): Member => {
    if (typeof row === "string") {
      const name = row.trim();
      if (!name) throw new Error(`Roster row ${index + 1} needs a name.`);
      if (name.length > 120) throw new Error(`Roster row ${index + 1} has a name longer than 120 characters.`);
      return { name };
    }
    if (!row || typeof row !== "object") throw new Error(`Roster row ${index + 1} is invalid.`);
    const entry = row as Record<string, unknown>;
    const name = typeof entry.name === "string" ? entry.name.trim() : "";
    if (!name) throw new Error(`Roster row ${index + 1} needs a name.`);
    if (name.length > 120) throw new Error(`Roster row ${index + 1} has a name longer than 120 characters.`);
    const nickname = typeof entry.nickname === "string" && entry.nickname.trim() ? entry.nickname.trim() : undefined;
    const image = typeof entry.image === "string" && entry.image.trim() ? entry.image.trim() : undefined;
    if (nickname && nickname.length > 80) throw new Error(`Roster row ${index + 1} has a nickname longer than 80 characters.`);
    if (image && image.length > 2_048) throw new Error(`Roster row ${index + 1} has an image path that is too long.`);
    if (entry.eligible === false) excluded.add(name);
    return { name, nickname, image };
  });

  const names = new Set<string>();
  for (const member of members) {
    const key = member.name.toLocaleLowerCase();
    if (names.has(key)) throw new Error(`Duplicate roster name: ${member.name}`);
    names.add(key);
  }
  return { members, excluded };
}

export function parseRoster(raw: string): Member[] {
  return parseRosterDocument(raw).members;
}

export function serializeRoster(members: Member[], excluded = new Set<string>()): string {
  const entries: RosterEntry[] = members.map((member) => ({
    ...member,
    eligible: !excluded.has(member.name),
  }));
  return JSON.stringify({ version: 1, members: entries }, null, 2);
}

export const displayName = (member: Member) => member.nickname || member.name;
export const initials = (name: string) => name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("");
