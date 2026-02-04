'use client';

interface BrutalistIndicatorBarProps {
  label: string;
  explanation: string; // Simple explanation for beginners
  value: number;
  min: number;
  max: number;
  positiveThreshold?: number; // Threshold for "good" (green)
  negativeThreshold?: number; // Threshold for "bad" (red)
  higherIsBetter?: boolean; // If true, value >= positiveThreshold is good. If false, value <= positiveThreshold is good
  unit?: string;
  showTooltip?: boolean;
}

export default function BrutalistIndicatorBar({
  label,
  explanation,
  value,
  min,
  max,
  positiveThreshold,
  negativeThreshold,
  higherIsBetter = true, // Default: higher values are better
  unit = '',
  showTooltip = false,
}: BrutalistIndicatorBarProps) {
  const percentage = ((value - min) / (max - min)) * 100;
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  // Determine color based on thresholds
  let barColor = 'bg-white';
  let textColor = 'text-black';
  let statusText = '';
  let arrowDirection: 'up' | 'down' | 'neutral' = 'neutral';
  
  if (higherIsBetter) {
    // Higher is better (MACD, Volume, etc.)
    if (positiveThreshold !== undefined && value >= positiveThreshold) {
      barColor = 'bg-[#22c55e]';
      textColor = 'text-[#22c55e]';
      statusText = 'BUENO';
      arrowDirection = 'up';
    } else if (negativeThreshold !== undefined && value <= negativeThreshold) {
      barColor = 'bg-[#ef4444]';
      textColor = 'text-[#ef4444]';
      statusText = 'MALO';
      arrowDirection = 'down';
    } else {
      barColor = 'bg-white';
      textColor = 'text-black';
      statusText = 'NEUTRAL';
      arrowDirection = 'neutral';
    }
  } else {
    // Lower is better (RSI < 30 is good, RSI > 70 is bad, VIX < 20 is good, VIX > 30 is bad)
    if (positiveThreshold !== undefined && value <= positiveThreshold) {
      barColor = 'bg-[#22c55e]';
      textColor = 'text-[#22c55e]';
      statusText = 'BUENO';
      arrowDirection = 'up';
    } else if (negativeThreshold !== undefined && value >= negativeThreshold) {
      barColor = 'bg-[#ef4444]';
      textColor = 'text-[#ef4444]';
      statusText = 'MALO';
      arrowDirection = 'down';
    } else {
      barColor = 'bg-white';
      textColor = 'text-black';
      statusText = 'NEUTRAL';
      arrowDirection = 'neutral';
    }
  }

  return (
    <div className="bg-white border-2 border-black p-3">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <div className="brutal-text text-sm text-black flex items-center gap-2">
            {label}
            {/* Arrow indicator */}
            {arrowDirection === 'up' && (
              <span className="text-[#22c55e] text-xl leading-none font-black" style={{ fontSize: '20px' }}>▲</span>
            )}
            {arrowDirection === 'down' && (
              <span className="text-[#ef4444] text-xl leading-none font-black" style={{ fontSize: '20px' }}>▼</span>
            )}
            {arrowDirection === 'neutral' && (
              <span className="text-black/50 text-xl leading-none font-black" style={{ fontSize: '20px' }}>─</span>
            )}
          </div>
          {showTooltip && (
            <div className="text-[9px] font-black uppercase text-black/60 mt-1 leading-tight">
              {explanation}
            </div>
          )}
        </div>
        <div className="text-right ml-4">
          <div className={`brutal-text text-base ${textColor} flex items-center justify-end gap-1`}>
            {value.toFixed(1)}{unit}
            {/* Value arrow */}
            {arrowDirection === 'up' && (
              <span className="text-[#22c55e] font-black" style={{ fontSize: '14px' }}>▲</span>
            )}
            {arrowDirection === 'down' && (
              <span className="text-[#ef4444] font-black" style={{ fontSize: '14px' }}>▼</span>
            )}
          </div>
          <div className={`text-[10px] font-black uppercase ${textColor}`}>
            {statusText}
          </div>
        </div>
      </div>
      
      {/* Brutalist bar - solid blocks with arrow marker */}
      <div className="relative h-10 bg-black border-2 border-black">
        {/* Color blocks */}
        <div className="absolute inset-0 flex">
          <div className="flex-1 bg-[#ef4444] border-r-2 border-black" />
          <div className="flex-1 bg-white border-r-2 border-black" />
          <div className="flex-1 bg-white border-r-2 border-black" />
          <div className="flex-1 bg-white border-r-2 border-black" />
          <div className="flex-1 bg-[#22c55e]" />
        </div>
        
        {/* Zone labels */}
        <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none z-0">
          <span className="text-[8px] font-black uppercase" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>VENTA</span>
          <span className="text-[8px] font-black uppercase" style={{ color: 'rgba(0, 0, 0, 0.5)' }}>NEUTRAL</span>
          <span className="text-[8px] font-black uppercase" style={{ color: 'rgba(255, 255, 255, 0.6)' }}>COMPRA</span>
        </div>
        
        {/* Arrow marker - more visible */}
        <div
          className="absolute top-0 bottom-0 flex items-center justify-center z-20"
          style={{ left: `${clampedPercentage}%`, transform: 'translateX(-50%)' }}
        >
          {/* Arrow pointing down - brutalist style */}
          <div className="relative flex flex-col items-center">
            {/* Arrow head pointing down */}
            <div 
              className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[12px] border-t-black border-l-transparent border-r-transparent"
              style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.3))' }}
            />
            {/* Arrow shaft */}
            <div 
              className={`w-3 h-8 border-l-2 border-r-2 border-black -mt-[2px]`}
              style={{ 
                backgroundColor: arrowDirection === 'up' ? '#22c55e' : arrowDirection === 'down' ? '#ef4444' : '#ffffff'
              }}
            />
          </div>
        </div>
      </div>
      
      {/* Percentage indicator below bar */}
      <div className="text-[9px] font-black uppercase text-black mt-2 text-center border-t-2 border-black pt-2">
        POSICIÓN: {Math.round(clampedPercentage)}%
      </div>
    </div>
  );
}
