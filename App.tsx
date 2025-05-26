





import React, { useState, useEffect, useCallback, useMemo } from 'react';
import WorldMap from './components/WorldMap';
import GameControls from './components/GameControls';
import EventLog from './components/EventLog';
import GameSummaryModal from './components/GameSummaryModal';
import { countryDetailsData, CountryDetails } from './data/countryData';
import type { GameMode, GameDate, GameSpeed, CountryInGame, WarDetails, FinalGameOutcome, Era, NationalSpirit, PolicyEffect, OccupiedTerritory, CivilianBudgetAllocation, RankedCountry, DiplomaticProposal, TruceDetails } from './game/types';
import { 
  AVAILABLE_GAME_SPEEDS, INITIAL_GAME_DATE, DAYS_IN_YEAR, 
  BASE_POLITICAL_CAPITAL_PER_TICK, POLITICAL_CAPITAL_FROM_DIPLOMACY_SCALE, MAX_POLITICAL_CAPITAL,
  BASE_GDP_GROWTH_RATE_PER_TICK, BASE_TECH_POINTS_PER_TICK, BASE_DIPLOMACY_POINTS_PER_TICK,
  BASE_RESOURCE_POINTS_PER_TICK, BASE_AGGRESSION_DECAY_PER_TICK,
  INITIAL_GAME_ERA_ID, 
  INITIAL_RESISTANCE_LEVEL, RESISTANCE_GROWTH_PER_TICK, MAX_RESISTANCE_LEVEL, RESISTANCE_INCOME_PENALTY_FACTOR, 
  EffectStats,
  INITIAL_REBELLION_RISK, REBELLION_RISK_FROM_RESISTANCE_SCALE, MIN_RESISTANCE_FOR_RISK_GROWTH,
  REBELLION_RISK_DECAY_PER_TICK, REBELLION_RISK_THRESHOLD, REBELLION_CHANCE_DIVISOR,
  REBELLION_PC_PENALTY_BASE, REBELLION_PRODUCTION_DISRUPTION_TICKS_BASE,
  REBELLION_POST_EVENT_RISK_REDUCTION, REBELLION_POST_EVENT_RESISTANCE_REDUCTION,
  REBEL_GENERATION_SCALE_FROM_RISK, REBEL_GENERATION_TECH_SUPPRESSION_FACTOR,
  GARRISON_BASE_EFFECTIVENESS, REBEL_VS_GARRISON_ATTRITION_FACTOR, GARRISON_LOSS_FACTOR_VS_REBELS,
  REBEL_STRENGTH_DISRUPTION_THRESHOLD,
  DEFAULT_DEFENSE_BUDGET_RATIO, DEFAULT_CIVILIAN_ALLOCATION,
  MAX_DEFENSE_BUDGET_RATIO_SOFT_CAP, MAX_DEFENSE_BUDGET_RATIO_HARD_CAP,
  DEFENSE_SPENDING_PENALTY_GDP_FACTOR, DEFENSE_SPENDING_PENALTY_RESOURCE_FACTOR, DEFENSE_SPENDING_PENALTY_DIPLOMACY_FACTOR,
  BUDGET_ECONOMY_EFFECT_SCALE, BUDGET_TECHNOLOGY_EFFECT_SCALE, BUDGET_DIPLOMACY_EFFECT_SCALE, BUDGET_RESOURCES_EFFECT_SCALE,
  RELATIONS_INITIAL_DEFAULT, ALLIANCE_RELATION_THRESHOLD, PC_COST_PROPOSE_ALLIANCE, PC_COST_DECLARE_WAR, AGGRESSION_HIT_DECLARE_WAR,
  WAR_TICKS_DURATION, MAX_AGGRESSION,
  RELATIONS_MAX, RELATIONS_MIN, RELATION_IMPROVEMENT_PER_ACTION, RELATION_HARM_PER_ACTION,
  PC_COST_IMPROVE_RELATIONS, PC_COST_HARM_RELATIONS, PC_COST_BREAK_ALLIANCE_PENALTY, AGGRESSION_HIT_BREAK_ALLIANCE, RELATION_HIT_BREAK_ALLIANCE_WITH_ALLY,
  PC_COST_OFFER_TRUCE, DEFAULT_TRUCE_DURATION_TICKS, TRUCE_RELATION_IMPROVEMENT_ON_ACCEPT, RELATION_HIT_DECLARE_WAR, AGGRESSION_HIT_BREAK_TRUCE
} from './game/types';
import { ALL_POLICIES, Policy } from './game/policies';
import { ALL_ERAS } from './game/eras'; 
import { ALL_NATIONAL_SPIRITS } from './game/nationalSpirits'; 

export interface StatHistoryEntry {
  tick: number;
  economy: number;
  technology: number;
  diplomacy: number;
  resources: number;
}


const MAX_LOG_ENTRIES = 200;

const RECOVERY_TECH_BONUS_SCALE = 2000; 
const RECOVERY_BUDGET_ALLOCATION_EFFECT_SCALE = 0.05; 
const RECOVERY_MANPOWER_AVAILABILITY_SCALE = 50000000; 
const BASE_RECOVERY_POINTS_PER_TICK = 0.5; 
const RECOVERY_COST_BUDGET_PER_UNIT = 250000000; 
const RECOVERY_COST_POP_PER_UNIT = 300;      

