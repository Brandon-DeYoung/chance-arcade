import roster from "./default-roster.json";
import { parseRosterDocument, type ParsedRoster } from "./members";

export function createDefaultRosterDocument(): ParsedRoster {
  return parseRosterDocument(JSON.stringify(roster));
}

export function createDefaultRoster() {
  return createDefaultRosterDocument().members;
}
