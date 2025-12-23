'use client';

interface RecommendationCardProps {
    action: string;
    color: string;
    confidence: string;
    signals: string[];
    score: number;
}

export default function RecommendationCard({
    action,
    color,
    confidence,
    signals,
    score
}: RecommendationCardProps) {
    // Determine glow color based on action
    const getGlowColor = () => {
        if (action.includes('COMPRA')) return 'rgba(34, 197, 94, 0.5)';
        if (action.includes('VENTA')) return 'rgba(220, 38, 38, 0.5)';
        return 'rgba(234, 179, 8, 0.5)';
    };

    const getBgColor = () => {
        if (action.includes('COMPRA')) return 'bg-green-600';
        if (action.includes('VENTA')) return 'bg-red-600';
        return 'bg-yellow-600';
    };

    const glowColor = getGlowColor();
    const bgColor = getBgColor();

    return (
        <div className="mt-4">
            {/* Recommendation Badge */}
            <div
                className={`${bgColor} rounded-lg p-3 text-center transition-all duration-300`}
                style={{
                    boxShadow: `0 0 15px ${glowColor}`
                }}
            >
                <h2 className="text-lg font-black text-white mb-0.5 tracking-tighter">{action}</h2>
                <div className="flex justify-center gap-3 items-center">
                    <p className="text-white/80 text-[9px] uppercase tracking-widest font-bold">
                        Confianza: {confidence === 'high' ? 'Alta' : confidence === 'moderate' ? 'Moderada' : 'Baja'}
                    </p>
                    <div className="w-1 h-1 rounded-full bg-white/30" />
                    <p className="text-white/70 text-[9px] font-mono font-bold">
                        SCORE: {score > 0 ? '+' : ''}{score}
                    </p>
                </div>
            </div>

            {/* Signals List - Compact Grid */}
            <div className="mt-2 bg-gray-950/50 rounded-lg p-2 border border-gray-700/30">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-1">
                    {signals.map((signal, index) => (
                        <div key={index} className="text-gray-400 text-[10px] flex items-center min-w-0">
                            <span className="text-green-500/70 mr-1.5 text-[6px]">▶</span>
                            <span className="truncate font-medium">{signal}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
