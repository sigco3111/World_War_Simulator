import React from 'react';

interface EventLogProps {
  logs: string[];
}

const EventLog: React.FC<EventLogProps> = ({ logs }) => {
  return (
    <div className="w-full max-w-5xl mt-4">
      <h2 className="text-xl font-semibold text-sky-300 mb-2">이벤트 로그</h2>
      <div className="bg-slate-700 rounded-lg shadow-md p-4 h-48 overflow-y-auto text-sm text-slate-300 space-y-1">
        {logs.map((log, index) => (
          <p key={index} className="whitespace-pre-wrap leading-relaxed">
            {log}
          </p>
        ))}
        {logs.length === 0 && <p className="text-slate-400">아직 발생한 이벤트가 없습니다.</p>}
      </div>
    </div>
  );
};

export default EventLog;