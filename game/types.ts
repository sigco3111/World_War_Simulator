
import type { CountryDetails } from '../data/countryData';
// Import Policy-related types if they are not self-contained in policies.ts
// For now, assume policies.ts defines them and App.tsx will import from there.

export type GameMode = 'setup' | 'playing' | 'paused' | 'gameOver';

export interface Era {
  id: string;
  name: string;
  startYearThreshold: number; // Year to trigger this era
  avgTechThreshold?: number; // Average tech level across active nations to trigger
  // Potentially: unlocksPolicies?: string[]; unlocksNationalSpirits?: string[];
}

export interface GameDate {
  year: number;
  day: number; // Day of the year (1-365)
  currentEraId: string; // ID of the current game Era
}

export interface GameSpeed {
  id: 'paused' | 'slow' | 'normal' | 'fast';
  label: string;
  ticksPerSecond: number; // 0 for paused
}

export interface NationalSpirit {
  id: string;
  name: string;
  icon: string; // Emoji or path to icon
  description: string;
  category: 'economy' | 'military' | 'diplomacy' | 'research' | 'stability' | 'special';
  effects: PolicyEffect[]; // Re-use PolicyEffect structure for modifiers
  // duration?: number; // In game ticks, optional, if not present, it's permanent until removed by another event/policy
  // mutuallyExclusive?: string[]; // IDs of other national spirits this one cannot co-exist with
}

// Re-using PolicyEffect from policies.ts for NationalSpirit effects
// Ensure PolicyEffect is defined or imported if it's not implicitly available
export interface PolicyEffect {
  type: 'one_time' | 'ongoing';
  stat: string;
  // FIX: Allow value to be number or string (for spirit IDs)
  value: number | string;
  target?: 'self' | 'occupied_territories'; // For effects specific to occupied lands
}


export interface OccupiedTerritory {
  originalOwnerId: string;
  resistanceLevel: number; // 0-100
  baseGdpContribution: number; // GDP value at time of conquest
  baseResourceContribution: number; // Resource value at time of conquest
  garrisonPolicy?: string; // ID of an active policy affecting this territory (e.g., 'harsh_repression')
  // lastResistanceUpdateTick: number; // To control frequency of resistance changes
  rebellionRisk: number; // 0-100, chance of rebellion
  productionDisruptionTicks: number; // Number of ticks production is halted/reduced
  rebelStrength: number; // Strength of active rebels in the territory
}

export interface CivilianBudgetAllocation {
  economy: number;     // Percentage of civilian pool (0-100)
  technology: number;  // Percentage of civilian pool (0-100)
  diplomacy: number;   // Percentage of civilian pool (0-100)
  resources: number;   // Percentage of civilian pool (0-100)
}

export interface CountryInGame extends CountryDetails {
  currentPopulation: number;
  currentGDP: number;
  currentDefenseBudget: number;
  currentMilitary: {
    army: number;
    navy: number;
    airforce: number;
  };
  territories: string[]; 
  isEliminated: boolean;
  atWarWith: string[]; 
  aggressionScore: number; 
  isPlayer: boolean;
  color?: string; 

  politicalCapital: number;
  activePolicies: string[]; 
  policyEffectModifiers: Record<string, number>; 

  nationalSpirits: string[]; 
  nationalSpiritEffectModifiers: Record<string, number>; 
  occupiedTerritoryData: Record<string, OccupiedTerritory>; 

  // Budget Management
  defenseBudgetRatio: number; // Percentage of GDP allocated to defense (0-100)
  civilianAllocation: CivilianBudgetAllocation;
  autoManageBudget: boolean;
  eliminatedTick?: number; // Tick when the country was eliminated
}

export interface WarDetails {
  id: string; 
  attackerId: string;
  defenderId: string;
  startDate: GameDate; // Use the full GameDate object
  ticksToResolution: number; 
}

