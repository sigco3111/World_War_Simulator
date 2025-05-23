
// Re-define or ensure PolicyEffect matches the one in game/types.ts
// This might be slightly redundant if types.ts is the single source of truth for this interface,
// but having it here helps keep policy definitions self-contained for reading.
// For actual compilation, ensure there's no conflict and game/types.ts is authoritative.
export interface PolicyEffect {
  type: 'one_time' | 'ongoing'; 
  stat: string; 
  // FIX: Allow value to be number or string (for spirit IDs), matching game/types.ts
  value: number | string;
  target?: 'self' | 'occupied_territories'; // Optional: For effects specific to occupied lands
}
// Ensure EffectStats from types.ts are available or re-define constants here if needed.
import { EffectStats } from './types';


export type PolicyCategory = "경제" | "연구" | "외교" | "사회" | "군사" | "통치"; // Added "통치" for occupation

export interface PolicyCost {
  politicalCapital?: number;
  gdpFactor?: number; 
}

export interface PolicyPrerequisites {
  techLevel?: number;
  eraRequirement?: string; // ID of the required Era
  // otherPolicy?: string; 
  // specificNationalSpirit?: string; // Requires a certain national spirit
}

export interface Policy {
  id: string;
  name: string;
  icon: string; 
  description: string;
  category: PolicyCategory;
  cost: PolicyCost;
  prerequisites?: PolicyPrerequisites;
  effects: PolicyEffect[];
}

