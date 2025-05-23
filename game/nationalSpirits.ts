
import type { PolicyEffect, NationalSpirit as NationalSpiritType } from './types'; // Ensure PolicyEffect is available
import { EffectStats } from './types'; // For stat constants

// If NationalSpiritType is already fully defined in types.ts, this re-definition might be for clarity
// or if this file needs its own version. Ensure consistency.
// Fix: Removed redundant local NationalSpirit interface declaration. Use NationalSpiritType from game/types.ts
// export interface NationalSpirit extends NationalSpiritType {}


// Fix: Changed type from 'NationalSpirit' (local) to 'NationalSpiritType' (imported from types.ts)
export const ALL_NATIONAL_SPIRITS: Record<string, NationalSpiritType> = {
  "robotic_advancement_spirit": {
    id: "robotic_advancement_spirit",
    name: "로봇 공학 선도국",
    icon: "🤖",
    description: "로봇 공학 및 자동화 기술에서 세계를 선도하여 생산성과 기술 발전에 큰 이점을 얻습니다.",
    category: "research",
    effects: [
      { type: 'ongoing', stat: EffectStats.TECH_POINTS_PER_TICK_FLAT, value: 0.5 },
      { type: 'ongoing', stat: EffectStats.GDP_GROWTH_RATE_PERC, value: 0.0001 }, // e.g. +0.01% GDP growth
      // Fix: Use EffectStats enum for consistency and type safety
      { type: 'ongoing', stat: EffectStats.MILITARY_RECOVERY_EFFICIENCY_BONUS_PERC, value: 0.05 } // +5% military recovery
    ]
  },
  "awakened_giant": {
    id: "awakened_giant",
    name: "각성한 거인",
    icon: "🌟",
    description: "국가의 모든 잠재력이 깨어나 경제, 기술, 군사 모든 면에서 비약적인 발전을 이룩합니다.",
    category: "special",
    effects: [
      { type: 'ongoing', stat: EffectStats.GDP_GROWTH_RATE_PERC, value: 0.00025 },
      { type: 'ongoing', stat: EffectStats.TECH_POINTS_PER_TICK_FLAT, value: 0.75 },
      { type: 'ongoing', stat: EffectStats.DIPLOMACY_POINTS_PER_TICK_FLAT, value: 0.3 },
      { type: 'ongoing', stat: EffectStats.RESOURCE_POINTS_PER_TICK_FLAT, value: 0.2 },
      { type: 'ongoing', stat: EffectStats.POLITICAL_CAPITAL_PER_TICK_FLAT, value: 0.25 },
      { type: 'ongoing', stat: EffectStats.MILITARY_RECOVERY_EFFICIENCY_BONUS_PERC, value: 0.15 }
    ]
  },
  "isolationism": {
    id: "isolationism",
    name: "고립주의",
    // Fix: Updated placeholder icon
    icon: "🧱", 
    description: "외부 세계와의 교류를 최소화하고 내부 문제에 집중합니다. 외교적 영향력은 감소하지만 내부 안정에 집중할 수 있습니다.",
    category: "diplomacy",
    effects: [
      { type: 'ongoing', stat: EffectStats.DIPLOMACY_POINTS_PER_TICK_FLAT, value: -0.2 },
      { type: 'ongoing', stat: EffectStats.POLITICAL_CAPITAL_PER_TICK_FLAT, value: 0.1 }, // Focus inwards
      { type: 'ongoing', stat: EffectStats.AGGRESSION_DECAY_RATE_PERC, value: 0.1 } // Less aggressive
    ]
  },
  "militaristic_society": {
    id: "militaristic_society",
    name: "군국주의 사회",
    icon: "⚔️",
    description: "사회의 모든 역량이 군사력 강화에 집중됩니다. 군사 회복 및 동원력이 향상되지만 다른 분야 발전은 더딜 수 있습니다.",
    category: "military",
    effects: [
      { type: 'ongoing', stat: EffectStats.MILITARY_RECOVERY_EFFICIENCY_BONUS_PERC, value: 0.20 },
      { type: 'ongoing', stat: EffectStats.TECH_POINTS_PER_TICK_FLAT, value: -0.1 },
      { type: 'ongoing', stat: EffectStats.GDP_GROWTH_RATE_PERC, value: -0.00005 },
      { type: 'ongoing', stat: EffectStats.AGGRESSION_DECAY_RATE_PERC, value: -0.1 } // More aggressive
    ]
  }
};