
import React from 'react';
import type { CountryInGame, GameDate, PolicyEffect as PolicyEffectType } from '../game/types';
import { EffectStats } from '../game/types';
import type { Policy, ALL_POLICIES as AllPoliciesType } from '../game/policies';
import { ALL_ERAS } from '../game/eras';

interface PolicyPanelProps {
  playerCountryState: CountryInGame;
  allPolicies: typeof AllPoliciesType;
  currentDate: GameDate;
  onEnactPolicy: (countryId: string, policyId: string) => void;
  // autoEnactPolicies and onToggleAutoEnactPolicies are handled by WorldMap's info panel header now
}

const getPolicyEffectText = (effect: PolicyEffectType): string => {
  let valueDisplay: string;
  let baseText = "";

  if (typeof effect.value === 'number') {
    const isPercentage = effect.stat.includes('_perc');
    const plusMinus = effect.value >= 0 ? '+' : ''; 
    valueDisplay = `${plusMinus}${isPercentage ? (effect.value * 100).toFixed(1) : effect.value.toLocaleString()}`;
    if (isPercentage) valueDisplay += "%";
  } else { 
    valueDisplay = `"${effect.value}"`;
  }

  switch (effect.stat) {
    case EffectStats.GDP_GROWTH_RATE_PERC: baseText = `GDP 성장률 ${valueDisplay}`; break;
    case EffectStats.TECH_POINTS_PER_TICK_FLAT: baseText = `기술 점수/턴 ${valueDisplay}`; break;
    case EffectStats.DIPLOMACY_POINTS_PER_TICK_FLAT: baseText = `외교 점수/턴 ${valueDisplay}`; break;
    case EffectStats.RESOURCE_POINTS_PER_TICK_FLAT: baseText = `자원 점수/턴 ${valueDisplay}`; break;
    case EffectStats.POLITICAL_CAPITAL_PER_TICK_FLAT: baseText = `정치 자본/턴 ${valueDisplay}`; break;
    case EffectStats.MILITARY_RECOVERY_EFFICIENCY_BONUS_PERC: baseText = `군 회복 효율 ${valueDisplay}`; break;
    // ... other cases from WorldMap ...
    default: baseText = `${effect.stat}: ${valueDisplay}`;
  }
  if (effect.target === 'occupied_territories') baseText += " (점령지)";
  return effect.type === 'one_time' ? `(일시) ${baseText}` : baseText;
};


const PolicyPanel: React.FC<PolicyPanelProps> = ({
  playerCountryState,
  allPolicies,
  currentDate,
  onEnactPolicy,
}) => {
  const availablePoliciesForPlayer = React.useMemo(() => {
    return Object.values(allPolicies).filter(policy => {
        if (playerCountryState.activePolicies.includes(policy.id)) return false; 
        if (policy.prerequisites?.eraRequirement && policy.prerequisites.eraRequirement !== currentDate.currentEraId) return false;
        if (policy.prerequisites?.techLevel && (playerCountryState.기술력 || 0) < policy.prerequisites.techLevel) return false;
        if (policy.cost.politicalCapital && playerCountryState.politicalCapital < policy.cost.politicalCapital) return false;
        return true;
    }).sort((a,b) => (a.cost.politicalCapital || 0) - (b.cost.politicalCapital || 0));
  }, [playerCountryState, allPolicies, currentDate]);

  const activePlayerPolicies: Policy[] = React.useMemo(() => {
    return playerCountryState.activePolicies.map(id => allPolicies[id]).filter(p => p);
  }, [playerCountryState, allPolicies]);

  const renderPolicyEffectsList = (policy: Policy) => {
    return policy.effects.map((effect, i) => (
      <li key={i} className="text-xs">{getPolicyEffectText(effect)}</li>
    ));
  };

  return (
    <div className="space-y-6 py-2 text-sm">
      <div>
        <h3 className="text-lg font-semibold text-sky-300 mb-2">제정 가능한 정책</h3>
        {availablePoliciesForPlayer.length > 0 ? (
          <ul className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
            {availablePoliciesForPlayer.map(policy => (
              <li key={policy.id} className="p-3 bg-slate-700 rounded-md shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-md font-semibold text-sky-200">{policy.icon} {policy.name} <span className="text-xs text-slate-400">({policy.category})</span></h4>
                    <p className="text-xs text-slate-300 mt-1 mb-2">{policy.description}</p>
                    <div className="text-xs text-slate-400">
                      <p>비용: {policy.cost.politicalCapital ? `${policy.cost.politicalCapital}PC ` : ''} {policy.cost.gdpFactor ? `${(policy.cost.gdpFactor * 100).toFixed(1)}% GDP` : ''}</p>
                      {policy.prerequisites?.techLevel && <p>요구 기술: {policy.prerequisites.techLevel}</p>}
                      {policy.prerequisites?.eraRequirement && <p>요구 시대: {ALL_ERAS[policy.prerequisites.eraRequirement]?.name || policy.prerequisites.eraRequirement}</p>}
                      <p className="font-medium mt-1 text-sky-300">효과:</p>
                      <ul className="list-disc list-inside pl-2">{renderPolicyEffectsList(policy)}</ul>
                    </div>
                  </div>
                  <button
                    onClick={() => onEnactPolicy(playerCountryState.id, policy.id)}
                    className="ml-2 px-3 py-1.5 text-xs bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-md transition-colors shrink-0 disabled:bg-slate-500 disabled:cursor-not-allowed"
                    disabled={(playerCountryState?.politicalCapital || 0) < (policy.cost.politicalCapital || 0)} 
                    title={ (playerCountryState?.politicalCapital || 0) < (policy.cost.politicalCapital || 0) ? `정치 자본 부족 (필요: ${policy.cost.politicalCapital})` : "정책 제정"}
                  >
                    제정
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="text-slate-400">현재 제정 가능한 정책이 없습니다.</p>}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-sky-300 mb-2">활성화된 정책</h3>
        {activePlayerPolicies.length > 0 ? (
          <ul className="space-y-2 max-h-[25vh] overflow-y-auto pr-1">
            {activePlayerPolicies.map(policy => (
              <li key={policy.id} className="p-2 bg-slate-600 rounded text-sm">
                {policy.icon} {policy.name}
              </li>
            ))}
          </ul>
        ) : <p className="text-slate-400">현재 활성화된 정책이 없습니다.</p>}
      </div>
    </div>
  );
};

export default PolicyPanel;