const App: React.FC = () => {
  const [gameMode, setGameMode] = useState<GameMode>('setup');
  const [playerCountryId, setPlayerCountryId] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<GameDate>({...INITIAL_GAME_DATE, currentEraId: INITIAL_GAME_ERA_ID}); 
  const [currentGameSpeed, setCurrentGameSpeed] = useState<GameSpeed>(AVAILABLE_GAME_SPEEDS.find(s => s.id === 'normal') || AVAILABLE_GAME_SPEEDS[2]);
  const [allCountriesState, setAllCountriesState] = useState<Record<string, CountryInGame>>({});
  const [activeWars, setActiveWars] = useState<WarDetails[]>([]);
  const [gameMessage, setGameMessage] = useState<string>('국가를 선택하여 시뮬레이션을 시작하세요.');
  const [gameLogs, setGameLogs] = useState<string[]>([]);
  
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState<boolean>(false);
  const [finalGameOutcome, setFinalGameOutcome] = useState<FinalGameOutcome | null>(null);

  const [autoEnactPolicies, setAutoEnactPolicies] = useState<boolean>(true); 
  const [autoDelegateDiplomacy, setAutoDelegateDiplomacy] = useState<boolean>(true);
  const [totalTicks, setTotalTicks] = useState<number>(0);
  const [playerStatHistory, setPlayerStatHistory] = useState<StatHistoryEntry[]>([]);


  const addLogEntry = useCallback((message: string, date?: GameDate) => {
    const logPrefix = date ? `[${date.year}년 ${date.day}일] ` : ''; // Era name removed from log prefix
    setGameLogs(prevLogs => {
      const newLog = `${logPrefix}${message}`;
      const updatedLogs = [newLog, ...prevLogs];
      if (updatedLogs.length > MAX_LOG_ENTRIES) {
        return updatedLogs.slice(0, MAX_LOG_ENTRIES);
      }
      return updatedLogs;
    });
  }, []);

  const recalculatePolicyEffectModifiers = useCallback((country: CountryInGame): CountryInGame => {
    const newModifiers: Record<string, number> = {};
    country.activePolicies.forEach(policyId => {
      const policy = ALL_POLICIES[policyId];
      if (policy) {
        policy.effects.forEach(effect => {
          if (effect.type === 'ongoing') {
            const key = effect.stat; 
            if (typeof effect.value === 'number') {
              newModifiers[key] = (newModifiers[key] || 0) + effect.value;
            }
          }
        });
      }
    });
    return { ...country, policyEffectModifiers: newModifiers };
  }, []);

  const recalculateNationalSpiritEffectModifiers = useCallback((country: CountryInGame): CountryInGame => {
    const newModifiers: Record<string, number> = {};
    country.nationalSpirits.forEach(spiritId => {
      const spirit = ALL_NATIONAL_SPIRITS[spiritId];
      if (spirit) {
        spirit.effects.forEach(effect => {
          if (effect.type === 'ongoing') {
            const key = effect.stat;
            if (typeof effect.value === 'number') {
              newModifiers[key] = (newModifiers[key] || 0) + effect.value;
            }
          }
        });
      }
    });
    return { ...country, nationalSpiritEffectModifiers: newModifiers };
  }, []);


  const initializeGameData = useCallback(() => {
    const initialGameStates: Record<string, CountryInGame> = {};
    const countryIds = Object.keys(countryDetailsData).filter(id => id !== "DEFAULT");

    countryIds.forEach(id => {
      const details = countryDetailsData[id];
      const occupiedTerritoryDataWithRebels: Record<string, OccupiedTerritory> = {}; 
      
      let baseCountry: CountryInGame = {
        ...details,
        currentPopulation: details.인구수 ?? 0,
        currentGDP: details.GDP ?? 0,
        currentDefenseBudget: details.국방예산 ?? 0, // Will be recalculated based on defenseBudgetRatio
        currentMilitary: {
          army: details.육군전투력 ?? 50,
          navy: details.해군전투력 ?? 50,
          airforce: details.공군전투력 ?? 50,
        },
        // FIX: Initialize currentMaxMilitary
        currentMaxMilitary: {
          army: details.육군전투력 ?? 50,
          navy: details.해군전투력 ?? 50,
          airforce: details.공군전투력 ?? 50,
        },
        경제력: details.경제력 ?? 50,
        기술력: details.기술력 ?? 50,
        외교력: details.외교력 ?? 50,
        자원보유량: details.자원보유량 ?? 50,
        territories: [id],
        isEliminated: false,
        atWarWith: [],
        aggressionScore: Math.floor(Math.random() * 40) + 10, 
        isPlayer: false,
        politicalCapital: 50, 
        activePolicies: [],
        policyEffectModifiers: {},
        nationalSpirits: [], 
        nationalSpiritEffectModifiers: {}, 
        occupiedTerritoryData: occupiedTerritoryDataWithRebels,
        defenseBudgetRatio: DEFAULT_DEFENSE_BUDGET_RATIO,
        civilianAllocation: { ...DEFAULT_CIVILIAN_ALLOCATION },
        autoManageBudget: true,
        eliminatedTick: undefined,
        relations: {},
        allies: [],
        truces: [],
        pendingDiplomaticProposals: [],
      };
      baseCountry.currentDefenseBudget = baseCountry.currentGDP * (baseCountry.defenseBudgetRatio / 100);
      baseCountry = recalculatePolicyEffectModifiers(baseCountry); 
      baseCountry = recalculateNationalSpiritEffectModifiers(baseCountry); 
      initialGameStates[id] = baseCountry;
    });

    // Initialize relations between all countries
    countryIds.forEach(id1 => {
        countryIds.forEach(id2 => {
            if (id1 !== id2) {
                if (!initialGameStates[id1].relations[id2]) {
                    initialGameStates[id1].relations[id2] = RELATIONS_INITIAL_DEFAULT;
                }
                if (!initialGameStates[id2].relations[id1]) {
                   initialGameStates[id2].relations[id1] = RELATIONS_INITIAL_DEFAULT;
                }
            }
        });
    });


    setAllCountriesState(initialGameStates);
    setCurrentDate({...INITIAL_GAME_DATE, currentEraId: INITIAL_GAME_ERA_ID }); 
    setGameLogs([]); 
    addLogEntry("새로운 시뮬레이션 설정이 시작되었습니다.", {...INITIAL_GAME_DATE, currentEraId: INITIAL_GAME_ERA_ID });
    setIsSummaryModalOpen(false);
    setFinalGameOutcome(null);
    setAutoEnactPolicies(true); 
    setAutoDelegateDiplomacy(true);
    setTotalTicks(0);
    setPlayerStatHistory([]);
  }, [addLogEntry, recalculatePolicyEffectModifiers, recalculateNationalSpiritEffectModifiers]);

  useEffect(() => {
    if (gameMode === 'setup') {
      initializeGameData();
      setGameMessage('국가를 선택하여 시뮬레이션을 시작하세요.');
    }
  }, [gameMode, initializeGameData]);
  
  const handleEnactPolicy = useCallback((countryId: string, policyId: string, isAIAction: boolean = false) => {
    setAllCountriesState(prev => {
      const currentCountries = JSON.parse(JSON.stringify(prev)) as Record<string, CountryInGame>;
      let country = currentCountries[countryId];
      const policy = ALL_POLICIES[policyId];

      if (!country || !policy || country.isEliminated) return prev;
      if (country.activePolicies.includes(policyId)) {
        if (!isAIAction) addLogEntry(`${country.국가명}: "${policy.name}" 정책은 이미 활성화되어 있습니다.`, currentDate);
        return prev;
      }
      
      if (policy.prerequisites?.eraRequirement && policy.prerequisites.eraRequirement !== currentDate.currentEraId) {
         const requiredEra = ALL_ERAS[policy.prerequisites.eraRequirement];
         if (!isAIAction) addLogEntry(`${country.국가명}: "${policy.name}" 정책 제정에는 "${requiredEra?.name || policy.prerequisites.eraRequirement}" 시대가 필요합니다.`, currentDate);
        return prev;
      }

      if (policy.prerequisites?.techLevel && (country.기술력 || 0) < policy.prerequisites.techLevel) {
        if (!isAIAction) addLogEntry(`${country.국가명}: "${policy.name}" 정책 제정에 기술 수준(${policy.prerequisites.techLevel})이 부족합니다. (현재: ${country.기술력 || 0})`, currentDate);
        return prev;
      }
      if (policy.cost.politicalCapital && country.politicalCapital < policy.cost.politicalCapital) {
         if (!isAIAction) addLogEntry(`${country.국가명}: "${policy.name}" 정책 제정에 정치 자본(${policy.cost.politicalCapital})이 부족합니다. (현재: ${country.politicalCapital.toFixed(1)})`, currentDate);
        return prev;
      }
      
      if (policy.cost.politicalCapital) {
        country.politicalCapital -= policy.cost.politicalCapital;
      }
      if (policy.cost.gdpFactor) {
        country.currentGDP -= country.currentGDP * policy.cost.gdpFactor;
        // 경제력 is recalculated based on GDP later in the tick
      }

      policy.effects.forEach(effect => {
        if (effect.type === 'one_time') {
          const numericEffectValue = typeof effect.value === 'string' ? parseFloat(effect.value) : effect.value;
          switch (effect.stat) {
            case EffectStats.GDP_ABS_FLAT: if (typeof numericEffectValue === 'number') country.currentGDP += numericEffectValue; break;
            case EffectStats.TECH_POINTS_FLAT: if (typeof numericEffectValue === 'number') country.기술력 = Math.min(1000, (country.기술력 || 0) + numericEffectValue); break;
            case EffectStats.DIPLOMACY_POINTS_FLAT: if (typeof numericEffectValue === 'number') country.외교력 = Math.min(1000, (country.외교력 || 0) + numericEffectValue); break;
            case EffectStats.RESOURCE_POINTS_FLAT: if (typeof numericEffectValue === 'number') country.자원보유량 = Math.min(1000, (country.자원보유량 || 0) + numericEffectValue); break;
            case EffectStats.POLITICAL_CAPITAL_FLAT: if (typeof numericEffectValue === 'number') country.politicalCapital = Math.min(MAX_POLITICAL_CAPITAL, country.politicalCapital + numericEffectValue); break;
            case EffectStats.DEFENSE_BUDGET_ABS_FLAT: 
                if (typeof numericEffectValue === 'number') {
                     country.currentDefenseBudget += numericEffectValue;
                     // Update defenseBudgetRatio if currentDefenseBudget changes significantly due to policy
                     if (country.currentGDP > 0) {
                        country.defenseBudgetRatio = Math.max(0, Math.min(MAX_DEFENSE_BUDGET_RATIO_HARD_CAP, (country.currentDefenseBudget / country.currentGDP) * 100));
                     }
                }
                break;
            case EffectStats.GRANT_NATIONAL_SPIRIT:
              if (typeof effect.value === 'string') { 
                if (!country.nationalSpirits.includes(effect.value)) {
                  country.nationalSpirits.push(effect.value);
                  const spiritName = ALL_NATIONAL_SPIRITS[effect.value]?.name || effect.value;
                  addLogEntry(`${country.국가명}이(가) 국가 정신 "${spiritName}"을(를) 획득했습니다. (정책: ${policy.name})`, currentDate);
                }
              }
              break;
            case EffectStats.RESISTANCE_LEVEL_FLAT: 
              if (typeof numericEffectValue === 'number' && effect.target === 'occupied_territories') {
                  Object.values(country.occupiedTerritoryData).forEach(ot => {
                      ot.resistanceLevel = Math.max(0, Math.min(MAX_RESISTANCE_LEVEL, ot.resistanceLevel + numericEffectValue));
                  });
              }
              break;
          }
        }
      });
      
      country.activePolicies.push(policyId);
      country = recalculatePolicyEffectModifiers(country); 
      country = recalculateNationalSpiritEffectModifiers(country); 
      currentCountries[countryId] = country;


      const enactedBy = isAIAction ? "[AI 자동 위임]" : "";
      addLogEntry(`${country.국가명}에서 "${policy.name}" 정책을 제정했습니다. ${enactedBy}`, currentDate);
      return currentCountries;
    });
  }, [addLogEntry, currentDate, recalculatePolicyEffectModifiers, recalculateNationalSpiritEffectModifiers]);

  const handleToggleAutoEnactPolicies = useCallback(() => {
    setAutoEnactPolicies(prev => {
      const newState = !prev;
      addLogEntry(`정책 자동 위임 기능이 ${newState ? '활성화' : '비활성화'}되었습니다.`, currentDate);
      return newState;
    });
  }, [addLogEntry, currentDate]);

  const handleToggleAutoDelegateDiplomacy = useCallback(() => {
    setAutoDelegateDiplomacy(prev => {
        const newState = !prev;
        addLogEntry(`외교 자동 위임 기능이 ${newState ? '활성화' : '비활성화'}되었습니다.`, currentDate);
        return newState;
    });
  }, [addLogEntry, currentDate]);


  // Budget Management Callbacks
  const handleUpdateDefenseBudgetRatio = useCallback((countryId: string, newRatio: number) => {
    setAllCountriesState(prev => {
        const currentCountries = { ...prev };
        const country = currentCountries[countryId];
        if (country && !country.autoManageBudget) {
            country.defenseBudgetRatio = Math.max(0, Math.min(MAX_DEFENSE_BUDGET_RATIO_HARD_CAP, newRatio));
            currentCountries[countryId] = { ...country };
            return currentCountries;
        }
        return prev;
    });
  }, []);

  const handleUpdateCivilianAllocation = useCallback((countryId: string, newAllocation: CivilianBudgetAllocation) => {
      setAllCountriesState(prev => {
          const currentCountries = { ...prev };
          const country = currentCountries[countryId];
          if (country && !country.autoManageBudget) {
              // Ensure total is 100%
              const total = Object.values(newAllocation).reduce((sum, val) => sum + val, 0);
              if (Math.abs(total - 100) < 0.1) { // Allow for small float inaccuracies
                  country.civilianAllocation = { ...newAllocation };
                  currentCountries[countryId] = { ...country };
                  return currentCountries;
              } else {
                  console.warn("Civilian allocation does not sum to 100%. Ignoring update.", newAllocation);
                  // Optionally add log entry for player
                  if(country.isPlayer) addLogEntry("민간 투자 배분 총합이 100%가 되어야 합니다.", currentDate);
              }
          }
          return prev;
      });
  }, [addLogEntry, currentDate]);

  const handleToggleAutoManageBudget = useCallback((countryId: string) => {
      setAllCountriesState(prev => {
          const currentCountries = { ...prev };
          const country = currentCountries[countryId];
          if (country && country.isPlayer) { // Only player can toggle this for their own country
              country.autoManageBudget = !country.autoManageBudget;
              addLogEntry(`${country.국가명} 예산 자동 관리가 ${country.autoManageBudget ? '활성화' : '비활성화'}되었습니다.`, currentDate);
              currentCountries[countryId] = { ...country };
              return currentCountries;
          }
          return prev;
      });
  }, [addLogEntry, currentDate]);


  const handleStartGame = useCallback((selectedPlayerCountryId: string) => {
    setPlayerCountryId(selectedPlayerCountryId);
    const gameStartDate = { ...INITIAL_GAME_DATE, currentEraId: INITIAL_GAME_ERA_ID };
    setCurrentDate(gameStartDate);

    setAllCountriesState(() => {
      const newInitialStates: Record<string, CountryInGame> = {};
      const countryIds = Object.keys(countryDetailsData).filter(id => id !== "DEFAULT");

      countryIds.forEach(id => {
            const details = countryDetailsData[id];
            const occupiedTerritoryDataWithRebels: Record<string, OccupiedTerritory> = {};
            let baseCountry: CountryInGame = {
                ...details,
                currentPopulation: details.인구수 ?? 0,
                currentGDP: details.GDP ?? 0,
                currentDefenseBudget: 0, 
                currentMilitary: { army: details.육군전투력 ?? 50, navy: details.해군전투력 ?? 50, airforce: details.공군전투력 ?? 50 },
                // FIX: Initialize currentMaxMilitary
                currentMaxMilitary: { army: details.육군전투력 ?? 50, navy: details.해군전투력 ?? 50, airforce: details.공군전투력 ?? 50 },
                경제력: details.경제력 ?? 50, 기술력: details.기술력 ?? 50, 외교력: details.외교력 ?? 50, 자원보유량: details.자원보유량 ?? 50,
                territories: [id],
                isEliminated: false,
                atWarWith: [],
                aggressionScore: Math.floor(Math.random() * 30) + 5,
                isPlayer: id === selectedPlayerCountryId,
                politicalCapital: id === selectedPlayerCountryId ? 75 : 50, // Player gets a bit more PC
                activePolicies: [],
                policyEffectModifiers: {},
                nationalSpirits: [],
                nationalSpiritEffectModifiers: {},
                occupiedTerritoryData: occupiedTerritoryDataWithRebels,
                defenseBudgetRatio: id === selectedPlayerCountryId ? DEFAULT_DEFENSE_BUDGET_RATIO : (Math.floor(Math.random() * 5) + 3), 
                civilianAllocation: { ...DEFAULT_CIVILIAN_ALLOCATION }, 
                autoManageBudget: id === selectedPlayerCountryId ? true : true, // Player default auto, AI auto
                eliminatedTick: undefined,
                relations: {},
                allies: [],
                truces: [],
                pendingDiplomaticProposals: [],
            };
            baseCountry.currentDefenseBudget = baseCountry.currentGDP * (baseCountry.defenseBudgetRatio / 100);
            baseCountry = recalculatePolicyEffectModifiers(baseCountry);
            baseCountry = recalculateNationalSpiritEffectModifiers(baseCountry);
            newInitialStates[id] = baseCountry;
        });
        
        // Initialize relations between all countries
        countryIds.forEach(id1 => {
            countryIds.forEach(id2 => {
                if (id1 !== id2) {
                    if (!newInitialStates[id1].relations[id2]) {
                        newInitialStates[id1].relations[id2] = RELATIONS_INITIAL_DEFAULT;
                    }
                    if (!newInitialStates[id2].relations[id1]) {
                       newInitialStates[id2].relations[id1] = RELATIONS_INITIAL_DEFAULT;
                    }
                }
            });
        });
      return newInitialStates;
    });
    
    setActiveWars([]);
    setGameMode('playing');
    setTotalTicks(0);
    setPlayerStatHistory([]); 
    setAutoEnactPolicies(true); 
    setAutoDelegateDiplomacy(true);
    setCurrentGameSpeed(AVAILABLE_GAME_SPEEDS.find(s => s.id === 'normal') || AVAILABLE_GAME_SPEEDS[2]);
    const startedCountryName = countryDetailsData[selectedPlayerCountryId]?.국가명 || '선택한 국가';
    const startMessage = `${startedCountryName}(으)로 시뮬레이션을 시작합니다.`;
    setGameMessage(startMessage);
    addLogEntry(startMessage, gameStartDate);
  }, [addLogEntry, recalculatePolicyEffectModifiers, recalculateNationalSpiritEffectModifiers]);

  const handleSpeedChange = useCallback((speedId: GameSpeed['id']) => {
    const newSpeed = AVAILABLE_GAME_SPEEDS.find(s => s.id === speedId) || AVAILABLE_GAME_SPEEDS[0];
    setCurrentGameSpeed(newSpeed);
    if (newSpeed.id === 'paused') {
      if (gameMode === 'playing') {
        setGameMode('paused');
        addLogEntry("게임이 일시 정지되었습니다.", currentDate);
      }
    } else {
      if (gameMode === 'paused' || gameMode === 'playing') { 
         setGameMode('playing');
         if (gameMode === 'paused' && gameLogs.length > 0 && !gameLogs[0].includes("게임이 재개되었습니다.")) { 
            addLogEntry("게임이 재개되었습니다.", currentDate);
         }
      }
    }
  }, [gameMode, addLogEntry, currentDate, gameLogs]);


  // Diplomacy Action Handlers
  const handleImproveRelations = useCallback((sourceId: string, targetId: string) => {
    setAllCountriesState(prev => {
      const current = JSON.parse(JSON.stringify(prev)) as Record<string, CountryInGame>;
      const sourceCountry = current[sourceId];
      const targetCountry = current[targetId];

      if (!sourceCountry || !targetCountry || sourceCountry.isEliminated || targetCountry.isEliminated) return prev;
      if (sourceCountry.allies.includes(targetId)) {
        addLogEntry(`${sourceCountry.국가명}: ${targetCountry.국가명}와(과)는 이미 동맹입니다.`, currentDate);
        return prev;
      }
      if (sourceCountry.politicalCapital < PC_COST_IMPROVE_RELATIONS) {
        addLogEntry(`${sourceCountry.국가명}: 관계 개선에 필요한 정치 자본(${PC_COST_IMPROVE_RELATIONS})이 부족합니다. (현재: ${sourceCountry.politicalCapital.toFixed(1)})`, currentDate);
        return prev;
      }

      sourceCountry.politicalCapital -= PC_COST_IMPROVE_RELATIONS;
      sourceCountry.relations[targetId] = Math.min(RELATIONS_MAX, (sourceCountry.relations[targetId] || 0) + RELATION_IMPROVEMENT_PER_ACTION);
      targetCountry.relations[sourceId] = Math.min(RELATIONS_MAX, (targetCountry.relations[sourceId] || 0) + RELATION_IMPROVEMENT_PER_ACTION);
      
      addLogEntry(`${sourceCountry.국가명}이(가) ${targetCountry.국가명}와(과)의 관계를 개선했습니다. (관계: ${sourceCountry.relations[targetId].toFixed(0)})`, currentDate);
      return current;
    });
  }, [currentDate, addLogEntry, totalTicks]);

  const handleHarmRelations = useCallback((sourceId: string, targetId: string) => {
    setAllCountriesState(prev => {
      const current = JSON.parse(JSON.stringify(prev)) as Record<string, CountryInGame>;
      const sourceCountry = current[sourceId];
      const targetCountry = current[targetId];

      if (!sourceCountry || !targetCountry || sourceCountry.isEliminated || targetCountry.isEliminated) return prev;
      if (sourceCountry.politicalCapital < PC_COST_HARM_RELATIONS) {
        addLogEntry(`${sourceCountry.국가명}: 관계 악화에 필요한 정치 자본(${PC_COST_HARM_RELATIONS})이 부족합니다. (현재: ${sourceCountry.politicalCapital.toFixed(1)})`, currentDate);
        return prev;
      }

      sourceCountry.politicalCapital -= PC_COST_HARM_RELATIONS;
      sourceCountry.relations[targetId] = Math.max(RELATIONS_MIN, (sourceCountry.relations[targetId] || 0) + RELATION_HARM_PER_ACTION);
      targetCountry.relations[sourceId] = Math.max(RELATIONS_MIN, (targetCountry.relations[sourceId] || 0) + RELATION_HARM_PER_ACTION);

      addLogEntry(`${sourceCountry.국가명}이(가) ${targetCountry.국가명}와(과)의 관계를 악화시켰습니다. (관계: ${sourceCountry.relations[targetId].toFixed(0)})`, currentDate);
      return current;
    });
  }, [currentDate, addLogEntry, totalTicks]);

  const handleProposeAlliance = useCallback((sourceId: string, targetId: string) => {
    setAllCountriesState(prev => {
      const current = JSON.parse(JSON.stringify(prev)) as Record<string, CountryInGame>;
      const sourceCountry = current[sourceId];
      const targetCountry = current[targetId];

      if (!sourceCountry || !targetCountry || sourceCountry.isEliminated || targetCountry.isEliminated) return prev;
      if (sourceCountry.politicalCapital < PC_COST_PROPOSE_ALLIANCE) {
        addLogEntry(`${sourceCountry.국가명}: 동맹 제안에 필요한 정치 자본(${PC_COST_PROPOSE_ALLIANCE})이 부족합니다.`, currentDate); return prev;
      }
      if ((sourceCountry.relations[targetId] || 0) < ALLIANCE_RELATION_THRESHOLD) {
        addLogEntry(`${sourceCountry.국가명}: ${targetCountry.국가명}와(과)의 관계(${(sourceCountry.relations[targetId] || 0).toFixed(0)})가 동맹 제안 기준(${ALLIANCE_RELATION_THRESHOLD}) 미만입니다.`, currentDate); return prev;
      }
      if (sourceCountry.allies.includes(targetId) || sourceCountry.atWarWith.includes(targetId) || sourceCountry.truces.some(t => t.targetCountryId === targetId && t.endTick > totalTicks)) {
        addLogEntry(`${sourceCountry.국가명}: ${targetCountry.국가명}와(과)는 현재 동맹 제안을 할 수 없는 관계입니다.`, currentDate); return prev;
      }

      sourceCountry.politicalCapital -= PC_COST_PROPOSE_ALLIANCE;
      const proposalId = `alliance_${sourceId}_${targetId}_${totalTicks}`;
      const proposal: DiplomaticProposal = {
        id: proposalId, type: 'alliance_offer', fromCountryId: sourceId, toCountryId: targetId, expiresTick: totalTicks + (DAYS_IN_YEAR / 2)
      };
      targetCountry.pendingDiplomaticProposals = [...(targetCountry.pendingDiplomaticProposals || []), proposal];
      
      addLogEntry(`${sourceCountry.국가명}이(가) ${targetCountry.국가명}에게 동맹을 제안했습니다.`, currentDate);
      current[sourceId] = sourceCountry;
      current[targetId] = targetCountry;
      return current;
    });
  }, [currentDate, addLogEntry, totalTicks]);

  const handleBreakAlliance = useCallback((sourceId: string, allyIdToBreak: string) => {
    setAllCountriesState(prev => {
      const current = JSON.parse(JSON.stringify(prev)) as Record<string, CountryInGame>;
      const sourceCountry = current[sourceId];
      const allyToBreakCountry = current[allyIdToBreak];

      if (!sourceCountry || !allyToBreakCountry || sourceCountry.isEliminated || allyToBreakCountry.isEliminated || !sourceCountry.allies.includes(allyIdToBreak)) return prev;

      sourceCountry.politicalCapital = Math.max(0, sourceCountry.politicalCapital - PC_COST_BREAK_ALLIANCE_PENALTY);
      sourceCountry.aggressionScore = Math.min(MAX_AGGRESSION, sourceCountry.aggressionScore + AGGRESSION_HIT_BREAK_ALLIANCE);
      
      const relationUpdate = (country: CountryInGame, otherId: string) => {
        country.relations[otherId] = Math.max(RELATIONS_MIN, (country.relations[otherId] || 0) + RELATION_HIT_BREAK_ALLIANCE_WITH_ALLY);
      };
      relationUpdate(sourceCountry, allyIdToBreak);
      relationUpdate(allyToBreakCountry, sourceId);

      sourceCountry.allies = sourceCountry.allies.filter(ally => ally !== allyIdToBreak);
      allyToBreakCountry.allies = allyToBreakCountry.allies.filter(ally => ally !== sourceId);

      addLogEntry(`${sourceCountry.국가명}이(가) ${allyToBreakCountry.국가명}와(과)의 동맹을 파기했습니다.`, currentDate);
      current[sourceId] = sourceCountry;
      current[allyIdToBreak] = allyToBreakCountry;
      return current;
    });
  }, [currentDate, addLogEntry, totalTicks]);
  
  const handleOfferTruce = useCallback((sourceId: string, targetId: string) => {
    setAllCountriesState(prev => {
      const current = JSON.parse(JSON.stringify(prev)) as Record<string, CountryInGame>;
      const sourceCountry = current[sourceId];
      const targetCountry = current[targetId];

      if (!sourceCountry || !targetCountry || sourceCountry.isEliminated || targetCountry.isEliminated) return prev;
      if (!sourceCountry.atWarWith.includes(targetId)) {
         addLogEntry(`${sourceCountry.국가명}: ${targetCountry.국가명}와(과)는 현재 전쟁 중이 아닙니다.`, currentDate); return prev;
      }
      if (sourceCountry.politicalCapital < PC_COST_OFFER_TRUCE) {
        addLogEntry(`${sourceCountry.국가명}: 휴전 제안에 필요한 정치 자본(${PC_COST_OFFER_TRUCE})이 부족합니다.`, currentDate); return prev;
      }
      
      sourceCountry.politicalCapital -= PC_COST_OFFER_TRUCE;
      const proposalId = `truce_${sourceId}_${targetId}_${totalTicks}`;
      const proposal: DiplomaticProposal = {
        id: proposalId, type: 'truce_offer', fromCountryId: sourceId, toCountryId: targetId, expiresTick: totalTicks + (DAYS_IN_YEAR / 4)
      };
      targetCountry.pendingDiplomaticProposals = [...(targetCountry.pendingDiplomaticProposals || []), proposal];

      addLogEntry(`${sourceCountry.국가명}이(가) ${targetCountry.국가명}에게 휴전을 제안했습니다.`, currentDate);
      current[sourceId] = sourceCountry;
      current[targetId] = targetCountry;
      return current;
    });
  }, [currentDate, addLogEntry, totalTicks]);

  const handleDeclareWar = useCallback((attackerId: string, defenderId: string) => {
    setAllCountriesState(prev => {
      const current = JSON.parse(JSON.stringify(prev)) as Record<string, CountryInGame>;
      const attacker = current[attackerId];
      const defender = current[defenderId];

      if (!attacker || !defender || attacker.isEliminated || defender.isEliminated) return prev;
      if (attacker.politicalCapital < PC_COST_DECLARE_WAR) {
        addLogEntry(`${attacker.국가명}: 선전포고에 필요한 정치 자본(${PC_COST_DECLARE_WAR})이 부족합니다.`, currentDate); return prev;
      }
      if (attacker.allies.includes(defenderId) || attacker.atWarWith.includes(defenderId) || attacker.truces.some(t => t.targetCountryId === defenderId && t.endTick > totalTicks)) {
         addLogEntry(`${attacker.국가명}: ${defender.국가명}에 현재 선전포고를 할 수 없습니다 (동맹/전쟁중/휴전중).`, currentDate); return prev;
      }

      attacker.politicalCapital -= PC_COST_DECLARE_WAR;
      attacker.aggressionScore = Math.min(MAX_AGGRESSION, attacker.aggressionScore + AGGRESSION_HIT_DECLARE_WAR);
      attacker.relations[defenderId] = RELATION_HIT_DECLARE_WAR;
      defender.relations[attackerId] = RELATION_HIT_DECLARE_WAR;

      attacker.atWarWith = [...new Set([...attacker.atWarWith, defenderId])];
      defender.atWarWith = [...new Set([...defender.atWarWith, attackerId])];
      
      attacker.truces = attacker.truces.filter(t => t.targetCountryId !== defenderId);
      defender.truces = defender.truces.filter(t => t.targetCountryId !== attackerId);

      const newWar: WarDetails = {
        id: `${attackerId}_vs_${defenderId}_${currentDate.year}-${currentDate.day}-${totalTicks}`,
        attackerId: attackerId,
        defenderId: defenderId,
        startDate: currentDate,
        ticksToResolution: WAR_TICKS_DURATION + Math.floor(Math.random() * 10) - 5,
      };
      setActiveWars(prevWars => [...prevWars, newWar]);
      addLogEntry(`${attacker.국가명}이(가) ${defender.국가명}에 선전포고했습니다!`, currentDate);
      current[attackerId] = attacker;
      current[defenderId] = defender;
      return current;
    });
  }, [currentDate, addLogEntry, totalTicks]);
  
  const handleRespondToDiplomaticProposal = useCallback((respondingCountryId: string, proposalId: string, accepted: boolean) => {
    setAllCountriesState(prev => {
      const current = JSON.parse(JSON.stringify(prev)) as Record<string, CountryInGame>;
      const respondingCountry = current[respondingCountryId];
      if (!respondingCountry || respondingCountry.isEliminated) return prev;

      const proposalIndex = (respondingCountry.pendingDiplomaticProposals || []).findIndex(p => p.id === proposalId);
      if (proposalIndex === -1) {
        addLogEntry(`오류: ${respondingCountry.국가명}이(가) 존재하지 않는 외교 제안(${proposalId})에 응답하려 했습니다.`, currentDate);
        return prev;
      }
      
      const proposal = respondingCountry.pendingDiplomaticProposals[proposalIndex];
      const fromCountry = current[proposal.fromCountryId];
      if (!fromCountry || fromCountry.isEliminated) {
          addLogEntry(`오류: 제안자 ${proposal.fromCountryId}가 존재하지 않거나 소멸되어 응답할 수 없습니다.`, currentDate);
          respondingCountry.pendingDiplomaticProposals.splice(proposalIndex, 1);
          current[respondingCountryId] = respondingCountry;
          return current;
      }

      respondingCountry.pendingDiplomaticProposals.splice(proposalIndex, 1);

      if (accepted) {
        if (proposal.type === 'alliance_offer') {
          respondingCountry.allies = [...new Set([...respondingCountry.allies, proposal.fromCountryId])];
          fromCountry.allies = [...new Set([...fromCountry.allies, respondingCountryId])];
          respondingCountry.relations[proposal.fromCountryId] = Math.min(RELATIONS_MAX, (respondingCountry.relations[proposal.fromCountryId] || 0) + 10);
          fromCountry.relations[respondingCountryId] = Math.min(RELATIONS_MAX, (fromCountry.relations[respondingCountryId] || 0) + 10);
          addLogEntry(`${respondingCountry.국가명}이(가) ${fromCountry.국가명}의 동맹 제안을 수락했습니다.`, currentDate);
        } else if (proposal.type === 'truce_offer') {
          respondingCountry.atWarWith = respondingCountry.atWarWith.filter(id => id !== proposal.fromCountryId);
          fromCountry.atWarWith = fromCountry.atWarWith.filter(id => id !== respondingCountryId);
          setActiveWars(prevWars => prevWars.filter(war =>
            !((war.attackerId === respondingCountryId && war.defenderId === proposal.fromCountryId) ||
              (war.attackerId === proposal.fromCountryId && war.defenderId === respondingCountryId))
          ));
          const truceEndTick = totalTicks + DEFAULT_TRUCE_DURATION_TICKS;
          const newTruceForResponder: TruceDetails = { targetCountryId: proposal.fromCountryId, endTick: truceEndTick };
          const newTruceForProposer: TruceDetails = { targetCountryId: respondingCountryId, endTick: truceEndTick };
          respondingCountry.truces = [...(respondingCountry.truces || []), newTruceForResponder];
          fromCountry.truces = [...(fromCountry.truces || []), newTruceForProposer];
          respondingCountry.relations[proposal.fromCountryId] = Math.min(RELATIONS_MAX, (respondingCountry.relations[proposal.fromCountryId] || 0) + TRUCE_RELATION_IMPROVEMENT_ON_ACCEPT);
          fromCountry.relations[respondingCountryId] = Math.min(RELATIONS_MAX, (fromCountry.relations[respondingCountryId] || 0) + TRUCE_RELATION_IMPROVEMENT_ON_ACCEPT);
          addLogEntry(`${respondingCountry.국가명}이(가) ${fromCountry.국가명}의 휴전 제안을 수락했습니다. ${Math.ceil(DEFAULT_TRUCE_DURATION_TICKS/DAYS_IN_YEAR)}년간 휴전합니다.`, currentDate);
        }
      } else { // Rejected
        respondingCountry.relations[proposal.fromCountryId] = Math.max(RELATIONS_MIN, (respondingCountry.relations[proposal.fromCountryId] || 0) - 5);
        fromCountry.relations[respondingCountryId] = Math.max(RELATIONS_MIN, (fromCountry.relations[respondingCountryId] || 0) - 5);
        addLogEntry(`${respondingCountry.국가명}이(가) ${fromCountry.국가명}의 ${proposal.type === 'alliance_offer' ? '동맹' : '휴전'} 제안을 거절했습니다.`, currentDate);
      }
      current[respondingCountryId] = respondingCountry;
      current[proposal.fromCountryId] = fromCountry;
      return current;
    });
  }, [currentDate, addLogEntry, totalTicks]);

  // Main Game Loop
  useEffect(() => {
    if (gameMode !== 'playing' || currentGameSpeed.ticksPerSecond === 0) {
      return;
    }

    const intervalId = setInterval(() => {
      const currentTickForProcessing = totalTicks + 1; 
      setTotalTicks(prev => prev + 1);
      
      let gameTickDateUpdate: GameDate = currentDate; 

      setCurrentDate(prevDate => {
        let newDay = prevDate.day + 1;
        let newYear = prevDate.year;
        let newEraId = prevDate.currentEraId;

        if (newDay > DAYS_IN_YEAR) {
          newDay = 1;
          newYear += 1;
        }
        
        const sortedEras = Object.values(ALL_ERAS).sort((a, b) => a.startYearThreshold - b.startYearThreshold);
        const currentEraIndex = sortedEras.findIndex(e => e.id === newEraId);
        if (currentEraIndex !== -1 && currentEraIndex < sortedEras.length - 1) {
            const nextEra = sortedEras[currentEraIndex + 1];
            if (newYear >= nextEra.startYearThreshold) {
                newEraId = nextEra.id;
                addLogEntry(`${ALL_ERAS[newEraId]?.name || newEraId} 시대가 도래했습니다!`, {year: newYear, day: newDay, currentEraId: newEraId});
            }
        }
        gameTickDateUpdate = { year: newYear, day: newDay, currentEraId: newEraId };
        return gameTickDateUpdate;
      });

      setAllCountriesState(prevCountries => {
        let newCountriesState: Record<string, CountryInGame> = JSON.parse(JSON.stringify(prevCountries)); 
        let newActiveWarsForTick: WarDetails[] = []; 


        Object.keys(newCountriesState).forEach(id => {
          const country = newCountriesState[id];
          if (country.isEliminated) return;

          // Clear expired truces
          country.truces = (country.truces || []).filter(truce => {
            if (truce.endTick <= currentTickForProcessing) {
              addLogEntry(`${country.국가명}와(과) ${newCountriesState[truce.targetCountryId]?.국가명 || '알 수 없는 국가'} 간의 휴전이 만료되었습니다.`, gameTickDateUpdate);
              return false;
            }
            return true;
          });

          // Clear expired diplomatic proposals
          country.pendingDiplomaticProposals = (country.pendingDiplomaticProposals || []).filter(proposal => {
            if (proposal.expiresTick && proposal.expiresTick <= currentTickForProcessing) {
              // Silently remove expired proposals, or add log if desired
              // addLogEntry(`${newCountriesState[proposal.fromCountryId]?.국가명}이(가) ${country.국가명}에게 보낸 ${proposal.type} 제안이 만료되었습니다.`, gameTickDateUpdate);
              return false;
            }
            return true;
          });


          const policyMod = country.policyEffectModifiers;
          const spiritMod = country.nationalSpiritEffectModifiers;

          // AI Budget Management
          if (country.autoManageBudget || !country.isPlayer) {
              if (country.atWarWith.length > 0) { // Wartime
                  country.defenseBudgetRatio = Math.min(MAX_DEFENSE_BUDGET_RATIO_HARD_CAP, Math.max(8, Math.min(20, country.defenseBudgetRatio + 0.5))); // Increase defense budget
                  let remainingCivilian = 100;
                  country.civilianAllocation.technology = Math.min(40, Math.max(20, country.civilianAllocation.technology + 1)); remainingCivilian -= country.civilianAllocation.technology;
                  country.civilianAllocation.resources = Math.min(30, Math.max(15, country.civilianAllocation.resources + 0.5)); remainingCivilian -= country.civilianAllocation.resources;
                  country.civilianAllocation.economy = Math.min(30, Math.max(10, remainingCivilian * 0.6)); remainingCivilian -= country.civilianAllocation.economy;
                  country.civilianAllocation.diplomacy = Math.max(5, remainingCivilian); // Remainder to diplomacy
              } else { // Peacetime
                  country.defenseBudgetRatio = Math.max(3, Math.min(DEFAULT_DEFENSE_BUDGET_RATIO, country.defenseBudgetRatio - 0.2));
                  // Basic balancing: if a stat is low, increase its allocation
                  let allocations = { ...country.civilianAllocation };
                  if (country.기술력 < country.경제력 * 0.8 && country.기술력 < 700) allocations.technology = Math.min(40, allocations.technology + 2);
                  else if (allocations.technology > 25) allocations.technology -=1;

                  if (country.자원보유량 < 300) allocations.resources = Math.min(35, allocations.resources + 2);
                  else if (allocations.resources > 20) allocations.resources -=1;
                  
                  if (country.외교력 < 400) allocations.diplomacy = Math.min(30, allocations.diplomacy + 1);
                  else if (allocations.diplomacy > 15) allocations.diplomacy -=0.5;

                  // Normalize civilian allocations to sum to 100
                  let currentTotal = allocations.economy + allocations.technology + allocations.diplomacy + allocations.resources;
                  if (currentTotal !== 100) {
                      allocations.economy = Math.max(10, allocations.economy + (100-currentTotal)*0.4); // Economy gets a large share of remainder/deficit
                      allocations.technology = Math.max(10, allocations.technology + (100-currentTotal)*0.3);
                      allocations.diplomacy = Math.max(5, allocations.diplomacy + (100-currentTotal)*0.15);
                      allocations.resources = Math.max(5, allocations.resources + (100-currentTotal)*0.15);
                      currentTotal = allocations.economy + allocations.technology + allocations.diplomacy + allocations.resources;
                      if(currentTotal !== 100 && currentTotal > 0) { // Final normalization pass
                         const scaleFactor = 100 / currentTotal;
                         allocations.economy *= scaleFactor;
                         allocations.technology *= scaleFactor;
                         allocations.diplomacy *= scaleFactor;
                         allocations.resources *= scaleFactor;
                      } else if (currentTotal === 0) { // Avoid division by zero, reset to default if all are zero
                         allocations = { ...DEFAULT_CIVILIAN_ALLOCATION };
                      }
                  }
                  country.civilianAllocation = allocations;
              }
              // Ensure civilian allocations are rounded and sum to 100 after AI adjustments
              let ca = country.civilianAllocation;
              ca.economy = Math.round(ca.economy); ca.technology = Math.round(ca.technology);
              ca.diplomacy = Math.round(ca.diplomacy); ca.resources = Math.round(ca.resources);
              let sum = ca.economy + ca.technology + ca.diplomacy + ca.resources;
              if (sum !== 100 && sum > 0) {
                ca.economy += (100-sum); // Add difference to economy
              } else if (sum === 0) {
                 ca = { ...DEFAULT_CIVILIAN_ALLOCATION }; // Reset if sum is zero
              }
              country.civilianAllocation = ca;
          }
          country.currentDefenseBudget = country.currentGDP * (country.defenseBudgetRatio / 100);


          let pcGrowth = BASE_POLITICAL_CAPITAL_PER_TICK + ((country.외교력 || 0) / POLITICAL_CAPITAL_FROM_DIPLOMACY_SCALE);
          pcGrowth += (policyMod[EffectStats.POLITICAL_CAPITAL_PER_TICK_FLAT] || 0) + (spiritMod[EffectStats.POLITICAL_CAPITAL_PER_TICK_FLAT] || 0);
          country.politicalCapital = Math.min(MAX_POLITICAL_CAPITAL, country.politicalCapital + pcGrowth);

          // Resistance and Rebellion (Unchanged for now)
          Object.entries(country.occupiedTerritoryData).forEach(([territoryId, territory]) => {
            if (territory.productionDisruptionTicks > 0) { territory.productionDisruptionTicks -=1; }
            let resistanceChangeRateBonus = (policyMod[EffectStats.RESISTANCE_GROWTH_RATE_PERC] || 0) + (spiritMod[EffectStats.RESISTANCE_GROWTH_RATE_PERC] || 0);
            let resistanceChange = RESISTANCE_GROWTH_PER_TICK * (1 + resistanceChangeRateBonus);
            territory.resistanceLevel = Math.min(MAX_RESISTANCE_LEVEL, Math.max(0, territory.resistanceLevel + resistanceChange));
            let rebellionRiskChange = 0;
            if (territory.resistanceLevel > MIN_RESISTANCE_FOR_RISK_GROWTH) {
                rebellionRiskChange = (territory.resistanceLevel / MAX_RESISTANCE_LEVEL) * (1 / REBELLION_RISK_FROM_RESISTANCE_SCALE) * 0.5; 
            } else {
                rebellionRiskChange = -REBELLION_RISK_DECAY_PER_TICK; 
            }
            const rebellionRiskChangeRatePolicyBonus = (policyMod[EffectStats.REBELLION_RISK_CHANGE_RATE_PERC] || 0) + (spiritMod[EffectStats.REBELLION_RISK_CHANGE_RATE_PERC] || 0);
            rebellionRiskChange *= (1 + rebellionRiskChangeRatePolicyBonus);
            territory.rebellionRisk = Math.min(100, Math.max(0, territory.rebellionRisk + rebellionRiskChange));
            if (territory.rebellionRisk > REBELLION_RISK_THRESHOLD && territory.productionDisruptionTicks === 0) {
                if (Math.random() < territory.rebellionRisk / REBELLION_CHANCE_DIVISOR) {
                    let pcPenalty = REBELLION_PC_PENALTY_BASE;
                    const penaltyModifier = (policyMod[EffectStats.REBELLION_EVENT_PENALTY_MODIFIER_PERC] || 0) + (spiritMod[EffectStats.REBELLION_EVENT_PENALTY_MODIFIER_PERC] || 0);
                    pcPenalty *= (1 + penaltyModifier);
                    country.politicalCapital = Math.max(0, country.politicalCapital - pcPenalty);
                    territory.productionDisruptionTicks = REBELLION_PRODUCTION_DISRUPTION_TICKS_BASE + Math.floor(Math.random()*5);
                    const territoryName = countryDetailsData[territory.originalOwnerId]?.국가명 || `영토 (${territory.originalOwnerId})`;
                    addLogEntry(`${country.국가명}의 점령지 ${territoryName}에서 반란 발생! 정치 자본 ${pcPenalty.toFixed(1)} 감소, ${territory.productionDisruptionTicks}턴 동안 생산 차질.`, gameTickDateUpdate);
                    let baseRebelStrength = territory.rebellionRisk * REBEL_GENERATION_SCALE_FROM_RISK;
                    baseRebelStrength *= Math.max(0.1, (1 - (country.기술력 || 0) / REBEL_GENERATION_TECH_SUPPRESSION_FACTOR));
                    const rebelSuppressionBonus = (policyMod[EffectStats.REBEL_SUPPRESSION_BONUS_PERC] || 0) + (spiritMod[EffectStats.REBEL_SUPPRESSION_BONUS_PERC] || 0);
                    baseRebelStrength *= Math.max(0.1, (1 - rebelSuppressionBonus)); 
                    territory.rebelStrength = Math.max(10, Math.round(baseRebelStrength));
                    addLogEntry(`${territoryName}에 반란군 출현! (규모: ${territory.rebelStrength.toFixed(0)})`, gameTickDateUpdate);
                    territory.rebellionRisk = Math.max(0, territory.rebellionRisk - REBELLION_POST_EVENT_RISK_REDUCTION);
                    territory.resistanceLevel = Math.max(0, territory.resistanceLevel - REBELLION_POST_EVENT_RESISTANCE_REDUCTION);
                }
            }
            if (territory.rebelStrength > 0) {
                let garrisonPower = GARRISON_BASE_EFFECTIVENESS * (1 + (country.기술력 || 0) / 1000);
                const garrisonEffectivenessBonus = (policyMod[EffectStats.GARRISON_EFFECTIVENESS_PERC] || 0) + (spiritMod[EffectStats.GARRISON_EFFECTIVENESS_PERC] || 0);
                garrisonPower *= (1 + garrisonEffectivenessBonus);
                const rebelSuppressionBonus = (policyMod[EffectStats.REBEL_SUPPRESSION_BONUS_PERC] || 0) + (spiritMod[EffectStats.REBEL_SUPPRESSION_BONUS_PERC] || 0);
                let rebelLosses = territory.rebelStrength * (garrisonPower / (garrisonPower + territory.rebelStrength)) * REBEL_VS_GARRISON_ATTRITION_FACTOR * (1 + rebelSuppressionBonus);
                let garrisonCasualties = garrisonPower * (territory.rebelStrength / (garrisonPower + territory.rebelStrength)) * REBEL_VS_GARRISON_ATTRITION_FACTOR * GARRISON_LOSS_FACTOR_VS_REBELS;
                garrisonCasualties = Math.max(0, Math.min(country.currentMilitary.army, Math.round(garrisonCasualties)));
                territory.rebelStrength = Math.max(0, Math.round(territory.rebelStrength - rebelLosses));
                country.currentMilitary.army = Math.max(0, country.currentMilitary.army - garrisonCasualties);
                if (garrisonCasualties > 0) {
                     addLogEntry(`${country.국가명} 주둔군, ${countryDetailsData[territory.originalOwnerId]?.국가명 || territory.originalOwnerId} 반란군과 교전. 사상자 ${garrisonCasualties.toFixed(0)}명 발생. 반란군 잔존 세력 ${territory.rebelStrength}.`, gameTickDateUpdate);
                }
                if (territory.rebelStrength <= 0) {
                    territory.rebelStrength = 0;
                    const territoryName = countryDetailsData[territory.originalOwnerId]?.국가명 || `영토 (${territory.originalOwnerId})`;
                    addLogEntry(`${territoryName}의 반란군이 주둔군에 의해 진압되었습니다.`, gameTickDateUpdate);
                    territory.rebellionRisk = Math.max(0, territory.rebellionRisk - REBELLION_POST_EVENT_RISK_REDUCTION * 1.5);
                    territory.resistanceLevel = Math.max(0, territory.resistanceLevel - REBELLION_POST_EVENT_RESISTANCE_REDUCTION * 1.5);
                }
                if (territory.rebelStrength > REBEL_STRENGTH_DISRUPTION_THRESHOLD && territory.productionDisruptionTicks === 0) {
                    territory.productionDisruptionTicks = 1; 
                }
            }
            country.occupiedTerritoryData[territoryId] = territory;
          });
          
          let gdpGrowthFromPolicies = (policyMod[EffectStats.GDP_GROWTH_RATE_PERC] || 0) + (spiritMod[EffectStats.GDP_GROWTH_RATE_PERC] || 0);
          let resourceGainFromPolicies = (policyMod[EffectStats.RESOURCE_POINTS_PER_TICK_FLAT] || 0) + (spiritMod[EffectStats.RESOURCE_POINTS_PER_TICK_FLAT] || 0);
          let techGainFromPolicies = (policyMod[EffectStats.TECH_POINTS_PER_TICK_FLAT] || 0) + (spiritMod[EffectStats.TECH_POINTS_PER_TICK_FLAT] || 0);
          let diplomacyGainFromPolicies = (policyMod[EffectStats.DIPLOMACY_POINTS_PER_TICK_FLAT] || 0) + (spiritMod[EffectStats.DIPLOMACY_POINTS_PER_TICK_FLAT] || 0);

          // Apply budget effects
          let gdpGrowthRate = BASE_GDP_GROWTH_RATE_PER_TICK * (1 + country.civilianAllocation.economy / BUDGET_ECONOMY_EFFECT_SCALE);
          gdpGrowthRate += gdpGrowthFromPolicies; // Add policy/spirit bonuses

          let techPointsGain = BASE_TECH_POINTS_PER_TICK * (1 + country.civilianAllocation.technology / BUDGET_TECHNOLOGY_EFFECT_SCALE);
          techPointsGain += techGainFromPolicies;

          let diplomacyPointsGain = BASE_DIPLOMACY_POINTS_PER_TICK * (1 + country.civilianAllocation.diplomacy / BUDGET_DIPLOMACY_EFFECT_SCALE);
          diplomacyPointsGain += diplomacyGainFromPolicies;

          let resourcePointsGain = BASE_RESOURCE_POINTS_PER_TICK * (1 + country.civilianAllocation.resources / BUDGET_RESOURCES_EFFECT_SCALE);
          resourcePointsGain += resourceGainFromPolicies;
          
          // High Defense Spending Penalties
          if (country.defenseBudgetRatio > MAX_DEFENSE_BUDGET_RATIO_SOFT_CAP) {
            const excessRatio = country.defenseBudgetRatio - MAX_DEFENSE_BUDGET_RATIO_SOFT_CAP;
            gdpGrowthRate -= excessRatio * DEFENSE_SPENDING_PENALTY_GDP_FACTOR;
            resourcePointsGain -= excessRatio * DEFENSE_SPENDING_PENALTY_RESOURCE_FACTOR;
            diplomacyPointsGain -= excessRatio * DEFENSE_SPENDING_PENALTY_DIPLOMACY_FACTOR;
            if (country.isPlayer && currentTickForProcessing % 10 === 0) { // Log penalty periodically for player
                addLogEntry(`${country.국가명}: 과도한 국방 예산(${country.defenseBudgetRatio.toFixed(1)}% GDP)으로 인해 경제, 자원, 외교에 부담이 발생하고 있습니다!`, gameTickDateUpdate);
            }
          }
          gdpGrowthRate = Math.max(0.00001, gdpGrowthRate); // Ensure growth doesn't become negative from penalties alone
          resourcePointsGain = Math.max(0.001, resourcePointsGain);
          diplomacyPointsGain = Math.max(0.001, diplomacyPointsGain);
          techPointsGain = Math.max(0.001, techPointsGain);

          let totalGdpThisTick = country.currentGDP;
          if (country.atWarWith.length === 0) { // Only grow GDP if not at war (original logic)
             totalGdpThisTick *= (1 + gdpGrowthRate);
          }

          let totalResourceThisTick = (country.자원보유량 || 0) + resourcePointsGain;
          
          Object.values(country.occupiedTerritoryData).forEach(occupiedTerritory => {
              let incomePenalty = (occupiedTerritory.resistanceLevel / MAX_RESISTANCE_LEVEL) * RESISTANCE_INCOME_PENALTY_FACTOR;
              if (occupiedTerritory.productionDisruptionTicks > 0 || occupiedTerritory.rebelStrength > REBEL_STRENGTH_DISRUPTION_THRESHOLD) {
                incomePenalty = Math.max(incomePenalty, 0.9); 
              }
              let territoryGdpIncome = occupiedTerritory.baseGdpContribution * (1 - incomePenalty);
              let territoryResourceIncome = occupiedTerritory.baseResourceContribution * (1 - incomePenalty);
              let totalOccupiedIncomeBonus = (policyMod[EffectStats.OCCUPIED_TERRITORY_INCOME_PERC] || 0) + (spiritMod[EffectStats.OCCUPIED_TERRITORY_INCOME_PERC] || 0);
              territoryGdpIncome *= (1 + totalOccupiedIncomeBonus);
              territoryResourceIncome *= (1 + totalOccupiedIncomeBonus);
              totalGdpThisTick += territoryGdpIncome; 
              totalResourceThisTick += territoryResourceIncome; 
          });
          
          country.currentGDP = Math.max(1, totalGdpThisTick); // Ensure GDP doesn't hit zero
          country.자원보유량 = Math.min(1000, Math.max(0, totalResourceThisTick));
          country.기술력 = Math.min(1000, Math.max(0, (country.기술력 || 0) + techPointsGain));
          country.외교력 = Math.min(1000, Math.max(0, (country.외교력 || 0) + diplomacyPointsGain));
          country.경제력 = Math.min(1000, Math.max(10, Math.round((country.currentGDP / 1e12) * 35)));

          if (country.isPlayer && autoEnactPolicies && !country.isEliminated) {
              const availableForAI: Policy[] = Object.values(ALL_POLICIES).filter(p => {
                if (country.activePolicies.includes(p.id)) return false;
                if (p.prerequisites?.eraRequirement && p.prerequisites.eraRequirement !== gameTickDateUpdate.currentEraId) return false;
                if (p.prerequisites?.techLevel && (country.기술력 || 0) < p.prerequisites.techLevel) return false;
                if (p.cost.politicalCapital && country.politicalCapital < p.cost.politicalCapital) return false;
                return true;
              }).sort((a, b) => (a.cost.politicalCapital || 0) - (b.cost.politicalCapital || 0));

              if (availableForAI.length > 0) {
                const minPCCost = availableForAI[0].cost.politicalCapital || 0;
                const cheapestPolicies = availableForAI.filter(p => (p.cost.politicalCapital || 0) === minPCCost);
                const policyToEnactByAI = cheapestPolicies[Math.floor(Math.random() * cheapestPolicies.length)];
                
                if (policyToEnactByAI) {
                  handleEnactPolicy(id, policyToEnactByAI.id, true); 
                }
              }
          }
        });

        // Consolidate activeWars from previous state and newly generated ones
        let currentActiveWars = [...activeWars, ...newActiveWarsForTick];
        const resolvedWarIds = new Set<string>();


        for (let i = currentActiveWars.length - 1; i >= 0; i--) {
          const war = currentActiveWars[i];
          let attacker = newCountriesState[war.attackerId];
          let defender = newCountriesState[war.defenderId];

           if (!attacker || attacker.isEliminated || !defender || defender.isEliminated) {
            resolvedWarIds.add(war.id);
            continue;
          }
          const attackerPolicyMod = attacker.policyEffectModifiers;
          const attackerSpiritMod = attacker.nationalSpiritEffectModifiers;
          const defenderPolicyMod = defender.policyEffectModifiers;
          const defenderSpiritMod = defender.nationalSpiritEffectModifiers;

          const attackerDefenseBonus = (attackerPolicyMod[EffectStats.DEFENSE_EFFECTIVENESS_PERC] || 0) + (attackerSpiritMod[EffectStats.DEFENSE_EFFECTIVENESS_PERC] || 0);
          // FIX: Corrected typo from spiritMod to defenderSpiritMod
          const defenderDefenseBonus = (defenderPolicyMod[EffectStats.DEFENSE_EFFECTIVENESS_PERC] || 0) + (defenderSpiritMod[EffectStats.DEFENSE_EFFECTIVENESS_PERC] || 0);
          const attackerEnemyAttritionBonus = (attackerPolicyMod[EffectStats.ENEMY_ATTRITION_PERC] || 0) + (attackerSpiritMod[EffectStats.ENEMY_ATTRITION_PERC] || 0);
          const defenderEnemyAttritionBonus = (defenderPolicyMod[EffectStats.ENEMY_ATTRITION_PERC] || 0) + (defenderSpiritMod[EffectStats.ENEMY_ATTRITION_PERC] || 0);


          const NORM_TECH = 500; 
          const attackerTechVal = attacker.기술력 ?? NORM_TECH;
          const defenderTechVal = defender.기술력 ?? NORM_TECH;

          let attackerMilCasualtyRate = (0.005 + Math.random() * 0.01) * (1 - (attackerTechVal - defenderTechVal) / NORM_TECH * 0.1) * (1 - defenderDefenseBonus) * (1 + defenderEnemyAttritionBonus);
          let defenderMilCasualtyRate = (0.005 + Math.random() * 0.01) * (1 - (defenderTechVal - attackerTechVal) / NORM_TECH * 0.1) * (1 - attackerDefenseBonus) * (1 + attackerEnemyAttritionBonus);
          attackerMilCasualtyRate = Math.max(0.001, Math.min(0.03, attackerMilCasualtyRate));
          defenderMilCasualtyRate = Math.max(0.001, Math.min(0.03, defenderMilCasualtyRate));

          const calculateLoss = (currentUnits: number, rate: number): number => {
              if (currentUnits === 0) return 0;
              const rawLoss = currentUnits * rate;
              return rawLoss > 0 && rawLoss < 1 ? 1 : Math.round(rawLoss);
          };

          const attackerArmyLoss = calculateLoss(attacker.currentMilitary.army, attackerMilCasualtyRate);
          const attackerNavyLoss = calculateLoss(attacker.currentMilitary.navy, attackerMilCasualtyRate * 0.7);
          const attackerAirforceLoss = calculateLoss(attacker.currentMilitary.airforce, attackerMilCasualtyRate);
          const defenderArmyLoss = calculateLoss(defender.currentMilitary.army, defenderMilCasualtyRate);
          const defenderNavyLoss = calculateLoss(defender.currentMilitary.navy, defenderMilCasualtyRate * 0.7);
          const defenderAirforceLoss = calculateLoss(defender.currentMilitary.airforce, defenderMilCasualtyRate);
          
          attacker.currentMilitary.army = Math.max(0, attacker.currentMilitary.army - attackerArmyLoss);
          attacker.currentMilitary.navy = Math.max(0, attacker.currentMilitary.navy - attackerNavyLoss);
          attacker.currentMilitary.airforce = Math.max(0, attacker.currentMilitary.airforce - attackerAirforceLoss);
          defender.currentMilitary.army = Math.max(0, defender.currentMilitary.army - defenderArmyLoss);
          defender.currentMilitary.navy = Math.max(0, defender.currentMilitary.navy - defenderNavyLoss);
          defender.currentMilitary.airforce = Math.max(0, defender.currentMilitary.airforce - defenderAirforceLoss);

          const totalAttackerMilLoss = attackerArmyLoss + attackerNavyLoss + attackerAirforceLoss;
          const totalDefenderMilLoss = defenderArmyLoss + defenderNavyLoss + defenderAirforceLoss;
          attacker.currentPopulation = Math.max(0, Math.round(attacker.currentPopulation - totalAttackerMilLoss * 0.75 - attacker.currentPopulation * 0.00002));
          defender.currentPopulation = Math.max(0, Math.round(defender.currentPopulation - totalDefenderMilLoss * 0.75 - defender.currentPopulation * 0.00002));

          const attackerGdpLossRate = 0.00035 + (totalAttackerMilLoss / (Math.max(1, attacker.육군전투력!) + Math.max(1,attacker.해군전투력!) + Math.max(1,attacker.공군전투력!))) * 0.005;
          const defenderGdpLossRate = 0.00035 + (totalDefenderMilLoss / (Math.max(1,defender.육군전투력!) + Math.max(1,defender.해군전투력!) + Math.max(1,defender.공군전투력!))) * 0.005;
          attacker.currentGDP = Math.max(0, attacker.currentGDP * (1 - Math.min(0.015, attackerGdpLossRate))); 
          defender.currentGDP = Math.max(0, defender.currentGDP * (1 - Math.min(0.015, defenderGdpLossRate))); 

          if (attackerMilCasualtyRate > 0.02) attacker.기술력 = Math.max(10, Math.round(attacker.기술력! * 0.9995));
          if (defenderMilCasualtyRate > 0.02) defender.기술력 = Math.max(10, Math.round(defender.기술력! * 0.9995));
          if (war.attackerId === attacker.id && attacker.atWarWith.length > 1) attacker.외교력 = Math.max(10, Math.round(attacker.외교력! * 0.9998));

          const resourceConsumptionRateAttacker = 0.0002 + (attacker.currentMilitary.army + attacker.currentMilitary.navy + attacker.currentMilitary.airforce) / 25000000;
          const resourceConsumptionRateDefender = 0.0002 + (defender.currentMilitary.army + defender.currentMilitary.navy + defender.currentMilitary.airforce) / 25000000;
          attacker.자원보유량 = Math.max(0, (attacker.자원보유량 || 0) - Math.max(0.01, (attacker.자원보유량 || 0) * Math.min(0.008,resourceConsumptionRateAttacker)));
          defender.자원보유량 = Math.max(0, (defender.자원보유량 || 0) - Math.max(0.01, (defender.자원보유량 || 0) * Math.min(0.008,resourceConsumptionRateDefender)));


          newCountriesState[war.attackerId] = { ...attacker };
          newCountriesState[war.defenderId] = { ...defender };

          const defenderTotalMilitary = defender.currentMilitary.army + defender.currentMilitary.navy + defender.currentMilitary.airforce;
          const attackerTotalMilitary = attacker.currentMilitary.army + attacker.currentMilitary.navy + attacker.currentMilitary.airforce;

          if (defenderTotalMilitary === 0 && !defender.isEliminated) { 
            resolvedWarIds.add(war.id);
            const defenderOriginalState = prevCountries[war.defenderId]; 
            const battleMessage = `${attacker.국가명}이(가) ${defender.국가명}의 군사력을 전멸시키고 즉시 점령했습니다!`;
            
            const newOccupiedDataForAttacker: Record<string, OccupiedTerritory> = { ...attacker.occupiedTerritoryData };
            defenderOriginalState.territories.forEach(tId => {
                if (!attacker.territories.includes(tId)) { 
                    newOccupiedDataForAttacker[tId] = {
                        originalOwnerId: defenderOriginalState.id, 
                        resistanceLevel: INITIAL_RESISTANCE_LEVEL,
                        baseGdpContribution: (defenderOriginalState.currentGDP || 1) / (defenderOriginalState.territories.length || 1),
                        baseResourceContribution: (defenderOriginalState.자원보유량 || 1) / (defenderOriginalState.territories.length || 1),
                        rebellionRisk: INITIAL_REBELLION_RISK,
                        productionDisruptionTicks: 0,
                        rebelStrength: 0, 
                    };
                }
            });
            Object.entries(defenderOriginalState.occupiedTerritoryData).forEach(([tId, occData]) => {
                if (!attacker.territories.includes(tId) && !newOccupiedDataForAttacker[tId]) {
                     newOccupiedDataForAttacker[tId] = { ...occData, rebellionRisk: occData.rebellionRisk ?? INITIAL_REBELLION_RISK, productionDisruptionTicks: occData.productionDisruptionTicks ?? 0, rebelStrength: occData.rebelStrength ?? 0 }; 
                }
            });

            newCountriesState[war.attackerId] = {
               ...attacker, 
               currentPopulation: (attacker.currentPopulation || 0) + (defenderOriginalState.currentPopulation || 0),
               기술력: Math.min(1000, (attacker.기술력 || 0) + Math.round((defenderOriginalState.기술력 || 0) * 0.15)),
               territories: [...new Set([...attacker.territories, ...defenderOriginalState.territories])],
               atWarWith: attacker.atWarWith.filter(id => id !== war.defenderId),
               aggressionScore: Math.max(0, attacker.aggressionScore - 60),
               occupiedTerritoryData: newOccupiedDataForAttacker,
            };
            newCountriesState[war.defenderId] = { 
              ...defender, 
              currentMilitary: {army:0,navy:0,airforce:0}, 
              isEliminated: true, 
              atWarWith: [], 
              occupiedTerritoryData: {},
              eliminatedTick: currentTickForProcessing 
            };
            
            setGameMessage(battleMessage);
            addLogEntry(battleMessage, gameTickDateUpdate);
            continue; 
          }
          
          if (attackerTotalMilitary === 0 && !attacker.isEliminated) {
            resolvedWarIds.add(war.id);
            const battleMessage = `${attacker.국가명}의 군사력이 전멸하여 공세가 실패했습니다. ${defender.국가명}이(가) 성공적으로 방어했습니다.`;
             newCountriesState[war.attackerId] = {
              ...attacker, 
              currentMilitary: {army:0,navy:0,airforce:0},
              atWarWith: attacker.atWarWith.filter(id => id !== war.defenderId),
              aggressionScore: Math.max(0, attacker.aggressionScore - 30),
              isEliminated: true, 
              eliminatedTick: currentTickForProcessing
            };
             newCountriesState[war.defenderId] = {
              ...defender, 
              atWarWith: defender.atWarWith.filter(id => id !== war.attackerId),
              aggressionScore: Math.max(0, defender.aggressionScore - 15) 
            };
            setGameMessage(battleMessage);
            addLogEntry(battleMessage, gameTickDateUpdate);
            continue; 
          }
          
          currentActiveWars[i].ticksToResolution -=1; // Mutate the copy for this tick
          if (currentActiveWars[i].ticksToResolution <= 0) { 
            resolvedWarIds.add(war.id);
            attacker = newCountriesState[war.attackerId]; 
            defender = newCountriesState[war.defenderId];

            if (attacker && defender && !attacker.isEliminated && !defender.isEliminated) {
              const attackerPower = (attacker.currentMilitary.army + attacker.currentMilitary.airforce * 1.2 + attacker.currentMilitary.navy * 0.8) * (1 + (attacker.기술력 || 50)/1500);
              const defenderPower = (defender.currentMilitary.army + defender.currentMilitary.airforce * 1.2 + defender.currentMilitary.navy * 0.8) * (1 + (defender.기술력 || 50)/1500);

              let battleMessage = "";
              if (attackerPower * (0.7 + Math.random() * 0.6) > defenderPower * (0.7 + Math.random() * 0.5)) { 
                const defenderOriginalState = prevCountries[war.defenderId];
                battleMessage = `${attacker.국가명}이(가) ${defender.국가명}과의 전쟁에서 승리했습니다! ${defender.국가명}은(는) 정복당했습니다.`;
                
                const newOccupiedDataForAttacker: Record<string, OccupiedTerritory> = { ...attacker.occupiedTerritoryData };
                defenderOriginalState.territories.forEach(tId => {
                    if (!attacker.territories.includes(tId)) {
                        newOccupiedDataForAttacker[tId] = {
                            originalOwnerId: defenderOriginalState.id,
                            resistanceLevel: INITIAL_RESISTANCE_LEVEL,
                            baseGdpContribution: (defenderOriginalState.currentGDP || 1) / (defenderOriginalState.territories.length || 1),
                            baseResourceContribution: (defenderOriginalState.자원보유량 || 1) / (defenderOriginalState.territories.length || 1),
                            rebellionRisk: INITIAL_REBELLION_RISK,
                            productionDisruptionTicks: 0,
                            rebelStrength: 0, 
                        };
                    }
                });
                Object.entries(defenderOriginalState.occupiedTerritoryData).forEach(([tId, occData]) => {
                  if (!attacker.territories.includes(tId) && !newOccupiedDataForAttacker[tId]) {
                       newOccupiedDataForAttacker[tId] = { ...occData, rebellionRisk: occData.rebellionRisk ?? INITIAL_REBELLION_RISK, productionDisruptionTicks: occData.productionDisruptionTicks ?? 0, rebelStrength: occData.rebelStrength ?? 0 };
                  }
                });

                newCountriesState[war.attackerId] = {
                   ...attacker,
                   currentPopulation: (attacker.currentPopulation || 0) + (defenderOriginalState.currentPopulation || 0),
                   기술력: Math.min(1000, (attacker.기술력 || 0) + Math.round((defenderOriginalState.기술력 || 0) * 0.15)),
                   territories: [...new Set([...attacker.territories, ...defenderOriginalState.territories])],
                   atWarWith: attacker.atWarWith.filter(id => id !== war.defenderId),
                   aggressionScore: Math.max(0, attacker.aggressionScore - 50),
                   occupiedTerritoryData: newOccupiedDataForAttacker,
                };
                newCountriesState[war.defenderId] = { 
                    ...defender, 
                    isEliminated: true, 
                    atWarWith: [], 
                    occupiedTerritoryData: {},
                    eliminatedTick: currentTickForProcessing
                };

              } else { 
                battleMessage = `${defender.국가명}이(가) ${attacker.국가명}의 공격을 성공적으로 방어했습니다.`;
                newCountriesState[war.attackerId] = {
                  ...attacker,
                  atWarWith: attacker.atWarWith.filter(id => id !== war.defenderId),
                  aggressionScore: Math.max(0, attacker.aggressionScore - 15) 
                };
                 newCountriesState[war.defenderId] = {
                  ...defender,
                  atWarWith: defender.atWarWith.filter(id => id !== war.attackerId),
                   aggressionScore: Math.max(0, defender.aggressionScore - 10) 
                };
              }
              setGameMessage(battleMessage);
              addLogEntry(battleMessage, gameTickDateUpdate);
            }
          }
        }
        // Filter out resolved wars for the next state update
        const nextActiveWars = currentActiveWars.filter(w => !resolvedWarIds.has(w.id));
        setActiveWars(nextActiveWars);
        
        Object.keys(newCountriesState).forEach(id => {
          const country = newCountriesState[id];
          if (country.isEliminated) return;

          if (country.atWarWith.length === 0) { 
            const originalDetails = countryDetailsData[id];
            if (originalDetails) {
              let recoveryEfficiencyBonus = (country.policyEffectModifiers[EffectStats.MILITARY_RECOVERY_EFFICIENCY_BONUS_PERC] || 0) + (country.nationalSpiritEffectModifiers[EffectStats.MILITARY_RECOVERY_EFFICIENCY_BONUS_PERC] || 0);

              const maxArmy = originalDetails.육군전투력 || 0;
              const maxNavy = originalDetails.해군전투력 || 0;
              const maxAirforce = originalDetails.공군전투력 || 0;

              const econFactor = (country.경제력 || 50) / 1000;
              const resourceFactor = (country.자원보유량 || 50) / 1000;
              const techBonus = 1 + ((country.기술력 || 50) / RECOVERY_TECH_BONUS_SCALE);
              
              const budgetPercentOfGDP = country.defenseBudgetRatio / 100;
              const budgetAllocationFactor = Math.min(1, budgetPercentOfGDP / RECOVERY_BUDGET_ALLOCATION_EFFECT_SCALE); 
              const manpowerFactor = Math.min(1, country.currentPopulation / RECOVERY_MANPOWER_AVAILABILITY_SCALE);
              
              let tickRecoveryPotential = BASE_RECOVERY_POINTS_PER_TICK * econFactor * resourceFactor * techBonus * budgetAllocationFactor * manpowerFactor * (1 + recoveryEfficiencyBonus);
              tickRecoveryPotential *= (currentGameSpeed.ticksPerSecond > 1 ? currentGameSpeed.ticksPerSecond / 2 : 1); 

              const initialTotalMilitary = (originalDetails.육군전투력 || 1) + (originalDetails.해군전투력 || 1) + (originalDetails.공군전투력 || 1); 

              const servicesToRecover = [
                { type: 'army' as const, current: country.currentMilitary.army, max: maxArmy, proportion: (originalDetails.육군전투력 || 0) / initialTotalMilitary, costMod: 1.0 },
                { type: 'navy' as const, current: country.currentMilitary.navy, max: maxNavy, proportion: (originalDetails.해군전투력 || 0) / initialTotalMilitary, costMod: 1.8 },
                { type: 'airforce' as const, current: country.currentMilitary.airforce, max: maxAirforce, proportion: (originalDetails.공군전투력 || 0) / initialTotalMilitary, costMod: 1.4 }
              ];

              for (const service of servicesToRecover) {
                if (service.current < service.max) {
                  const deficit = service.max - service.current;
                  let desiredRecoveryAmount = tickRecoveryPotential * service.proportion;
                  let actualRecoveryAmount = Math.min(desiredRecoveryAmount, deficit);
                  
                  if (actualRecoveryAmount < 0.01 && deficit > 0) actualRecoveryAmount = 0.01; 

                  const budgetCost = actualRecoveryAmount * RECOVERY_COST_BUDGET_PER_UNIT * service.costMod;
                  const popCost = actualRecoveryAmount * RECOVERY_COST_POP_PER_UNIT;

                  if (country.currentDefenseBudget >= budgetCost && country.currentPopulation >= popCost && actualRecoveryAmount > 0) {
                    country.currentMilitary[service.type] = parseFloat((country.currentMilitary[service.type] + actualRecoveryAmount).toFixed(2));
                    country.currentMilitary[service.type] = Math.min(service.max, country.currentMilitary[service.type]); 
                    country.currentDefenseBudget -= budgetCost; 
                    country.currentPopulation -= Math.round(popCost);
                  }
                }
              }
              country.currentMilitary.army = Math.round(country.currentMilitary.army * 100) / 100;
              country.currentMilitary.navy = Math.round(country.currentMilitary.navy * 100) / 100;
              country.currentMilitary.airforce = Math.round(country.currentMilitary.airforce * 100) / 100;
            }
            
            let aggressionIncrease = 0.10 + (country.경제력 || 200)/10000 + (country.currentMilitary.army + country.currentMilitary.airforce)/2000000 ;
            aggressionIncrease *= (currentGameSpeed.ticksPerSecond > 0 ? currentGameSpeed.ticksPerSecond / 2 : 0.5); 
            
            let aggressionDecayRate = BASE_AGGRESSION_DECAY_PER_TICK 
                * (1 + (country.policyEffectModifiers[EffectStats.AGGRESSION_DECAY_RATE_PERC] || 0) + (country.nationalSpiritEffectModifiers[EffectStats.AGGRESSION_DECAY_RATE_PERC] || 0));
            country.aggressionScore -= aggressionDecayRate;
            country.aggressionScore += aggressionIncrease;
            country.aggressionScore = Math.min(MAX_AGGRESSION, Math.max(0, country.aggressionScore));

            // Existing Aggression-based War Declaration
            if (country.aggressionScore >= MAX_AGGRESSION * (0.9 + Math.random() * 0.1) && !country.isPlayer) { 
              const potentialTargets = Object.values(newCountriesState).filter(
                target => !target.isEliminated && target.id !== id && target.atWarWith.length === 0 && !target.territories.includes(id) && !country.territories.includes(target.id) && !country.allies.includes(target.id) && !country.truces.some(t => t.targetCountryId === target.id && t.endTick > currentTickForProcessing)
              );

              if (potentialTargets.length > 0) {
                let target = potentialTargets[Math.floor(Math.random() * potentialTargets.length)];
                const sortedTargets = potentialTargets.sort((a,b) => (a.경제력! + a.육군전투력!) - (b.경제력! + b.육군전투력!));
                if (Math.random() < 0.7 && sortedTargets.length > 0) target = sortedTargets[0];

                country.aggressionScore = Math.max(0, country.aggressionScore - 70); 
                
                const newWar: WarDetails = {
                  id: `${id}_vs_${target.id}_${gameTickDateUpdate.year}-${gameTickDateUpdate.day}-${currentTickForProcessing}`,
                  attackerId: id,
                  defenderId: target.id,
                  startDate: gameTickDateUpdate,
                  ticksToResolution: WAR_TICKS_DURATION + Math.floor(Math.random() * 10) - 5,
                };
                
                if (!nextActiveWars.some(w => (w.attackerId === newWar.attackerId && w.defenderId === newWar.defenderId) || (w.attackerId === newWar.defenderId && w.defenderId === newWar.attackerId) )) {
                    newActiveWarsForTick.push(newWar); // Add to temporary list for this tick
                    newCountriesState[id] = {...country, atWarWith: [...country.atWarWith, target.id]}; 
                    newCountriesState[target.id] = {...newCountriesState[target.id], atWarWith: [...(newCountriesState[target.id].atWarWith || []), id]};
                    const warDeclarationMessage = `${country.국가명}이(가) ${target.국가명}에 선전포고했습니다! (호전성 발발)`;
                    setGameMessage(warDeclarationMessage);
                    addLogEntry(warDeclarationMessage, gameTickDateUpdate);
                }
              }
            }

            // New: Auto Delegate Diplomacy War Declaration for AI
            if (playerCountryId && newCountriesState[playerCountryId] && autoDelegateDiplomacy && !country.isPlayer && country.id !== playerCountryId && !country.isEliminated && country.atWarWith.length === 0 && !country.allies.includes(playerCountryId) && !country.truces.some(t => t.targetCountryId === playerCountryId && t.endTick > currentTickForProcessing)) {
                const playerState = newCountriesState[playerCountryId];
                if (!playerState.isEliminated && !playerState.atWarWith.includes(country.id) && !playerState.truces.some(t => t.targetCountryId === country.id && t.endTick > currentTickForProcessing)) {
                    const countryMilitary = country.currentMilitary.army + country.currentMilitary.navy + country.currentMilitary.airforce;
                    const playerMilitary = playerState.currentMilitary.army + playerState.currentMilitary.navy + playerState.currentMilitary.airforce;

                    if (countryMilitary < playerMilitary * (0.8 + Math.random() * 0.3)) { // AI is weaker
                        const canDeclareWar = playerState.politicalCapital >= PC_COST_DECLARE_WAR;
                        if (canDeclareWar && Math.random() < 0.005) { // Low chance per tick to avoid spam
                             playerState.politicalCapital -= PC_COST_DECLARE_WAR;
                             playerState.aggressionScore = Math.min(MAX_AGGRESSION, playerState.aggressionScore + AGGRESSION_HIT_DECLARE_WAR * 0.5); // Less aggression for opportunistic war

                            const newWar: WarDetails = {
                                id: `player_${playerCountryId}_vs_ai_${country.id}_${gameTickDateUpdate.year}-${gameTickDateUpdate.day}-${currentTickForProcessing}`,
                                attackerId: playerCountryId, // Player declares war via AI
                                defenderId: country.id,
                                startDate: gameTickDateUpdate,
                                ticksToResolution: WAR_TICKS_DURATION + Math.floor(Math.random() * 10) - 5,
                            };
                            if (!nextActiveWars.some(w => (w.attackerId === newWar.attackerId && w.defenderId === newWar.defenderId) || (w.attackerId === newWar.defenderId && w.defenderId === newWar.attackerId) )) {
                                newActiveWarsForTick.push(newWar);
                                newCountriesState[playerCountryId] = {...playerState, atWarWith: [...playerState.atWarWith, country.id]};
                                newCountriesState[country.id] = {...country, atWarWith: [...country.atWarWith, playerCountryId]};
                                const warDeclarationMessage = `[외교 자동 위임] ${playerState.국가명}이(가) 약소국 ${country.국가명}에 선전포고했습니다!`;
                                setGameMessage(warDeclarationMessage);
                                addLogEntry(warDeclarationMessage, gameTickDateUpdate);
                            }
                        }
                    }
                }
            }

          } 
        }); 
        
        setActiveWars(prev => [...prev.filter(w => !resolvedWarIds.has(w.id)), ...newActiveWarsForTick]);

        if (playerCountryId && newCountriesState[playerCountryId] && !newCountriesState[playerCountryId].isEliminated) {
            const playerState = newCountriesState[playerCountryId];
            setPlayerStatHistory(prevHistory => {
                if (prevHistory.length > 0 && prevHistory[prevHistory.length - 1].tick === currentTickForProcessing) {
                    return prevHistory; 
                }
                return [
                    ...prevHistory,
                    {
                        tick: currentTickForProcessing,
                        economy: playerState.경제력 ?? 0,
                        technology: playerState.기술력 ?? 0,
                        diplomacy: playerState.외교력 ?? 0,
                        resources: playerState.자원보유량 ?? 0,
                    }
                ];
            });
        }
        
        // --- Game Over Condition Checks ---
        let playerIsEliminated = false;
        if (playerCountryId && newCountriesState[playerCountryId]?.isEliminated) {
            playerIsEliminated = true;
            if (!newCountriesState[playerCountryId].eliminatedTick) { 
                newCountriesState[playerCountryId].eliminatedTick = currentTickForProcessing;
            }
        }

        const activeCountries = Object.values(newCountriesState).filter(c => !c.isEliminated);
        let gameShouldEnd = false;
        let outcomePlayerWon = false;
        let outcomeWinnerName = "없음 (모두 파괴)";

        if (playerIsEliminated) {
            gameShouldEnd = true;
            outcomePlayerWon = false;
            const conqueringCountry = Object.values(newCountriesState).find(c => 
                c.territories.includes(playerCountryId!) && c.id !== playerCountryId && !c.isEliminated
            );
            outcomeWinnerName = conqueringCountry?.국가명 || "알 수 없는 정복자";
            const gameOverMsg = `${newCountriesState[playerCountryId!].국가명}이(가) ${outcomeWinnerName}에게 정복당했습니다. 게임 오버.`;
            setGameMessage(gameOverMsg);
            addLogEntry(gameOverMsg, gameTickDateUpdate);
        } else if (activeCountries.length === 1 && gameMode === 'playing') {
            gameShouldEnd = true;
            const soleSurvivor = activeCountries[0];
            outcomeWinnerName = soleSurvivor.국가명;
            outcomePlayerWon = soleSurvivor.id === playerCountryId;
            const gameOverMsg = `${soleSurvivor.국가명}이(가) 세계를 정복했습니다! 게임 오버.`;
            setGameMessage(gameOverMsg);
            addLogEntry(gameOverMsg, gameTickDateUpdate);
        } else if (activeCountries.length === 0 && gameMode === 'playing') {
            gameShouldEnd = true;
            outcomePlayerWon = false; // No one won
            outcomeWinnerName = "없음 (모두 파괴)";
            const gameOverMsg = `모든 국가가 파괴되었습니다. 무승부! 게임 오버.`;
            setGameMessage(gameOverMsg);
            addLogEntry(gameOverMsg, gameTickDateUpdate);
        }

        if (gameShouldEnd) {
            const allFinalStatesForRanking = Object.values(newCountriesState);
            let forRankingProcessing = allFinalStatesForRanking.map(c => ({
                id: c.id,
                countryName: c.국가명,
                isEliminated: c.isEliminated,
                eliminatedTick: c.eliminatedTick,
                isPlayer: c.isPlayer,
            }));

            forRankingProcessing.sort((a, b) => {
                if (!a.isEliminated && b.isEliminated) return -1; 
                if (a.isEliminated && !b.isEliminated) return 1;  
                if (!a.isEliminated && !b.isEliminated) return 0; 
                return (b.eliminatedTick || 0) - (a.eliminatedTick || 0); 
            });
            
            const finalRankingList: RankedCountry[] = forRankingProcessing.map((c, index) => ({
                countryName: c.countryName,
                rank: index + 1,
                eliminatedTick: c.eliminatedTick,
                isPlayer: c.isPlayer
            }));

            setFinalGameOutcome({ 
                playerWon: outcomePlayerWon, 
                winnerName: outcomeWinnerName,
                ranking: finalRankingList
            });
            setGameMode('gameOver');
            setIsSummaryModalOpen(true);
            return newCountriesState;
        }
        
        return newCountriesState;
      });
    }, 1000 / currentGameSpeed.ticksPerSecond);


    return () => clearInterval(intervalId);
  }, [gameMode, currentGameSpeed, playerCountryId, addLogEntry, activeWars, currentDate, recalculatePolicyEffectModifiers, recalculateNationalSpiritEffectModifiers, autoEnactPolicies, totalTicks, handleEnactPolicy, autoDelegateDiplomacy ]); 


  const headerTitle = gameMode === 'setup' ? "World War Simulator: Setup" : `World War Simulator: ${currentDate.year}년 ${currentDate.day}일`;

  const handleRestartFromModal = () => {
    setIsSummaryModalOpen(false);
    setGameMode('setup');
    setPlayerCountryId(null);
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center p-4 font-sans overflow-hidden">
      <header className="my-4 text-center w-full">
        <h1 className="text-3xl sm:text-4xl font-bold text-sky-400">{headerTitle}</h1>
         <p className="text-slate-400 mt-2 text-sm sm:text-base">{gameMessage}</p>
      </header>

      {gameMode !== 'setup' && gameMode !== 'gameOver' && (
        <GameControls
          currentDate={currentDate}
          gameSpeed={currentGameSpeed}
          availableSpeeds={AVAILABLE_GAME_SPEEDS}
          onSpeedChange={handleSpeedChange}
          onRestart={() => {
            setGameMode('setup');
            setPlayerCountryId(null);
          }}
        />
      )}

      <main className="w-full max-w-5xl bg-slate-800 rounded-xl shadow-2xl overflow-hidden mt-4">
        <WorldMap
          gameMode={gameMode}
          allCountriesState={allCountriesState}
          activeWars={activeWars}
          playerCountryId={playerCountryId}
          onStartGame={handleStartGame}
          allCountryDetails={countryDetailsData} 
          onEnactPolicy={handleEnactPolicy}
          allPolicies={ALL_POLICIES}
          autoEnactPolicies={autoEnactPolicies}
          onToggleAutoEnactPolicies={handleToggleAutoEnactPolicies}
          autoDelegateDiplomacy={autoDelegateDiplomacy}
          onToggleAutoDelegateDiplomacy={handleToggleAutoDelegateDiplomacy}
          allNationalSpirits={ALL_NATIONAL_SPIRITS} 
          currentDate={currentDate}
          onUpdateDefenseBudgetRatio={handleUpdateDefenseBudgetRatio}
          onUpdateCivilianAllocation={handleUpdateCivilianAllocation}
          onToggleAutoManageBudget={handleToggleAutoManageBudget}
          onImproveRelations={handleImproveRelations}
          onHarmRelations={handleHarmRelations}
          onProposeAlliance={handleProposeAlliance}
          onBreakAlliance={handleBreakAlliance}
          onOfferTruce={handleOfferTruce}
          onDeclareWar={handleDeclareWar}
          onRespondToDiplomaticProposal={handleRespondToDiplomaticProposal}
          totalTicks={totalTicks}
        />
      </main>

      {gameMode !== 'setup' && gameMode !== 'gameOver' && gameLogs.length > 0 && (
        <EventLog logs={gameLogs} />
      )}

      {gameMode === 'gameOver' && isSummaryModalOpen && finalGameOutcome && (
        <GameSummaryModal
          isOpen={isSummaryModalOpen}
          onClose={() => setIsSummaryModalOpen(false)} 
          onRestart={handleRestartFromModal}
          logs={gameLogs}
          outcome={finalGameOutcome}
          statHistory={playerStatHistory} 
        />
      )}

      <footer className="mt-8 text-center text-sm text-slate-500">
        <p>World War Simulation Game. Data is illustrative.</p>
      </footer>
    </div>
  );
};

export default App;