export const ALL_POLICIES: Record<string, Policy> = {
  "industrial_investment": {
    id: "industrial_investment",
    name: "산업 투자 확대",
    icon: "🏭",
    description: "대규모 산업 투자를 통해 경제 성장을 촉진합니다.",
    category: "경제",
    cost: { politicalCapital: 20, gdpFactor: 0.005 },
    prerequisites: { techLevel: 100, eraRequirement: "era_early" },
    effects: [
      { type: 'ongoing', stat: EffectStats.GDP_GROWTH_RATE_PERC, value: 0.0002 }, 
      { type: 'ongoing', stat: EffectStats.RESOURCE_POINTS_PER_TICK_FLAT, value: -0.05 } 
    ]
  },
  "basic_science_research": {
    id: "basic_science_research",
    name: "기초 과학 연구 진흥",
    icon: "🔬",
    description: "기초 과학 연구에 대한 투자를 늘려 기술 발전을 가속화합니다.",
    category: "연구",
    cost: { politicalCapital: 25 },
    prerequisites: { techLevel: 150, eraRequirement: "era_early" },
    effects: [
      { type: 'ongoing', stat: EffectStats.TECH_POINTS_PER_TICK_FLAT, value: 0.3 } 
    ]
  },
  "diplomatic_offensive": {
    id: "diplomatic_offensive",
    name: "적극적 외교 공세",
    icon: "🤝",
    description: "국제 사회에서 영향력을 확대하기 위한 외교적 노력을 강화합니다.",
    category: "외교",
    cost: { politicalCapital: 30, gdpFactor: 0.002 },
    prerequisites: { eraRequirement: "era_early" },
    effects: [
      { type: 'ongoing', stat: EffectStats.DIPLOMACY_POINTS_PER_TICK_FLAT, value: 0.2 },
      { type: 'ongoing', stat: EffectStats.POLITICAL_CAPITAL_PER_TICK_FLAT, value: 0.02 }
    ]
  },
  "resource_exploration": {
    id: "resource_exploration",
    name: "자원 탐사 및 개발",
    icon: "⛏️",
    description: "새로운 자원 매장지를 탐사하고 개발하여 국가의 자원 기반을 확충합니다.",
    category: "경제",
    cost: { politicalCapital: 15, gdpFactor: 0.003 },
    prerequisites: { techLevel: 200, eraRequirement: "era_industrial" },
    effects: [
      { type: 'ongoing', stat: EffectStats.RESOURCE_POINTS_PER_TICK_FLAT, value: 0.25 }
    ]
  },
  "austerity_measures": {
    id: "austerity_measures",
    name: "긴축 재정 정책",
    icon: "📉",
    description: "단기적으로 재정 안정성을 확보하지만, 경제 성장과 기술 연구에 부정적 영향을 줄 수 있습니다.",
    category: "경제",
    cost: { politicalCapital: 10 },
    prerequisites: { eraRequirement: "era_early" },
    effects: [
      { type: 'one_time', stat: EffectStats.DEFENSE_BUDGET_ABS_FLAT, value: 50000000000 }, 
      { type: 'ongoing', stat: EffectStats.GDP_GROWTH_RATE_PERC, value: -0.0001 },
      { type: 'ongoing', stat: EffectStats.TECH_POINTS_PER_TICK_FLAT, value: -0.05 }
    ]
  },
  "education_reform": {
    id: "education_reform",
    name: "교육 시스템 개혁",
    icon: "🎓",
    description: "교육 시스템을 현대화하여 장기적으로 국가 기술 경쟁력을 강화합니다.",
    category: "사회",
    cost: { politicalCapital: 40, gdpFactor: 0.01 },
    prerequisites: { techLevel: 250, eraRequirement: "era_industrial" },
    effects: [
      { type: 'ongoing', stat: EffectStats.TECH_POINTS_PER_TICK_FLAT, value: 0.5 }, 
      { type: 'ongoing', stat: EffectStats.POLITICAL_CAPITAL_PER_TICK_FLAT, value: 0.01 }
    ]
  },
   "military_modernization_drive": {
    id: "military_modernization_drive",
    name: "군 현대화 추진",
    icon: "🚀",
    description: "군사 장비 현대화 및 훈련 강화를 통해 군사력 회복 효율을 증진시킵니다.",
    category: "군사",
    cost: { politicalCapital: 35, gdpFactor: 0.008},
    prerequisites: { techLevel: 300, eraRequirement: "era_industrial" },
    effects: [
        { type: 'ongoing', stat: EffectStats.MILITARY_RECOVERY_EFFICIENCY_BONUS_PERC, value: 0.10 }, 
        { type: 'ongoing', stat: EffectStats.TECH_POINTS_PER_TICK_FLAT, value: 0.1 } 
    ]
  },
  "propaganda_campaign": {
    id: "propaganda_campaign",
    name: "국내 선전 강화",
    icon: "📢",
    description: "국민들의 애국심을 고취하고, 정치적 안정성을 증대시킵니다.",
    category: "사회",
    cost: { politicalCapital: 15 },
    prerequisites: { eraRequirement: "era_early" },
    effects: [
        { type: 'ongoing', stat: EffectStats.POLITICAL_CAPITAL_PER_TICK_FLAT, value: 0.15 },
        { type: 'ongoing', stat: EffectStats.AGGRESSION_DECAY_RATE_PERC, value: -0.05 } 
    ]
  },
  "border_fortification": {
    id: "border_fortification",
    name: "국경 요새화", 
    icon: "🧱",
    description: "국경 지역의 방어력을 강화하여 외부 침략에 대한 저항력을 높입니다.",
    category: "군사",
    cost: { politicalCapital: 20, gdpFactor: 0.004 },
    prerequisites: { techLevel: 100, eraRequirement: "era_early" },
    effects: [
        { type: 'ongoing', stat: EffectStats.DEFENSE_EFFECTIVENESS_PERC, value: 0.10 } 
    ]
  },
  "guerilla_tactics": {
    id: "guerilla_tactics",
    name: "유격 전술 채택", 
    icon: "🌲",
    description: "비정규전 전술을 채택하여 적에게 지속적인 소모를 강요합니다.",
    category: "군사",
    cost: { politicalCapital: 25 },
    prerequisites: { techLevel: 220, eraRequirement: "era_industrial" },
    effects: [
      { type: 'ongoing', stat: EffectStats.ENEMY_ATTRITION_PERC, value: 0.05 } 
    ]
  },
  "free_trade_agreement": {
    id: "free_trade_agreement",
    name: "자유 무역 협정",
    icon: "🌍",
    description: "다른 국가와의 자유 무역 협정을 통해 경제 성장을 촉진합니다.",
    category: "경제",
    cost: { politicalCapital: 20 },
    prerequisites: { eraRequirement: "era_industrial" },
    effects: [
        { type: 'ongoing', stat: EffectStats.GDP_GROWTH_RATE_PERC, value: 0.00015 },
        { type: 'ongoing', stat: EffectStats.DIPLOMACY_POINTS_PER_TICK_FLAT, value: 0.05 }
    ]
  },
  "tech_leap_robotics": {
    id: "tech_leap_robotics",
    name: "로봇 공학 도약", 
    icon: "🤖",
    description: "로봇 공학 및 자동화 기술에 집중 투자하여 기술적 우위를 점합니다.",
    category: "연구",
    cost: { politicalCapital: 50, gdpFactor: 0.015 },
    prerequisites: { techLevel: 400, eraRequirement: "era_modern" }, 
    effects: [
      { type: 'ongoing', stat: EffectStats.TECH_POINTS_PER_TICK_FLAT, value: 0.8 },
      { type: 'one_time', stat: EffectStats.GRANT_NATIONAL_SPIRIT, value: 'robotic_advancement_spirit' } 
    ]
  },
  "export_oriented_economy": {
    id: "export_oriented_economy",
    name: "수출 주도 경제 개발", 
    icon: "🚢",
    description: "수출 지향 산업을 육성하여 국가 경제를 비약적으로 발전시킵니다.",
    category: "경제",
    cost: { politicalCapital: 30 },
    prerequisites: { techLevel: 300, eraRequirement: "era_industrial" },
    effects: [
      { type: 'ongoing', stat: EffectStats.GDP_GROWTH_RATE_PERC, value: 0.0003 },
      { type: 'ongoing', stat: EffectStats.RESOURCE_POINTS_PER_TICK_FLAT, value: -0.1 } 
    ]
  },
  "higher_education_mandate": {
    id: "higher_education_mandate",
    name: "고등 교육 의무화", 
    icon: "🏛️",
    description: "고등 교육을 의무화하고 지원하여 인적 자본의 질을 향상시킵니다.",
    category: "사회",
    cost: { politicalCapital: 45, gdpFactor: 0.012 },
    prerequisites: { techLevel: 350, eraRequirement: "era_modern" },
    effects: [
      { type: 'ongoing', stat: EffectStats.TECH_POINTS_PER_TICK_FLAT, value: 0.4 },
      { type: 'ongoing', stat: EffectStats.POLITICAL_CAPITAL_PER_TICK_FLAT, value: 0.03 }
    ]
  },
  "harsh_repression": {
    id: "harsh_repression",
    name: "강압 통치",
    icon: "⛓️",
    description: "점령지에 강압적인 통치를 실시하여 저항을 억누르지만, 국제적 비난을 받을 수 있습니다.",
    category: "통치",
    cost: { politicalCapital: 10 }, 
    prerequisites: { eraRequirement: "era_early" },
    effects: [
      { type: 'ongoing', stat: EffectStats.RESISTANCE_GROWTH_RATE_PERC, value: -0.1, target: 'occupied_territories'}, 
      { type: 'ongoing', stat: EffectStats.DIPLOMACY_POINTS_PER_TICK_FLAT, value: -0.1 }, 
      { type: 'ongoing', stat: EffectStats.OCCUPIED_TERRITORY_INCOME_PERC, value: 0.05, target: 'occupied_territories' },
      { type: 'ongoing', stat: EffectStats.REBELLION_RISK_CHANGE_RATE_PERC, value: 0.05, target: 'occupied_territories'} 
    ]
  },
  "cultural_integration_program": {
    id: "cultural_integration_program",
    name: "문화 동화 프로그램",
    icon: "🌐",
    description: "점령지 주민들을 대상으로 문화 동화 프로그램을 시행하여 장기적으로 저항과 반란 위험을 줄입니다.",
    category: "통치",
    cost: { politicalCapital: 20, gdpFactor: 0.005 },
    prerequisites: { techLevel: 200, eraRequirement: "era_industrial" },
    effects: [
      { type: 'ongoing', stat: EffectStats.RESISTANCE_GROWTH_RATE_PERC, value: -0.05, target: 'occupied_territories'}, 
      { type: 'ongoing', stat: EffectStats.OCCUPIED_TERRITORY_INCOME_PERC, value: -0.02, target: 'occupied_territories' },
      { type: 'ongoing', stat: EffectStats.REBELLION_RISK_CHANGE_RATE_PERC, value: -0.1, target: 'occupied_territories'} 
    ]
  },
  "grant_awakened_giant_spirit": {
    id: "grant_awakened_giant_spirit",
    name: "각성한 거인 (국가정신 부여)",
    icon: "🌟",
    description: "국가의 숨겨진 잠재력을 발현하여 모든 분야에서 두각을 나타냅니다.",
    category: "사회",
    cost: { politicalCapital: 100 },
    prerequisites: { techLevel: 500, eraRequirement: "era_modern" }, 
    effects: [
      { type: 'one_time', stat: EffectStats.GRANT_NATIONAL_SPIRIT, value: 'awakened_giant' }
    ]
  },
  "martial_law": {
    id: "martial_law",
    name: "계엄령 선포",
    icon: "🛡️",
    description: "점령지에 계엄령을 선포하여 일시적으로 저항과 반란 위험을 크게 낮추지만, 생산성과 정치 자본에 큰 타격을 줍니다.",
    category: "통치",
    cost: { politicalCapital: 30 },
    prerequisites: { eraRequirement: "era_early" },
    effects: [
      { type: 'one_time', stat: EffectStats.RESISTANCE_LEVEL_FLAT, value: -20, target: 'occupied_territories'}, 
      { type: 'one_time', stat: EffectStats.POLITICAL_CAPITAL_FLAT, value: -10 }, 
      { type: 'ongoing', stat: EffectStats.OCCUPIED_TERRITORY_INCOME_PERC, value: -0.20, target: 'occupied_territories' }, 
      { type: 'ongoing', stat: EffectStats.REBELLION_RISK_CHANGE_RATE_PERC, value: -0.25, target: 'occupied_territories' }, 
      { type: 'ongoing', stat: EffectStats.RESISTANCE_GROWTH_RATE_PERC, value: -0.15, target: 'occupied_territories' },
      { type: 'ongoing', stat: EffectStats.GARRISON_EFFECTIVENESS_PERC, value: 0.20, target: 'self' }, // Added
      { type: 'ongoing', stat: EffectStats.REBEL_SUPPRESSION_BONUS_PERC, value: 0.10, target: 'self' }  // Added
    ]
  },
  "strengthen_intelligence_agency": {
    id: "strengthen_intelligence_agency",
    name: "정보 통제 강화",
    icon: "🕵️",
    description: "정보 기관을 강화하여 반란 활동을 사전에 감지하고 억제합니다. 반란 위험도 증가율을 낮춥니다.",
    category: "통치",
    cost: { politicalCapital: 25, gdpFactor: 0.003 },
    prerequisites: { techLevel: 350, eraRequirement: "era_modern"},
    effects: [
      { type: 'ongoing', stat: EffectStats.REBELLION_RISK_CHANGE_RATE_PERC, value: -0.15, target: 'occupied_territories' } 
    ]
  },
  "reinforce_garrisons": { // New Policy
    id: "reinforce_garrisons",
    name: "주둔군 강화",
    icon: "🏰",
    description: "점령지에 주둔하는 군대의 효율을 높여 반란 진압 능력을 향상시키지만, 이는 때로 더 큰 반감을 살 수 있습니다.",
    category: "통치",
    cost: { politicalCapital: 15 },
    prerequisites: { techLevel: 100, eraRequirement: "era_early" },
    effects: [
      { type: 'ongoing', stat: EffectStats.GARRISON_EFFECTIVENESS_PERC, value: 0.15, target: 'self' },
      { type: 'ongoing', stat: EffectStats.REBELLION_RISK_CHANGE_RATE_PERC, value: 0.02, target: 'occupied_territories' } // Slight increase in risk due to presence
    ]
  },
  "hearts_and_minds_campaign": { // New Policy
    id: "hearts_and_minds_campaign",
    name: "민심 안정화 작전",
    icon: "🕊️",
    description: "점령지 주민들의 마음을 얻기 위한 인도적 지원 및 선전 활동을 통해 반란 위험을 낮춥니다. 자금과 정치 자본이 소모됩니다.",
    category: "통치",
    cost: { politicalCapital: 20, gdpFactor: 0.002 },
    prerequisites: { techLevel: 150, eraRequirement: "era_industrial" },
    effects: [
      { type: 'ongoing', stat: EffectStats.REBELLION_RISK_CHANGE_RATE_PERC, value: -0.10, target: 'occupied_territories' },
      { type: 'ongoing', stat: EffectStats.RESISTANCE_GROWTH_RATE_PERC, value: -0.03, target: 'occupied_territories' },
      { type: 'ongoing', stat: EffectStats.REBEL_SUPPRESSION_BONUS_PERC, value: -0.05, target: 'self' } // Less effective in direct combat suppression
    ]
  }
};
