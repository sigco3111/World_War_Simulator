
import React, { useState, useEffect, useCallback } from 'react';
import type { CountryInGame, CivilianBudgetAllocation } from '../game/types';
import { MAX_DEFENSE_BUDGET_RATIO_HARD_CAP, MAX_DEFENSE_BUDGET_RATIO_SOFT_CAP } from '../game/types';

interface BudgetControlsPanelProps {
  country: CountryInGame;
  onUpdateDefenseBudgetRatio: (newRatio: number) => void;
  onUpdateCivilianAllocation: (newAllocation: CivilianBudgetAllocation) => void;
  // onToggleAutoManageBudget is removed, toggle is now in WorldMap
  autoManageBudget: boolean; // This prop is still received to enable/disable controls
}

const BudgetControlsPanel: React.FC<BudgetControlsPanelProps> = ({
  country,
  onUpdateDefenseBudgetRatio,
  onUpdateCivilianAllocation,
  autoManageBudget, // Keep receiving this to disable inputs
}) => {
  const [defenseRatio, setDefenseRatio] = useState(country.defenseBudgetRatio);
  const [civilianAlloc, setCivilianAlloc] = useState<CivilianBudgetAllocation>(country.civilianAllocation);

  useEffect(() => {
    setDefenseRatio(country.defenseBudgetRatio);
    setCivilianAlloc(country.civilianAllocation);
  }, [country.defenseBudgetRatio, country.civilianAllocation]);

  const handleDefenseRatioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setDefenseRatio(value);
    if (!autoManageBudget) {
        onUpdateDefenseBudgetRatio(value);
    }
  };
  
  const handleCivilianAllocChange = (category: keyof CivilianBudgetAllocation, value: number) => {
    if (autoManageBudget) return;

    const newAlloc = { ...civilianAlloc, [category]: value };
    setCivilianAlloc(newAlloc);
    onUpdateCivilianAllocation(newAlloc); 
  };
  
  const civilianCategories: { key: keyof CivilianBudgetAllocation; name: string; color: string }[] = [
    { key: 'economy', name: '경제 개발', color: 'bg-sky-500' },
    { key: 'technology', name: '기술 연구', color: 'bg-purple-500' },
    { key: 'diplomacy', name: '외교 활동', color: 'bg-yellow-500' },
    { key: 'resources', name: '자원 확충', color: 'bg-orange-500' },
  ];

  const handleCivilianSliderChange = (category: keyof CivilianBudgetAllocation, newValue: number) => {
    if (autoManageBudget) return;

    const currentValues = {...civilianAlloc};
    const oldValue = currentValues[category];
    const change = newValue - oldValue;
    currentValues[category] = newValue;

    let otherCategoriesSum = 0;
    let adjustableCategoriesCount = 0;
    civilianCategories.forEach(cat => {
        if (cat.key !== category) {
            otherCategoriesSum += currentValues[cat.key];
            adjustableCategoriesCount++;
        }
    });

    if (adjustableCategoriesCount > 0 && otherCategoriesSum !== 0) {
        civilianCategories.forEach(cat => {
            if (cat.key !== category) {
                const proportion = currentValues[cat.key] / otherCategoriesSum;
                currentValues[cat.key] -= change * proportion;
                currentValues[cat.key] = Math.max(0, Math.min(100, Math.round(currentValues[cat.key])));
            }
        });
    }
    
    let sum = Math.round(Object.values(currentValues).reduce((s, v) => s + v, 0));
    if (sum !== 100 && civilianCategories.length > 0) {
        const diff = 100 - sum;
        let targetCat = civilianCategories.find(c => c.key !== category)?.key || 'economy';
        if (civilianCategories.filter(c => c.key !== category).length > 0) {
            targetCat = civilianCategories
                .filter(c => c.key !== category)
                .sort((a,b) => currentValues[b.key] - currentValues[a.key])[0].key;
        }
        currentValues[targetCat] = Math.max(0, Math.min(100, Math.round(currentValues[targetCat] + diff)));
    }
    sum = Math.round(Object.values(currentValues).reduce((s, v) => s + v, 0));
    if (sum !== 100) { 
        currentValues.economy += (100-sum);
        currentValues.economy = Math.max(0, Math.min(100, Math.round(currentValues.economy)));
    }

    setCivilianAlloc(currentValues);
    onUpdateCivilianAllocation(currentValues);
  };


  return (
    <div className="space-y-6 py-2 text-sm">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-sky-300">예산 관리</h3>
        {/* Toggle button removed from here */}
      </div>

      <div className="space-y-2 p-3 bg-slate-700/50 rounded-md">
        <label htmlFor="defenseBudgetRatio" className="block font-medium text-slate-200">
          국방 예산 (GDP 대비 %): <span className="text-cyan-400">{defenseRatio.toFixed(1)}%</span>
        </label>
        <input
          type="range"
          id="defenseBudgetRatio"
          min="0"
          max={MAX_DEFENSE_BUDGET_RATIO_HARD_CAP} 
          step="0.5"
          value={defenseRatio}
          onChange={handleDefenseRatioChange}
          disabled={autoManageBudget}
          className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {defenseRatio > MAX_DEFENSE_BUDGET_RATIO_SOFT_CAP && !autoManageBudget && (
          <p className="text-xs text-red-400 mt-1">
            경고: 국방 예산이 GDP의 {MAX_DEFENSE_BUDGET_RATIO_SOFT_CAP}%를 초과하여 경제, 자원, 외교에 부담을 줄 수 있습니다.
          </p>
        )}
      </div>

      <div className="space-y-3 p-3 bg-slate-700/50 rounded-md">
        <h4 className="font-medium text-slate-200">민간 투자 배분 (총 100%)</h4>
        {civilianCategories.map(cat => (
          <div key={cat.key} className="space-y-1">
            <label htmlFor={`civilianAlloc-${cat.key}`} className="block text-xs text-slate-300">
              {cat.name}: <span className={`${cat.color.replace('bg-', 'text-')}`}>{civilianAlloc[cat.key].toFixed(0)}%</span>
            </label>
            <input
              type="range"
              id={`civilianAlloc-${cat.key}`}
              min="0"
              max="100"
              step="1"
              value={civilianAlloc[cat.key]}
              onChange={(e) => handleCivilianSliderChange(cat.key, parseInt(e.target.value, 10))}
              disabled={autoManageBudget}
              className={`w-full h-2 ${cat.color.replace('bg-', 'bg-opacity-50')} rounded-lg appearance-none cursor-pointer ${cat.color.replace('bg-', 'accent-')} disabled:opacity-50 disabled:cursor-not-allowed`}
            />
          </div>
        ))}
         <p className="text-xs text-slate-400 mt-1 text-right">
            총합: {Object.values(civilianAlloc).reduce((s, v) => s + v, 0).toFixed(0)}%
        </p>
         {!autoManageBudget && Math.round(Object.values(civilianAlloc).reduce((s,v) => s+v, 0)) !== 100 && (
            <p className="text-xs text-red-400 mt-1">경고: 민간 투자 배분 총합이 100%가 되어야 합니다.</p>
        )}
      </div>
      <p className="text-xs text-slate-500">
        자동 관리 비활성화 시, 슬라이더를 조정하여 예산 배분을 수동으로 설정할 수 있습니다. 국방 예산은 GDP 대비 비율로, 민간 투자는 나머지 예산 내에서 100%가 되도록 배분합니다.
      </p>
    </div>
  );
};

export default BudgetControlsPanel;