'use client';

import { useState } from 'react';

interface IndicatorBarProps {
    label: string;
    value: number;
    min: number;
    max: number;
    unit?: string;
    showValue?: boolean;
}

export default function IndicatorBar({
    label,
    value,
    min,
    max,
    unit = '',
    showValue = true
}: IndicatorBarProps) {
    // Calculate position percentage (0-100)
    const position = ((value - min) / (max - min)) * 100;
    const clampedPosition = Math.max(0, Math.min(100, position));

    return (
        <div className="mb-2">
            <div className="flex justify-between items-center mb-0.5">
                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-tight">{label}</span>
                {showValue && (
                    <span className="text-white text-[10px] font-mono">
                        {value.toFixed(2)}{unit}
                    </span>
                )}
            </div>

            {/* Gradient Progress Bar - Thinner */}
            <div className="relative h-1.5 rounded-full overflow-hidden bg-gray-900 border border-gray-700/50">
                {/* Gradient Background */}
                <div
                    className="absolute inset-0 opacity-60"
                    style={{
                        background: 'linear-gradient(to right, #ef4444 0%, #f97316 25%, #eab308 50%, #84cc16 75%, #22c55e 100%)'
                    }}
                />

                {/* Position Marker */}
                <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_4px_rgba(255,255,255,0.8)] transition-all duration-500 ease-out"
                    style={{
                        left: `${clampedPosition}%`,
                    }}
                >
                </div>
            </div>
        </div>
    );
}
