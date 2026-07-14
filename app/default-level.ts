import exportedDefaultLevel from "./default-level.json";
import type { Level } from "./level-types";
import { cloneData } from "./platform";

// The checked-in JSON is the canonical default and can also be shared through
// the editor's Import/Export controls without any conversion.
export const DEFAULT_LEVEL = exportedDefaultLevel as Level;

export function createDefaultLevel(): Level {
  return cloneData(DEFAULT_LEVEL);
}
