'use client';

import EnhancedIndicatorBar from './EnhancedIndicatorBar';

interface AdvancedIndicatorsProps {
  supportResistance?: {
    support_level: number;
    resistance_level: number;
    current_price: number;
    support_distance_pct: number;
    resistance_distance_pct: number;
    near_support: boolean;
    near_resistance: boolean;
    signal: string;
  };
  divergence?: {
    detected: boolean;
    type: string | null;
    strength: number;
  };
  fibonacci?: {
    levels: Record<string, number>;
    swing_high: number;
    swing_low: number;
    current_price: number;
    current_level: string | null;
    trend: string;
  };
}

export default function AdvancedIndicators({
  supportResistance,
  divergence,
  fibonacci,
}: AdvancedIndicatorsProps) {
  if (!supportResistance && !divergence && !fibonacci) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Support/Resistance */}
      {supportResistance && (
        <div className="space-y-3">
          <EnhancedIndicatorBar
            label="S/R Proximity"
            value={supportResistance.near_support ? 1 : supportResistance.near_resistance ? -1 : 0}
            min={-1}
            max={1}
            positiveThreshold={0}
          />
          <div className="flex justify-between text-[10px] font-bold text-white/20 uppercase tracking-widest">
            <span>Sup: ${supportResistance.support_level.toFixed(2)}</span>
            <span>Res: ${supportResistance.resistance_level.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Divergence */}
      {divergence && (
        <div className="space-y-3">
          <EnhancedIndicatorBar
            label="Divergence"
            value={divergence.detected ? (divergence.type === 'bullish' ? divergence.strength : -divergence.strength) : 0}
            min={-100}
            max={100}
            positiveThreshold={50}
            negativeThreshold={-50}
            unit="%"
          />
          {divergence.detected && (
            <div className={`text-[10px] font-bold uppercase tracking-widest p-2 rounded-lg text-center ${
              divergence.type === 'bullish' ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'
            }`}>
              {divergence.type === 'bullish' ? 'Bullish' : 'Bearish'} Divergence Detected
            </div>
          )}
        </div>
      )}

      {/* Fibonacci */}
      {fibonacci && (
        <div className="space-y-3">
          <EnhancedIndicatorBar
            label="Fibonacci Retracement"
            value={fibonacci.current_level ? parseFloat(fibonacci.current_level) : 50}
            min={0}
            max={100}
            positiveThreshold={23.6}
            negativeThreshold={78.6}
            higherIsBetter={false}
            unit="%"
          />
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(fibonacci.levels).slice(0, 3).map(([level, price]) => (
              <div key={level} className="bg-white/5 p-2 rounded-lg text-center">
                <p className="text-[8px] font-bold text-white/20 uppercase">{level}%</p>
                <p className="text-[10px] font-medium text-white/60">${price.toFixed(1)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
