import React from 'react';
import type { GameDate, GameSpeed } from '../game/types';

interface GameControlsProps {
  currentDate: GameDate;
  gameSpeed: GameSpeed;
  availableSpeeds: GameSpeed[];
  onSpeedChange: (speedId: GameSpeed['id']) => void;
  onRestart: () => void;
}

const GameControls: React.FC<GameControlsProps> = ({
  currentDate,
  gameSpeed,
  availableSpeeds,
  onSpeedChange,
  onRestart
}) => {
  return (
    <div className="w-full max-w-5xl p-3 bg-slate-700 rounded-lg shadow-md flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0 sm:space-x-4 mb-2">
      <div className="text-lg font-semibold text-sky-300">
        날짜: {currentDate.year}년 {currentDate.day}일
      </div>
      <div className="flex items-center space-x-2">
        {availableSpeeds.map((speed) => (
          <button
            key={speed.id}
            onClick={() => onSpeedChange(speed.id)}
            className={`px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors
              ${gameSpeed.id === speed.id 
                ? 'bg-sky-500 text-white' 
                : 'bg-slate-600 hover:bg-sky-600 text-slate-200'}
            `}
            aria-pressed={gameSpeed.id === speed.id}
          >
            {speed.label}
          </button>
        ))}
      </div>
      <button
        onClick={onRestart}
        className="px-4 py-1.5 text-xs sm:text-sm bg-rose-600 hover:bg-rose-700 text-white rounded-md transition-colors"
      >
        재시작
      </button>
    </div>
  );
};

export default GameControls;
