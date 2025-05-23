
import React from 'react';

// This interface can also be imported from App.tsx if centralized,
// but defining it here makes the component more self-contained.
export interface StatHistoryEntry {
  tick: number;
  economy: number;
  technology: number;
  diplomacy: number;
  resources: number;
}

interface PlayerStatsChartProps {
  history: StatHistoryEntry[];
}

interface SingleStatChartProps {
  data: { tick: number; value: number }[];
  title: string;
  color: string;
  height?: number;
  width?: number;
}

const SingleStatChart: React.FC<SingleStatChartProps> = ({
  data,
  title,
  color,
  height = 200, // Adjusted height for better visuals
  width = 380,  // Adjusted width for better visuals
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="p-3 border border-slate-600 rounded-lg bg-slate-700 shadow-md">
        <h4 className="text-md font-semibold text-sky-300 mb-2 text-center">{title}</h4>
        <p className="text-xs text-slate-400 text-center">데이터 없음</p>
      </div>
    );
  }

  const paddingX = 40; // Padding for Y-axis labels and right side
  const paddingY = 30; // Padding for X-axis labels and top side
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  // Ensure data is sorted by tick for correct line drawing
  const sortedData = [...data].sort((a,b) => a.tick - b.tick);

  const minTick = sortedData[0].tick;
  const maxTick = sortedData[sortedData.length -1].tick;
  const tickRange = maxTick - minTick === 0 ? 1 : maxTick - minTick; // Avoid division by zero if only one data point

  const maxValue = 1000; // Stats are 0-1000

  const getX = (tick: number) => ((tick - minTick) / tickRange) * chartWidth + paddingX;
  const getY = (value: number) => chartHeight - (value / maxValue) * chartHeight + paddingY;

  const points = sortedData.map(d => `${getX(d.tick).toFixed(2)},${getY(d.value).toFixed(2)}`).join(' ');

  const numXTicks = 5;
  const numYTicks = 5;

  return (
    <div className="p-3 border border-slate-600 rounded-lg bg-slate-700 shadow-md flex flex-col items-center">
      <h4 className="text-md font-semibold text-sky-300 mb-2">{title}</h4>
      <svg width={width} height={height} aria-labelledby={`${title.replace(/\s+/g, '-').toLowerCase()}-title`} role="img">
        <title id={`${title.replace(/\s+/g, '-').toLowerCase()}-title`}>{title} 변화 추이</title>
        
        {/* Y-axis grid lines and labels */}
        {Array.from({ length: numYTicks + 1 }).map((_, i) => {
          const yPos = paddingY + (i * chartHeight) / numYTicks;
          const yValue = Math.round(maxValue * (1 - i / numYTicks));
          return (
            <g key={`y-tick-${i}`}>
              <line
                x1={paddingX}
                y1={yPos}
                x2={width - paddingX}
                y2={yPos}
                stroke="rgba(71, 85, 105, 0.7)" // slate-600 with opacity
                strokeWidth="0.5"
              />
              <text
                x={paddingX - 8}
                y={yPos + 4}
                fill="#A0AEC0" // slate-400
                fontSize="10"
                textAnchor="end"
              >
                {yValue}
              </text>
            </g>
          );
        })}

        {/* X-axis grid lines and labels */}
        {Array.from({ length: numXTicks + 1 }).map((_, i) => {
          const xPos = paddingX + (i * chartWidth) / numXTicks;
          const tickValue = Math.round(minTick + (tickRange / numXTicks) * i);
          return (
            <g key={`x-tick-${i}`}>
              <line
                x1={xPos}
                y1={paddingY}
                x2={xPos}
                y2={height - paddingY}
                stroke="rgba(71, 85, 105, 0.7)" // slate-600 with opacity
                strokeWidth="0.5"
              />
              <text
                x={xPos}
                y={height - paddingY + 15}
                fill="#A0AEC0" // slate-400
                fontSize="10"
                textAnchor="middle"
              >
                {tickValue}
              </text>
            </g>
          );
        })}
        
        <text x={width / 2} y={height - (paddingY/3)} fill="#CBD5E0" fontSize="11" textAnchor="middle">시간 (턴)</text>


        {/* Data line */}
        {sortedData.length > 1 ? (
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="2"
            points={points}
          />
        ) : sortedData.length === 1 ? (
          // Draw a circle if only one data point. getX might need adjustment if tickRange is 1.
          <circle cx={paddingX + chartWidth/2} cy={getY(sortedData[0].value)} r="3" fill={color} />
        ) : null}
      </svg>
    </div>
  );
};

const PlayerStatsChart: React.FC<PlayerStatsChartProps> = ({ history }) => {
  if (!history || history.length === 0) {
    return <p className="text-slate-400 text-sm text-center py-4">플레이어 스탯 기록이 없습니다.</p>;
  }

  // Cap history length for performance if it's too long for SVG rendering
  // Also, take a sample if it's too long to make lines smoother and rendering faster
  let displayHistory = history;
  const MAX_POINTS_DISPLAY = 200; 
  if (history.length > MAX_POINTS_DISPLAY) {
    const step = Math.floor(history.length / MAX_POINTS_DISPLAY);
    displayHistory = history.filter((_, index) => index % step === 0 || index === history.length -1 );
    if (displayHistory.length < 2 && history.length > 1) { // Ensure at least start and end
        displayHistory = [history[0], history[history.length -1]];
    } else if (displayHistory.length === 0 && history.length > 0) {
        displayHistory = [history[history.length -1]];
    }
  }


  const economyData = displayHistory.map(h => ({ tick: h.tick, value: h.economy }));
  const techData = displayHistory.map(h => ({ tick: h.tick, value: h.technology }));
  const diplomacyData = displayHistory.map(h => ({ tick: h.tick, value: h.diplomacy }));
  const resourcesData = displayHistory.map(h => ({ tick: h.tick, value: h.resources }));

  return (
    <div className="mt-1">
      <h3 className="text-xl font-semibold text-sky-300 mb-4 text-center">플레이어 국가 스탯 변화 추이</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-6">
        <SingleStatChart data={economyData} title="경제력" color="#38BDF8" /> {/* sky-400 */}
        <SingleStatChart data={techData} title="기술력" color="#A78BFA" /> {/* violet-400 */}
        <SingleStatChart data={diplomacyData} title="외교력" color="#FACC15" /> {/* yellow-400 */}
        <SingleStatChart data={resourcesData} title="자원보유량" color="#FB923C" /> {/* orange-400 */}
      </div>
    </div>
  );
};

export default PlayerStatsChart;
