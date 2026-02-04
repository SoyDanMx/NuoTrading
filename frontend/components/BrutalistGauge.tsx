'use client';

interface BrutalistGaugeProps {
  score: number; // 0-100
  label: string;
  showBreakdown?: boolean;
  breakdown?: { label: string; value: number; contribution: number }[];
}

export default function BrutalistGauge({ score, label, showBreakdown = false, breakdown = [] }: BrutalistGaugeProps) {
  // Normalize score to 0-100
  const normalizedScore = Math.max(0, Math.min(100, score));
  
  // Determine signal and color
  let signal = 'MANTENER';
  let signalColor = 'bg-white text-black';
  let barColor = 'bg-white';
  
  if (normalizedScore >= 70) {
    signal = 'COMPRA FUERTE';
    signalColor = 'bg-[#22c55e] text-white';
    barColor = 'bg-[#22c55e]';
  } else if (normalizedScore >= 55) {
    signal = 'COMPRA';
    signalColor = 'bg-[#22c55e] text-white';
    barColor = 'bg-[#22c55e]';
  } else if (normalizedScore >= 45) {
    signal = 'MANTENER';
    signalColor = 'bg-white text-black';
    barColor = 'bg-white';
  } else if (normalizedScore >= 30) {
    signal = 'VENTA';
    signalColor = 'bg-[#ef4444] text-white';
    barColor = 'bg-[#ef4444]';
  } else {
    signal = 'VENTA FUERTE';
    signalColor = 'bg-[#ef4444] text-white';
    barColor = 'bg-[#ef4444]';
  }

  return (
    <div className="space-y-3">
      {/* Signal Display */}
      <div className={`${signalColor} border-2 border-black p-4 text-center`}>
        <div className="brutal-title text-2xl mb-1">{signal}</div>
        <div className="brutal-text text-sm">PUNTUACIÓN: {Math.round(normalizedScore)}/100</div>
      </div>

      {/* Linear Gauge - Brutalist Style */}
      <div className="bg-black border-2 border-white p-2">
        <div className="relative h-12 bg-white border-2 border-black">
          {/* Color blocks */}
          <div className="absolute inset-0 flex">
            <div className="flex-1 bg-[#ef4444] border-r-2 border-black" />
            <div className="flex-1 bg-white border-r-2 border-black" />
            <div className="flex-1 bg-white border-r-2 border-black" />
            <div className="flex-1 bg-white border-r-2 border-black" />
            <div className="flex-1 bg-[#22c55e]" />
          </div>
          {/* Marker */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-black border-2 border-white"
            style={{ left: `${normalizedScore}%`, transform: 'translateX(-50%)' }}
          >
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-b-black border-l-transparent border-r-transparent" />
          </div>
        </div>
      </div>

      {/* Breakdown (if enabled) */}
      {showBreakdown && breakdown.length > 0 && (
        <div className="bg-white border-2 border-black p-3 space-y-2">
          <div className="brutal-text text-xs text-black border-b-2 border-black pb-1">
            DESGLOSE
          </div>
          {breakdown.map((item, i) => (
            <div key={i} className="flex justify-between items-center border-b border-black/20 pb-1">
              <span className="text-[10px] font-black uppercase text-black/80">{item.label}</span>
              <span className={`text-[10px] font-black ${item.contribution >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                {item.contribution >= 0 ? '+' : ''}{item.contribution.toFixed(0)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
