
import React from 'react';
import type { CountryInGame, GameDate, DiplomaticProposal } from '../game/types';
import { ALLIANCE_RELATION_THRESHOLD, PC_COST_IMPROVE_RELATIONS, PC_COST_HARM_RELATIONS, PC_COST_PROPOSE_ALLIANCE, PC_COST_OFFER_TRUCE, PC_COST_DECLARE_WAR, DAYS_IN_YEAR } from '../game/types';

interface DiplomacyPanelProps {
  playerCountryId: string;
  selectedCountry: CountryInGame; 
  allCountriesState: Record<string, CountryInGame>;
  currentDate: GameDate;
  onImproveRelations: (sourceId: string, targetId: string) => void;
  onHarmRelations: (sourceId: string, targetId: string) => void;
  onProposeAlliance: (sourceId: string, targetId: string) => void;
  onBreakAlliance: (sourceId: string, allyIdToBreak: string) => void;
  onOfferTruce: (sourceId: string, targetId: string) => void;
  onDeclareWar: (attackerId: string, defenderId: string) => void;
  onRespondToDiplomaticProposal: (respondingCountryId: string, proposalId: string, accepted: boolean) => void;
  totalTicks: number;
  autoDelegateDiplomacy: boolean; // New prop
}

const DiplomacyPanel: React.FC<DiplomacyPanelProps> = ({
  playerCountryId,
  selectedCountry,
  allCountriesState,
  currentDate,
  onImproveRelations,
  onHarmRelations,
  onProposeAlliance,
  onBreakAlliance,
  onOfferTruce,
  onDeclareWar,
  onRespondToDiplomaticProposal,
  totalTicks,
  autoDelegateDiplomacy // Received prop
}) => {
  const playerState = allCountriesState[playerCountryId];

  if (!playerState || playerState.isEliminated) {
    return <p className="text-slate-400">플레이어가 존재하지 않거나 소멸되었습니다.</p>;
  }

  const getRelationStatusText = (relationScore: number): string => {
    if (relationScore > 75) return "매우 우호적";
    if (relationScore > 35) return "우호적";
    if (relationScore > -35) return "중립적";
    if (relationScore > -75) return "적대적";
    return "매우 적대적";
  };

  const renderDiplomaticActions = (targetCountry: CountryInGame) => {
    if (playerCountryId === targetCountry.id) return null; 

    const playerRelationsWithTarget = playerState.relations[targetCountry.id] || 0;
    const isAlly = playerState.allies.includes(targetCountry.id);
    const isAtWar = playerState.atWarWith.includes(targetCountry.id);
    const hasTruce = playerState.truces.some(t => t.targetCountryId === targetCountry.id && t.endTick > totalTicks);
    const canPlayerAct = !autoDelegateDiplomacy || selectedCountry.id !== playerCountryId; // Player can act if not auto-delegated OR if viewing a specific AI

    return (
      <div className="space-x-1 mt-1">
        <button
          onClick={() => onImproveRelations(playerCountryId, targetCountry.id)}
          disabled={!canPlayerAct || playerState.politicalCapital < PC_COST_IMPROVE_RELATIONS || isAlly}
          className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 rounded disabled:bg-slate-500"
          title={`관계 개선 (비용: ${PC_COST_IMPROVE_RELATIONS}PC)`}
        >
          관계 개선
        </button>
        <button
          onClick={() => onHarmRelations(playerCountryId, targetCountry.id)}
          disabled={!canPlayerAct || playerState.politicalCapital < PC_COST_HARM_RELATIONS}
          className="px-2 py-1 text-xs bg-orange-600 hover:bg-orange-700 rounded disabled:bg-slate-500"
          title={`관계 악화 (비용: ${PC_COST_HARM_RELATIONS}PC)`}
        >
          관계 악화
        </button>
        {!isAlly && !isAtWar && !hasTruce && (
          <button
            onClick={() => onProposeAlliance(playerCountryId, targetCountry.id)}
            disabled={!canPlayerAct || playerState.politicalCapital < PC_COST_PROPOSE_ALLIANCE || playerRelationsWithTarget < ALLIANCE_RELATION_THRESHOLD}
            className="px-2 py-1 text-xs bg-sky-600 hover:bg-sky-700 rounded disabled:bg-slate-500"
            title={`동맹 제안 (비용: ${PC_COST_PROPOSE_ALLIANCE}PC, 필요 관계: ${ALLIANCE_RELATION_THRESHOLD})`}
          >
            동맹 제안
          </button>
        )}
        {isAlly && (
          <button
            onClick={() => onBreakAlliance(playerCountryId, targetCountry.id)}
            disabled={!canPlayerAct}
            className="px-2 py-1 text-xs bg-red-700 hover:bg-red-800 rounded disabled:bg-slate-500"
          >
            동맹 파기
          </button>
        )}
        {isAtWar && (
          <button
            onClick={() => onOfferTruce(playerCountryId, targetCountry.id)}
            disabled={!canPlayerAct || playerState.politicalCapital < PC_COST_OFFER_TRUCE}
            className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded disabled:bg-slate-500"
            title={`휴전 제안 (비용: ${PC_COST_OFFER_TRUCE}PC)`}
          >
            휴전 제안
          </button>
        )}
        {!isAtWar && !isAlly && !hasTruce && (
          <button
            onClick={() => onDeclareWar(playerCountryId, targetCountry.id)}
            disabled={!canPlayerAct || playerState.politicalCapital < PC_COST_DECLARE_WAR}
            className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded disabled:bg-slate-500"
            title={`선전포고 (비용: ${PC_COST_DECLARE_WAR}PC)`}
          >
            선전포고
          </button>
        )}
         {hasTruce && (
            <span className="text-xs text-blue-300 ml-2"> (휴전 중: {Math.ceil((playerState.truces.find(t=>t.targetCountryId === targetCountry.id)!.endTick - totalTicks)/DAYS_IN_YEAR)}년 남음)</span>
        )}
      </div>
    );
  };
  
  const renderPendingProposals = () => {
    if (playerState.pendingDiplomaticProposals.length === 0) return null;

    return (
      <div className="my-4 p-3 bg-slate-700 rounded-md">
        <h4 className="text-md font-semibold text-amber-300 mb-2">받은 외교 제안</h4>
        <ul className="space-y-2">
          {playerState.pendingDiplomaticProposals.map(proposal => {
            const fromCountry = allCountriesState[proposal.fromCountryId];
            if (!fromCountry) return null;
            let proposalText = "";
            if (proposal.type === 'alliance_offer') proposalText = `${fromCountry.국가명}이(가) 동맹을 제안했습니다.`;
            if (proposal.type === 'truce_offer') proposalText = `${fromCountry.국가명}이(가) 휴전을 제안했습니다.`;

            return (
              <li key={proposal.id} className="text-sm p-2 bg-slate-600/50 rounded flex justify-between items-center">
                <span>{proposalText}</span>
                <div className="space-x-2">
                  <button 
                    onClick={() => onRespondToDiplomaticProposal(playerCountryId, proposal.id, true)}
                    className="px-2 py-1 text-xs bg-green-500 hover:bg-green-600 rounded">수락</button>
                  <button 
                    onClick={() => onRespondToDiplomaticProposal(playerCountryId, proposal.id, false)}
                    className="px-2 py-1 text-xs bg-red-500 hover:bg-red-600 rounded">거절</button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  const targetCountriesToList = selectedCountry.id === playerCountryId 
    ? Object.values(allCountriesState).filter(c => !c.isEliminated && c.id !== playerCountryId)
    : [selectedCountry]; 

  return (
    <div className="py-2 text-sm">
      <div className="flex justify-between items-center mb-3">
         <h3 className="text-xl font-semibold text-sky-300">
            {selectedCountry.id === playerCountryId ? "국제 관계 현황" : `${selectedCountry.국가명} 와(과)의 외교`}
        </h3>
      </div>

      {renderPendingProposals()}
      
      <ul className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {targetCountriesToList.map(country => {
          if (!country || country.isEliminated || country.id === playerCountryId && selectedCountry.id !== playerCountryId) return null; 
          
          const relationScore = playerState.relations[country.id] || 0;
          const relationStatusText = getRelationStatusText(relationScore);
          let statusIndicators = [];
          if (playerState.allies.includes(country.id)) statusIndicators.push(<span key="ally" className="text-xs text-green-400 ml-1">(동맹)</span>);
          if (playerState.atWarWith.includes(country.id)) statusIndicators.push(<span key="war" className="text-xs text-red-400 ml-1">(전쟁중)</span>);
          const truceInfo = playerState.truces.find(t => t.targetCountryId === country.id && t.endTick > totalTicks);
          if (truceInfo) statusIndicators.push(<span key="truce" className="text-xs text-blue-300 ml-1">(휴전)</span>);


          return (
            <li key={country.id} className="p-3 bg-slate-700/70 rounded-md shadow">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-100">{country.국가명}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    relationScore > 35 ? 'bg-green-500/30 text-green-300' :
                    relationScore < -35 ? 'bg-red-500/30 text-red-300' :
                    'bg-slate-600 text-slate-300'
                }`}>
                  {relationScore.toFixed(0)} ({relationStatusText})
                  {statusIndicators}
                </span>
              </div>
              {(selectedCountry.id === playerCountryId || selectedCountry.id === country.id) && renderDiplomaticActions(country)}
            </li>
          );
        })}
      </ul>
      {targetCountriesToList.length === 0 && selectedCountry.id === playerCountryId && (
        <p className="text-slate-400">다른 활동중인 국가가 없습니다.</p>
      )}
    </div>
  );
};

export default DiplomacyPanel;