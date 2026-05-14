'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/app-store';
import { getCompanyName } from '@/lib/constants';
import MiniSparkline from '../MiniSparkline';
import StockIcon from '../StockIcon';
import { ChevronRight, Plus, Sparkles, ArrowRight, Settings2, RotateCcw, Zap } from 'lucide-react';
import { useAgentSignals } from '@/hooks/useAgentSignals';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface Quote {
  symbol: string;
  current_price: number;
  percent_change: number;
  change: number;
  high: number;
  low: number;
  open: number;
  previous_close: number;
  is_simulated?: boolean;
}

const filters = ['All', 'Companies', 'Startup', 'Personal'];

export default function StocksView() {
  const { watchlist, setSelectedSymbol, isBeginnerMode } = useAppStore();
  const { lastSignal, livePrices } = useAgentSignals();
  const [activeFilter, setActiveFilter] = useState('All');
  const [watchlistQuotes, setWatchlistQuotes] = useState<Record<string, Quote>>({});
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [adjustments, setAdjustments] = useState<any[]>([]);

  const REFRESH_MS = 60000;

  useEffect(() => {
    async function fetchWatchlist() {
      setLoading(true);
      const quotes: Record<string, Quote> = {};
      const spark: Record<string, number[]> = {};
      await Promise.all(
        watchlist.map(async (symbol) => {
          try {
            const [quoteRes, ohlcvRes] = await Promise.all([
              fetch(`${API_URL}/api/v1/stocks/quote/${symbol}`),
              fetch(`${API_URL}/api/v1/market/ohlcv/${symbol}?timeframe=D&days=14`),
            ]);
            if (quoteRes.ok) {
              const q = await quoteRes.json();
              quotes[symbol] = q;
            }
            if (ohlcvRes.ok) {
              const resJson = await ohlcvRes.json();
              // Check if it's the new format or old format
              const data = Array.isArray(resJson) ? resJson : resJson.data;
              if (Array.isArray(data) && data.length) {
                spark[symbol] = data.map((d: { close: number }) => d.close);
              }
            }
          } catch (e) {
            console.error(`Error fetching ${symbol}:`, e);
          }
        })
      );
      setWatchlistQuotes(quotes);
      setSparklines(spark);
      
      // Fetch optimization data
      try {
        const [wRes, aRes] = await Promise.all([
          fetch(`${API_URL}/api/v1/accuracy/report`),
          fetch(`${API_URL}/api/v1/accuracy/adjustments?limit=5`)
        ]);
        if (wRes.ok) {
          const report = await wRes.json();
          const wMap: Record<string, number> = {};
          Object.entries(report.by_skill).forEach(([name, data]: [string, any]) => {
             wMap[name] = data.current_weight || (1 / Object.keys(report.by_skill).length);
          });
          setWeights(wMap);
        }
        if (aRes.ok) setAdjustments(await aRes.json());
      } catch (e) {
        console.error("Error optimization data:", e);
      }

      setLoading(false);
    }
    fetchWatchlist();
    const t = setInterval(fetchWatchlist, REFRESH_MS);
    return () => clearInterval(t);
  }, [watchlist]);

  return (
    <div className="space-y-8 pb-12 animate-slide-up">
      {/* Greeting & Profile */}
      <div className="pt-4">
        <p className="text-white/50 text-sm font-medium mb-1">Good evening,</p>
        <h2 className="font-serif text-5xl font-medium tracking-tight">Leandro</h2>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
              activeFilter === f
                ? 'bg-white text-black shadow-lg shadow-white/20'
                : 'bg-white/5 text-white/50 border border-white/5 hover:bg-white/10'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Watchlist / Trending Section */}
      <div className="space-y-6">
        <div className="flex justify-between items-end">
          <h3 className="text-xl font-medium text-white/90">Trending Picks</h3>
          <button className="text-sm text-white/40 hover:text-white transition-colors">See all</button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {watchlist.map((symbol) => {
            const q = watchlistQuotes[symbol];
            const live = livePrices[symbol];
            
            const price = live?.price ?? q?.current_price ?? 0;
            const pct = live?.change_pct ?? q?.percent_change ?? 0;
            
            const positive = pct >= 0;
            const sparkData = sparklines[symbol] || [];

            return (
              <button
                key={symbol}
                onClick={() => setSelectedSymbol(symbol)}
                className="glass group relative flex flex-col p-5 text-left transition-all duration-500 hover:bg-white/10 hover:scale-[1.02] hover:shadow-2xl hover:shadow-white/5 overflow-hidden"
              >
                {/* Background Decor */}
                <div className={`absolute top-0 right-0 w-24 h-24 blur-[60px] opacity-20 rounded-full transition-colors ${positive ? 'bg-blue-500' : 'bg-red-500'}`} />
                
                <div className="relative z-10 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-white/90">{getCompanyName(symbol)}</h4>
                      <p className="text-[10px] text-white/40 font-bold tracking-widest uppercase">{symbol}</p>
                    </div>
                    {q?.is_simulated && (
                      <div className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-2xl font-semibold tracking-tight">
                      ${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className={`text-xs font-medium ${positive ? 'text-blue-400' : 'text-red-400'}`}>
                      {positive ? '+' : ''}{(Math.abs(pct) || 0).toFixed(2)}%
                    </p>
                  </div>

                  <div className="h-12 w-full mt-2">
                    <MiniSparkline data={sparkData} positive={positive} />
                  </div>
                </div>
              </button>
            );
          })}
          
          {/* Add New Card */}
          <button className="glass flex flex-col items-center justify-center p-5 text-white/20 hover:text-white/40 border-dashed border-white/10 hover:border-white/20 transition-all duration-300">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-2">
              <Plus className="w-6 h-6" />
            </div>
            <span className="text-xs font-medium">Add Asset</span>
          </button>
        </div>
      </div>

      {/* Agent Optimization Panel (Expert Mode) */}
      {!isBeginnerMode && (
        <div className="space-y-6 pt-4 border-t border-white/5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
               <Settings2 className="w-5 h-5 text-blue-400" />
               <h3 className="text-xl font-medium text-white/90">Optimización del Agente</h3>
            </div>
            <button 
              onClick={async () => {
                const res = await fetch(`${API_URL}/api/v1/accuracy/adjust?force=true`, { method: 'POST' });
                if (res.ok) window.location.reload();
              }}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-tighter bg-blue-500/10 text-blue-400 px-4 py-2 rounded-full border border-blue-500/20 hover:bg-blue-500/20 transition-all"
            >
              <Zap className="w-3 h-3" /> Forzar Rebalanceo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Weight Distribution */}
             <div className="glass p-6 space-y-4">
                <p className="text-xs font-bold text-white/30 uppercase tracking-widest">Distribución de Pesos Actual</p>
                <div className="space-y-4">
                   {Object.entries(weights).sort((a,b) => b[1] - a[1]).map(([name, weight], i) => (
                     <div key={i} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-medium">
                           <span className="text-white/60">{name}</span>
                           <span className="text-blue-400">{(weight * 100).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                           <div 
                             className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000"
                             style={{ width: `${weight * 100}%` }}
                           />
                        </div>
                     </div>
                   ))}
                </div>
             </div>

             {/* Adjustment Timeline */}
             <div className="glass p-6 space-y-4">
                <p className="text-xs font-bold text-white/30 uppercase tracking-widest">Historial de Ajustes</p>
                <div className="space-y-3">
                   {adjustments.length > 0 ? adjustments.map((adj, i) => (
                     <div key={i} className="flex gap-4 p-3 rounded-xl bg-white/5 border border-white/5 group">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                           <RotateCcw className="w-4 h-4" />
                        </div>
                        <div className="flex-1 space-y-0.5">
                           <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-white/40">{new Date(adj.adjusted_at).toLocaleDateString()}</span>
                              <button 
                                onClick={async () => {
                                  await fetch(`${API_URL}/api/v1/accuracy/rollback/${adj.id}`, { method: 'POST' });
                                  window.location.reload();
                                }}
                                className="text-[9px] font-bold text-blue-400 opacity-0 group-hover:opacity-100 uppercase tracking-tighter hover:underline transition-opacity"
                              >
                                Rollback
                              </button>
                           </div>
                           <p className="text-xs font-medium text-white/80">{adj.reason}</p>
                           <p className="text-[10px] text-white/30 truncate">
                              Weights: {Object.keys(adj.weights_after).length} skills rebalanced
                           </p>
                        </div>
                     </div>
                   )) : (
                     <div className="h-full flex items-center justify-center py-8">
                        <p className="text-xs text-white/20 italic text-center">
                           Esperando suficientes datos para iniciar el primer ciclo de auto-optimización.
                        </p>
                     </div>
                   )}
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Floating Agent Signal Banner */}
      {lastSignal && (
        <div className="fixed bottom-32 left-4 right-4 z-50 animate-slide-up">
          <button 
            onClick={() => setSelectedSymbol(lastSignal.symbol)}
            className="w-full glass bg-blue-500/20 border-blue-500/30 p-4 rounded-3xl shadow-2xl flex items-center justify-between group overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-blue-400" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Señal Detectada</span>
                  <div className="w-1 h-1 bg-white/20 rounded-full" />
                  <span className="text-xs font-medium text-white/40">{lastSignal.symbol}</span>
                </div>
                <p className="text-sm font-semibold text-white/90">
                  {lastSignal.action} {lastSignal.symbol} — {lastSignal.confidence}% Confianza
                </p>
              </div>
            </div>
            
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all relative z-10">
              <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