export interface RankedCountry {
  countryName: string;
  rank: number;
  eliminatedTick?: number; // Tick of elimination, undefined if winner
  isPlayer: boolean;
}

export interface FinalGameOutcome {
  playerWon: boolean;
  winnerName: string;
  ranking?: RankedCountry[];
}

export const AVAILABLE_GAME_SPEEDS: GameSpeed[] = [
  { id: 'paused', label: '정지', ticksPerSecond: 0 },
  { id: 'slow', label: '느리게 (1x)', ticksPerSecond: 1 },    
  { id: 'normal', label: '보통 (4x)', ticksPerSecond: 4 },  
  { id: 'fast', label: '빠르게 (8x)', ticksPerSecond: 8 },    
];

export const INITIAL_GAME_ERA_ID = "era_early"; // Default starting era

export const INITIAL_GAME_DATE: GameDate = { year: 1, day: 1, currentEraId: INITIAL_GAME_ERA_ID };
export const DAYS_IN_YEAR = 365;
export const BASE_POLITICAL_CAPITAL_PER_TICK = 0.05; 
export const POLITICAL_CAPITAL_FROM_DIPLOMACY_SCALE = 2000; 
export const MAX_POLITICAL_CAPITAL = 200;

export const BASE_GDP_GROWTH_RATE_PER_TICK = 0.0001; 
export const BASE_TECH_POINTS_PER_TICK = 0.1;
export const BASE_DIPLOMACY_POINTS_PER_TICK = 0.02;
export const BASE_RESOURCE_POINTS_PER_TICK = 0.01; 
export const BASE_AGGRESSION_DECAY_PER_TICK = 0.05; 

// Occupation and Resistance Constants
export const INITIAL_RESISTANCE_LEVEL = 10;
export const RESISTANCE_GROWTH_PER_TICK = 0.05; 
export const MAX_RESISTANCE_LEVEL = 100;
export const RESISTANCE_INCOME_PENALTY_FACTOR = 0.75; 

// Rebellion System Constants
export const INITIAL_REBELLION_RISK = 0;
export const REBELLION_RISK_FROM_RESISTANCE_SCALE = 2; 
export const MIN_RESISTANCE_FOR_RISK_GROWTH = 30; 
export const REBELLION_RISK_DECAY_PER_TICK = 0.02; 
export const REBELLION_RISK_THRESHOLD = 70; 
export const REBELLION_CHANCE_DIVISOR = 2000; 
export const REBELLION_PC_PENALTY_BASE = 20;
export const REBELLION_PRODUCTION_DISRUPTION_TICKS_BASE = 10; 
export const REBELLION_POST_EVENT_RISK_REDUCTION = 50;
export const REBELLION_POST_EVENT_RESISTANCE_REDUCTION = 15;

// Rebel Combat Constants
export const REBEL_GENERATION_SCALE_FROM_RISK = 5; 
export const REBEL_GENERATION_TECH_SUPPRESSION_FACTOR = 1500; 
export const GARRISON_BASE_EFFECTIVENESS = 0.2; 
export const REBEL_VS_GARRISON_ATTRITION_FACTOR = 0.1; 
export const GARRISON_LOSS_FACTOR_VS_REBELS = 0.25; 
export const REBEL_STRENGTH_DISRUPTION_THRESHOLD = 10; 

// Military Recovery Constants
export const RECOVERY_TECH_BONUS_SCALE = 2000;
export const RECOVERY_BUDGET_ALLOCATION_EFFECT_SCALE = 0.03; // Was 0.05
export const RECOVERY_MANPOWER_AVAILABILITY_SCALE = 50000000;
export const BASE_RECOVERY_POINTS_PER_TICK = 0.5;
export const RECOVERY_COST_BUDGET_PER_UNIT = 250000000;
export const RECOVERY_COST_POP_PER_UNIT = 300;

