'use client';

import { useState } from 'react';
import { Search, TrendingUp, Activity } from 'lucide-react';
import IndicatorBar from './IndicatorBar';
import RecommendationCard from './RecommendationCard';

interface StockAnalysis {
    symbol: string;
    quote: {
        current_price: number;
        percent_change: number;
    };
    indicators: {
        rsi: number;
        macd: {
            is_positive: boolean;
            histogram: number;
        };
        volume: {
            ratio: number;
        };
        moving_averages: {
            sma_20: number;
            sma_50: number;
        };
    };
    vix: {
        value: number;
        risk_level: string;
    };
    recommendation: {
        action: string;
        color: string;
        confidence: string;
        signals: string[];
        score: number;
    };
}

export default function StockAnalyzer() {
    const [ticker, setTicker] = useState('SOXL');
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<StockAnalysis | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleAnalyze = async () => {
        if (!ticker.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`http://localhost:8000/api/v1/stocks/analysis/${ticker.toUpperCase()}`);

            if (!response.ok) {
                throw new Error('Error al obtener datos del ticker');
            }

            const data = await response.json();
            setAnalysis(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
            setAnalysis(null);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-gray-300 p-2 sm:p-4 font-sans selection:bg-green-500/30">
            <div className="max-w-2xl mx-auto backdrop-blur-3xl">
                {/* Header - Minimalist */}
                <div className="flex items-center justify-between mb-4 px-1">
                    <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 bg-green-500 rounded-sm flex items-center justify-center">
                            <TrendingUp className="w-3.5 h-3.5 text-black stroke-[3]" />
                        </div>
                        <h1 className="text-sm font-black text-white tracking-widest uppercase">NUO TRADE</h1>
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse ml-1" />
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                            <Activity className="w-3 h-3 text-gray-500" />
                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-tighter">Live System v1.0</span>
                        </div>
                    </div>
                </div>

                {/* Search Bar - Integrated & Compact */}
                <div className="bg-gray-900/40 rounded-lg p-1.5 mb-4 border border-gray-800/50 flex gap-1.5">
                    <div className="flex-1 relative group">
                        <input
                            type="text"
                            value={ticker}
                            onChange={(e) => setTicker(e.target.value.toUpperCase())}
                            onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
                            placeholder="TICKER (E.G. SOXL)"
                            className="w-full bg-black/60 text-white px-3 py-1.5 text-xs font-mono rounded border border-gray-800 focus:border-green-500/50 focus:outline-none transition-all placeholder:text-gray-700"
                        />
                        <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-700 group-focus-within:text-green-500/50" />
                    </div>
                    <button
                        onClick={handleAnalyze}
                        disabled={loading}
                        className="bg-zinc-800 hover:bg-green-600 disabled:bg-zinc-900 text-[10px] text-white px-4 py-1.5 rounded font-black transition-all disabled:opacity-30 uppercase tracking-widest"
                    >
                        {loading ? '...' : 'Exec'}
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-950/20 border border-red-900/30 rounded-lg p-2 mb-4">
                        <p className="text-red-500 text-[10px] font-bold text-center uppercase tracking-tight">{error}</p>
                    </div>
                )}

                {/* Analysis Results - Terminal Style */}
                {analysis && (
                    <div className="bg-zinc-900/30 rounded-xl p-3 border border-zinc-800/40 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-green-500/20 to-transparent" />

                        {/* Stock Header - Ultra Compact */}
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-baseline gap-2">
                                <h2 className="text-3xl font-black text-white leading-tight tracking-tighter">{analysis.symbol}</h2>
                                <span className="text-[9px] text-gray-600 font-mono tracking-tighter uppercase">Market/US</span>
                            </div>
                            <div className="text-right">
                                <div className="text-xl font-mono font-bold text-white leading-none">
                                    {analysis.quote.current_price.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                </div>
                                <div className={`text-[10px] font-mono font-bold mt-1 ${analysis.quote.percent_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {analysis.quote.percent_change >= 0 ? '+' : ''}{analysis.quote.percent_change.toFixed(2)}%
                                </div>
                            </div>
                        </div>

                        {/* Technical Indicators - Grid 2x2 */}
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                                <IndicatorBar
                                    label="RSI"
                                    value={analysis.indicators.rsi}
                                    min={0}
                                    max={100}
                                />
                                <IndicatorBar
                                    label="VIX"
                                    value={Math.min(analysis.vix.value, 50)}
                                    min={0}
                                    max={50}
                                />
                                <IndicatorBar
                                    label="VOL"
                                    value={Math.min(analysis.indicators.volume.ratio, 3)}
                                    min={0}
                                    max={3}
                                    unit="x"
                                />
                                <div className="mb-2">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <span className="text-gray-400 text-[10px] font-bold uppercase tracking-tight">MA-T</span>
                                        <span className="text-white text-[10px] font-mono">
                                            {analysis.indicators.moving_averages.sma_20.toFixed(0)}/{analysis.indicators.moving_averages.sma_50.toFixed(0)}
                                        </span>
                                    </div>
                                    <IndicatorBar
                                        label=""
                                        value={analysis.indicators.moving_averages.sma_20 > analysis.indicators.moving_averages.sma_50 ? 80 : 20}
                                        min={0}
                                        max={100}
                                        showValue={false}
                                    />
                                </div>
                            </div>

                            {/* Status Metrics Ribbon */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="flex items-center justify-between px-2 py-1.5 bg-black/40 rounded border border-gray-800/30">
                                    <span className="text-[9px] text-gray-500 font-bold">Trend MACD</span>
                                    <span className={`text-[9px] font-black tracking-widest ${analysis.indicators.macd.is_positive ? 'text-green-500' : 'text-red-500'}`}>
                                        {analysis.indicators.macd.is_positive ? 'BULL' : 'BEAR'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between px-2 py-1.5 bg-black/40 rounded border border-gray-800/30">
                                    <span className="text-[9px] text-gray-500 font-bold">Risk Level</span>
                                    <span className="text-[9px] font-black text-white tracking-widest uppercase">
                                        {analysis.vix.risk_level}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Automated Advice */}
                        <RecommendationCard
                            action={analysis.recommendation.action}
                            color={analysis.recommendation.color}
                            confidence={analysis.recommendation.confidence}
                            signals={analysis.recommendation.signals}
                            score={analysis.recommendation.score}
                        />
                    </div>
                )}

                {/* Footer - Minimalist */}
                <div className="mt-8 pt-4 border-t border-zinc-900 flex justify-between items-center opacity-30">
                    <p className="text-[8px] font-bold tracking-[0.2em] uppercase">NUO TRADE DATA TERMINAL</p>
                    <p className="text-[8px] font-mono tracking-tighter">API: FINNHUB.IO • {new Date().getFullYear()}</p>
                </div>
            </div>
        </div>
    );
}
