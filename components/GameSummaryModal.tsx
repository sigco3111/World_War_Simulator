
import React from 'react';
import type { FinalGameOutcome, RankedCountry } from '../game/types'; // Import RankedCountry
import PlayerStatsChart, { StatHistoryEntry } from './PlayerStatsChart'; 

interface GameSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestart: () => void;
  logs: string[];
  outcome: FinalGameOutcome;
  statHistory: StatHistoryEntry[]; 
}

const GameSummaryModal: React.FC<GameSummaryModalProps> = ({
  isOpen,
  onClose,
  onRestart,
  logs,
  outcome,
  statHistory, 
}) => {
  if (!isOpen) {
    return null;
  }

  const keyEvents = logs.filter(log => 
    log.includes("선전포고했습니다") || 
    log.includes("승리했습니다") || 
    log.includes("방어했습니다") ||
    log.includes("정복당했습니다") ||
    log.includes("세계를 정복했습니다") ||
    log.includes("시뮬레이션을 시작합니다") ||
    log.includes("게임 오버")
  ).slice(0, 50).reverse(); 

  let title = "게임 결과";
  let message = "";

  const playerOriginalName = playerCountryNameFromLog(logs);

  if (outcome.playerWon) {
    title = "승리!";
    message = `${outcome.winnerName} (당신)이(가) 세계를 정복했습니다!`;
  } else {
    if (outcome.winnerName === "없음 (모두 파괴)") {
        title = "무승부";
        message = "모든 국가가 파괴되었습니다.";
    } else if (outcome.winnerName === "알 수 없는 정복자" && logs.some(l => l.includes("정복당했습니다"))) {
        title = "패배";
        const playerDefeatLog = logs.find(l => l.includes("정복당했습니다") && l.includes(playerOriginalName || "플레이어"));
        message = playerDefeatLog ? playerDefeatLog.substring(playerDefeatLog.indexOf("]") + 2) : `${playerOriginalName || "플레이어"}가(이) 정복당했습니다.`;
    }
    else {
        title = "게임 종료";
        message = `${outcome.winnerName}이(가) 세계를 정복했습니다.`;
         if (playerOriginalName && outcome.winnerName !== playerOriginalName) {
            // Player lost, but not necessarily the first one out
        }
    }
  }

  function playerCountryNameFromLog(logArray: string[]): string | null {
    const startGameLog = logArray.find(log => log.includes("시뮬레이션을 시작합니다"));
    if (startGameLog) {
        // Updated regex to be more robust with potential era names in log
        const match = startGameLog.match(/\[.*?\]\s*(.*?)\s*\(으\)로 시뮬레이션을 시작합니다/);
        if (match && match[1]) return match[1];
    }
    return null;
  }


  return (
    <div 
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="summary-title"
    >
      <div className="bg-slate-800 text-slate-100 p-6 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 id="summary-title" className="text-3xl font-bold text-sky-400">{title}</h2>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-slate-700 text-slate-400 hover:text-sky-400 transition-colors"
            aria-label="요약 창 닫기"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-lg text-slate-300 mb-6">{message}</p>

        <div className="flex-grow overflow-y-auto space-y-6 pr-2"> 
          <div>
            <h3 className="text-xl font-semibold text-sky-300 mb-2">주요 이벤트 로그:</h3>
            <div className="bg-slate-700 rounded-md p-3 max-h-60 overflow-y-auto text-sm space-y-1">
              {keyEvents.length > 0 ? keyEvents.map((log, index) => (
                <p key={index} className="whitespace-pre-wrap leading-relaxed text-slate-300">
                  {log}
                </p>
              )) : <p className="text-slate-400">표시할 주요 이벤트가 없습니다.</p>}
            </div>
          </div>

          <PlayerStatsChart history={statHistory} />

          {outcome.ranking && outcome.ranking.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold text-sky-300 mb-3 text-center">최종 순위</h3>
              <div className="bg-slate-700 rounded-md p-3 max-h-72 overflow-y-auto">
                <ul className="space-y-1.5">
                  {outcome.ranking.map((rankedCountry) => (
                    <li 
                      key={rankedCountry.countryName + rankedCountry.rank} 
                      className={`flex justify-between items-center p-2 rounded text-sm
                        ${rankedCountry.isPlayer ? 'bg-sky-600 text-white font-semibold' : 'bg-slate-600/50'}`}
                    >
                      <span className="w-1/6 text-center">{rankedCountry.rank}위</span>
                      <span className={`flex-1 truncate px-2 ${rankedCountry.isPlayer ? 'text-sky-100' : 'text-slate-200'}`}>
                        {rankedCountry.countryName}
                      </span>
                      <span className="w-1/4 text-right text-xs">
                        {rankedCountry.eliminatedTick !== undefined 
                          ? `턴 ${rankedCountry.eliminatedTick}에 멸망`
                          : <span className="text-green-400 font-medium">생존 (승리)</span>
                        }
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-100 font-semibold rounded-md transition-colors"
          >
            닫기
          </button>
          <button
            onClick={onRestart}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-md transition-colors"
          >
            새 게임 시작
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameSummaryModal;
