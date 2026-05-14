'use client';

import React from 'react';
import { Info, CheckCircle2, TrendingUp, TrendingDown, Activity, Zap, Plus, Sparkles } from 'lucide-react';

interface SignalBarProps {
  score: number; // 0 to 10
  signal: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';
  reasoning: string;
  indicators: {
    rsi: number;
    macd: string;
    volume: number;
    sma50: 'ABOVE' | 'BELOW';
    sma200: 'ABOVE' | 'BELOW';
  };
  isBeginnerMode: boolean;
  onAddWatchlist?: () => void;
  onSeeAnalysis?: () => void;
}

export default function SignalBar({
  score,
  signal,
  reasoning,
  indicators,
  isBeginnerMode,
  onAddWatchlist,
  onSeeAnalysis
}: SignalBarProps) {
  // Mapping score to progress bar
  const percentage = (score / 10) * 100;
  
  const getSignalColor = (s: string) => {
    if (s.includes('BUY')) return 'text-green-500';
    if (s.includes('SELL')) return 'text-red-500';
    return 'text-yellow-500';
  };

  const getIndicatorPill = (label: string, value: string | number, status: 'positive' | 'neutral' | 'negative') => {
    const colors = {
      positive: 'bg-green-500/10 text-green-500 border-green-500/20',
      neutral: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      negative: 'bg-red-500/10 text-red-500 border-red-500/20'
    };
    return (
      <div className={`px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider flex items-center gap-2 ${colors[status]}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${status === 'positive' ? 'bg-green-500' : status === 'negative' ? 'bg-red-500' : 'bg-yellow-500'}`} />
        {label}: {value}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Barra de Recomendación Visual */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-black uppercase text-white/40 tracking-widest flex items-center gap-2">
             <Zap className="w-3 h-3" /> Barra de Recomendación Visual
          </h3>
          <span className="text-[10px] font-bold text-white/20 uppercase tracking-tighter">AI Precision Engine v2</span>
        </div>

        <div className="relative h-4 w-full bg-white/5 rounded-full overflow-hidden flex">
          <div className="h-full bg-red-500/40 w-1/5" />
          <div className="h-full bg-orange-500/40 w-1/5" />
          <div className="h-full bg-gray-500/40 w-1/5" />
          <div className="h-full bg-green-500/40 w-1/5" />
          <div className="h-full bg-green-600/60 w-1/5" />
          
          {/* Marcador */}
          <div 
            className="absolute top-0 w-1.5 h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)] z-10 transition-all duration-1000 ease-out"
            style={{ left: `${percentage}%`, transform: 'translateX(-50%)' }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[9px] font-black uppercase tracking-widest text-white/30">
          <span>Venta fuerte</span>
          <span>Neutro</span>
          <span>Compra fuerte</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 2. Calificación AI */}
        <div className={`p-6 rounded-2xl border transition-all ${score >= 7 ? 'bg-green-500/10 border-green-500/20' : score <= 3 ? 'bg-red-500/10 border-red-500/20' : 'bg-white/5 border-white/10'}`}>
           <h4 className="text-xs font-black text-white/40 uppercase mb-4">Calificación IA: {score.toFixed(1)} / 10</h4>
           <div className="flex items-center gap-3 mb-4">
              <span className={`text-2xl font-black uppercase ${getSignalColor(signal)}`}>
                {signal.replace('_', ' ')}
              </span>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${score >= 7 ? 'bg-green-500' : 'bg-yellow-500'}`}>
                <CheckCircle2 className="w-4 h-4 text-black" />
              </div>
           </div>
           
           <div className="space-y-4">
             <div className="flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-1" />
                <p className="text-sm text-white/80 leading-relaxed font-medium">
                  {reasoning}
                </p>
             </div>
             
             {isBeginnerMode && (
               <div className="flex gap-2 pt-2">
                 <button onClick={onAddWatchlist} className="flex-1 bg-white text-black text-[10px] font-black uppercase py-3 rounded-xl hover:bg-white/90 transition-colors">
                    Agregar a Watchlist
                 </button>
                 <button onClick={onSeeAnalysis} className="flex-1 bg-white/5 text-white text-[10px] font-black uppercase py-3 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                    Ver Análisis Full
                 </button>
               </div>
             )}
           </div>
        </div>

        {/* 3. Indicadores Clave */}
        <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-6">
           <h4 className="text-xs font-black text-blue-400/60 uppercase mb-4">Indicadores clave</h4>
           <div className="flex flex-wrap gap-2">
              {getIndicatorPill("RSI", indicators.rsi, indicators.rsi < 30 ? 'positive' : indicators.rsi > 70 ? 'negative' : 'neutral')}
              {getIndicatorPill("MACD", indicators.macd, indicators.macd.includes('Bullish') || indicators.macd.includes('alcista') ? 'positive' : 'negative')}
              {getIndicatorPill("Volumen", `${indicators.volume > 0 ? '+' : ''}${indicators.volume}%`, indicators.volume > 20 ? 'positive' : 'neutral')}
              {getIndicatorPill("SMA50", indicators.sma50 === 'ABOVE' ? 'Sobre' : 'Bajo', indicators.sma50 === 'ABOVE' ? 'positive' : 'negative')}
              {getIndicatorPill("SMA200", indicators.sma200 === 'ABOVE' ? 'Sobre' : 'Bajo', indicators.sma200 === 'ABOVE' ? 'positive' : 'negative')}
           </div>

           {!isBeginnerMode && (
             <div className="mt-8 pt-6 border-t border-blue-500/10 space-y-4">
                <div className="flex justify-between items-center text-xs">
                   <span className="text-white/40">Confidence Interval</span>
                   <span className="font-mono text-blue-400">92.4%</span>
                </div>
                <div className="w-full h-1.5 bg-blue-500/10 rounded-full overflow-hidden">
                   <div className="h-full bg-blue-500 w-[92.4%]" />
                </div>
                <button className="w-full py-2 bg-white/5 border border-white/10 rounded-lg text-[9px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors">
                   Toggle Raw Performance Data
                </button>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
