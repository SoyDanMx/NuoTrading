'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
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
  isBeginnerMode?: boolean;
}

export default function AdvancedIndicators({
  supportResistance,
  divergence,
  fibonacci,
  isBeginnerMode = true,
}: AdvancedIndicatorsProps) {
  const [isExpanded, setIsExpanded] = useState(!isBeginnerMode);

  if (!supportResistance && !divergence && !fibonacci) {
    return null;
  }

  return (
    <div className="bg-white border-2 border-black">
      {/* Header - Collapsible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex justify-between items-center p-3 bg-black text-white hover:bg-white hover:text-black transition-colors"
      >
        <div className="brutal-text text-sm">INDICADORES AVANZADOS</div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5" strokeWidth={3} />
        ) : (
          <ChevronDown className="w-5 h-5" strokeWidth={3} />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 space-y-3">
          {/* Support/Resistance */}
          {supportResistance && (
            <div className="space-y-2">
              <EnhancedIndicatorBar
                label="SOPORTE/RESISTENCIA"
                explanation="Niveles clave donde el precio puede rebotar o romper"
                value={supportResistance.near_support ? 1 : supportResistance.near_resistance ? -1 : 0}
                min={-1}
                max={1}
                positiveThreshold={0}
                higherIsBetter={true}
                unit=""
                showTooltip={true}
                tooltipId="sr-indicator"
              />
              <div className="text-[9px] font-black uppercase text-black/60 pl-2 border-l-2 border-black">
                Soporte: ${supportResistance.support_level.toFixed(2)} • 
                Resistencia: ${supportResistance.resistance_level.toFixed(2)} • 
                Precio: ${supportResistance.current_price.toFixed(2)}
              </div>
            </div>
          )}

          {/* Divergence */}
          {divergence && (
            <div className="space-y-2">
              <EnhancedIndicatorBar
                label="DIVERGENCIA"
                explanation="Cuando precio e indicadores se mueven en direcciones opuestas"
                value={divergence.detected ? (divergence.type === 'bullish' ? divergence.strength : -divergence.strength) : 0}
                min={-100}
                max={100}
                positiveThreshold={50}
                negativeThreshold={-50}
                higherIsBetter={true}
                unit="%"
                showTooltip={true}
                tooltipId="divergence-indicator"
              />
              {divergence.detected && (
                <div className={`text-[9px] font-black uppercase p-2 border-2 border-black ${
                  divergence.type === 'bullish' ? 'bg-[#16a34a]/20 text-[#16a34a]' : 'bg-[#dc2626]/20 text-[#dc2626]'
                }`}>
                  {divergence.type === 'bullish' ? '▲ DIVERGENCIA ALCISTA DETECTADA' : '▼ DIVERGENCIA BAJISTA DETECTADA'}
                </div>
              )}
            </div>
          )}

          {/* Fibonacci */}
          {fibonacci && (
            <div className="space-y-2">
              <EnhancedIndicatorBar
                label="FIBONACCI"
                explanation="Niveles de retroceso basados en proporciones matemáticas"
                value={fibonacci.current_level ? parseFloat(fibonacci.current_level) : 50}
                min={0}
                max={100}
                positiveThreshold={23.6}
                negativeThreshold={78.6}
                higherIsBetter={false}
                unit="%"
                showTooltip={true}
                tooltipId="fibonacci-indicator"
              />
              {fibonacci.current_level && (
                <div className="text-[9px] font-black uppercase text-black/60 pl-2 border-l-2 border-black">
                  Nivel actual: {fibonacci.current_level}% • 
                  Rango: ${fibonacci.swing_low.toFixed(2)} - ${fibonacci.swing_high.toFixed(2)}
                </div>
              )}
              {/* Fibonacci levels visualization */}
              <div className="bg-black border-2 border-black p-2 space-y-1">
                {Object.entries(fibonacci.levels).map(([level, price]) => (
                  <div
                    key={level}
                    className={`flex justify-between items-center text-[8px] font-black uppercase p-1 ${
                      level === fibonacci.current_level ? 'bg-white text-black' : 'text-white/60'
                    }`}
                  >
                    <span>{level}%</span>
                    <span>${price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