// Budget System Constants
export const DEFAULT_DEFENSE_BUDGET_RATIO = 5; // 5% of GDP
export const DEFAULT_CIVILIAN_ALLOCATION: CivilianBudgetAllocation = { economy: 30, technology: 30, diplomacy: 20, resources: 20 };

export const MAX_DEFENSE_BUDGET_RATIO_SOFT_CAP = 15; // Penalties start kicking in beyond this % of GDP for defense
export const MAX_DEFENSE_BUDGET_RATIO_HARD_CAP = 50; // Absolute max for defense spending %

export const DEFENSE_SPENDING_PENALTY_GDP_FACTOR = 0.000015; // Was 0.00001
export const DEFENSE_SPENDING_PENALTY_RESOURCE_FACTOR = 0.0007; // Was 0.0005
export const DEFENSE_SPENDING_PENALTY_DIPLOMACY_FACTOR = 0.0003; // Was 0.0002

// Budget effectiveness scaling factors: budget_allocation_percentage / SCALE_FACTOR = bonus multiplier component
export const BUDGET_ECONOMY_EFFECT_SCALE = 70; // Was 100
export const BUDGET_TECHNOLOGY_EFFECT_SCALE = 170; // Was 200
export const BUDGET_DIPLOMACY_EFFECT_SCALE = 180; // Was 250
export const BUDGET_RESOURCES_EFFECT_SCALE = 180; // Was 250


// New stat strings for policy/spirit effects:
export const EffectStats = {
  GDP_GROWTH_RATE_PERC: 'gdp_growth_rate_perc_bonus', 
  TECH_POINTS_PER_TICK_FLAT: 'tech_points_per_tick_flat_bonus',
  DIPLOMACY_POINTS_PER_TICK_FLAT: 'diplomacy_points_per_tick_flat_bonus',
  RESOURCE_POINTS_PER_TICK_FLAT: 'resource_points_per_tick_flat_bonus',
  POLITICAL_CAPITAL_PER_TICK_FLAT: 'political_capital_per_tick_flat_bonus',
  MILITARY_RECOVERY_EFFICIENCY_BONUS_PERC: 'military_recovery_efficiency_bonus_perc_bonus', 
  AGGRESSION_DECAY_RATE_PERC: 'aggression_decay_rate_perc_bonus',
  
  GDP_ABS_FLAT: 'gdp_abs_flat', 
  TECH_POINTS_FLAT: 'tech_points_flat', 
  DIPLOMACY_POINTS_FLAT: 'diplomacy_points_flat', 
  RESOURCE_POINTS_FLAT: 'resource_points_flat', 
  POLITICAL_CAPITAL_FLAT: 'political_capital_flat', 
  DEFENSE_BUDGET_ABS_FLAT: 'defense_budget_abs_flat', 

  GRANT_NATIONAL_SPIRIT: 'grant_national_spirit', 
  REMOVE_NATIONAL_SPIRIT: 'remove_national_spirit', 
  DEFENSE_EFFECTIVENESS_PERC: 'defense_effectiveness_perc_bonus', 
  ENEMY_ATTRITION_PERC: 'enemy_attrition_perc_bonus', 
  RESISTANCE_LEVEL_FLAT: 'resistance_level_flat', 
  RESISTANCE_GROWTH_RATE_PERC: 'resistance_growth_rate_perc_bonus', 
  OCCUPIED_TERRITORY_INCOME_PERC: 'occupied_territory_income_perc_bonus',

  REBELLION_RISK_CHANGE_RATE_PERC: 'rebellion_risk_change_rate_perc_bonus', 
  REBELLION_EVENT_PENALTY_MODIFIER_PERC: 'rebellion_event_penalty_modifier_perc',
  
  GARRISON_EFFECTIVENESS_PERC: 'garrison_effectiveness_perc_bonus',
  REBEL_SUPPRESSION_BONUS_PERC: 'rebel_suppression_bonus_perc', 
};
