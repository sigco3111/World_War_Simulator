
import type { Era as EraType } from './types'; // Ensure Era is available

// If EraType is already fully defined in types.ts, this re-definition might be for clarity
// or if this file needs its own version. Ensure consistency.
export interface Era extends EraType {}


export const ALL_ERAS: Record<string, Era> = {
  "era_early": {
    id: "era_early",
    name: "초기 시대",
    startYearThreshold: 1, // Game starts in this era
    // No avgTechThreshold for the first era, or set to 0
  },
  "era_industrial": {
    id: "era_industrial",
    name: "산업 시대",
    startYearThreshold: 30, // Example: transition around year 30
    // avgTechThreshold: 300, // Optional: or an average tech level
  },
  "era_modern": {
    id: "era_modern",
    name: "현대 시대",
    startYearThreshold: 75, // Example: transition around year 75
    // avgTechThreshold: 600,
  },
  "era_information": {
    id: "era_information",
    name: "정보 시대",
    startYearThreshold: 120, // Example: transition around year 120
    // avgTechThreshold: 850,
  },
  "era_future": {
    id: "era_future",
    name: "미래 시대",
    startYearThreshold: 175,
    // avgTechThreshold: 950
  }
};
