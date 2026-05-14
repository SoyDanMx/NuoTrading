'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, Zap, TrendingUp, TrendingDown, Activity, Star, Globe, Coins, BarChart3, Landmark } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import StockIcon from '../StockIcon';
import { getCompanyName } from '@/lib/constants';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

const CATEGORIES = [
  { id: 'POPULAR', label: 'Todos', icon: Star },
  { id: 'TECH', label: 'Stocks', icon: Zap },
  { id: 'ETFS', label: 'ETFs', icon: BarChart3 },
  { id: 'CRYPTO', label: 'Crypto', icon: Coins },
  { id: 'FOREX', label: 'Forex', icon: Globe },
  { id: 'MATERIAS', label: 'Materias', icon: Activity },
  { id: 'ÍNDICES', label: 'Índices', icon: Landmark },
  { id: 'MX', label: 'México', icon: Star },
];

const SECTORS: Record<string, string[]> = {
  'POPULAR': ['AAPL', 'TSLA', 'NVDA', 'GOOGL', 'META', 'MSFT', 'AMZN', 'NFLX'],
  'TECH': ['NVDA', 'AMD', 'ARM', 'ASML', 'AVGO', 'SMCI', 'TSM', 'INTC', 'ADBE'],
  'ENERGY': ['XOM', 'CVX', 'SHEL', 'BP', 'TTE', 'SLB', 'COP'],
  'FINANCE': ['JPM', 'GS', 'MS', 'BAC', 'WFC', 'V', 'MA'],
  'CRYPTO': ['BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD', 'ADA-USD', 'XRP-USD'],
  'ÍNDICES': ['^SPX', '^DJI', '^IXIC', '^VIX', '^MXX'],
  'ETFS': ['SPY', 'QQQ', 'IWM', 'GLD', 'TLT', 'VNQ', 'XLF', 'XLE'],
  'FOREX': ['EURUSD=X', 'GBPUSD=X', 'JPYUSD=X', 'MXNUSD=X', 'AUDUSD=X'],
  'MATERIAS': ['GC=F', 'CL=F', 'SI=F', 'HG=F', 'ZC=F'],
  'BONOS': ['^TNX', '^TYX', '^IRX'],
  'MX': ['AMXL.MX', 'WALMEX.MX', 'FEMSAUBD.MX', 'GFNORTEO.MX', 'GMEXICOB.MX', 'GRUMAB.MX']
};

interface AssetData {
  symbol: string;
  name: string;
  price: number;
  change_pct: number;
  score: number;
  signal: string;
  volume_ratio: number;
}

export default function FindView() {
  const { setSelectedSymbol } = useAppStore();
  const [activeCategory, setActiveCategory] = useState('POPULAR');
  const [assets, setAssets] = useState<AssetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  
  // Filtros y Orden
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'change' | 'volume' | 'score'>('score');

  const mapSignalToScore = (signal?: string, score?: number) => {
    if (score !== undefined && score !== 0) return score;
    switch (signal) {
      case 'STRONG_BUY': return 9.2;
      case 'BUY': return 7.5;
      case 'HOLD': return 5.0;
      case 'SELL': return 3.2;
      case 'STRONG_SELL': return 1.5;
      default: return 5.0;
    }
  };

  useEffect(() => {
    async function loadSectorData() {
      setLoading(true);
      const tickers = SECTORS[activeCategory] || [];
      
      const results = await Promise.allSettled(
        tickers.map(async (sym) => {
          const res = await fetch(`${API_URL}/api/v1/stocks/quote/${sym}`);
          if (!res.ok) throw new Error('Failed');
          const d = await res.json();
          return {
            symbol: sym,
            name: getCompanyName(sym),
            price: d.current_price,
            change_pct: d.percent_change || 0,
            score: mapSignalToScore(d.signal, d.signal_score),
            signal: d.signal || 'HOLD',
            volume_ratio: d.volume_ratio || 1.0
          };
        })
      );

      const validAssets = results
        .filter((r): r is PromiseFulfilledResult<AssetData> => r.status === 'fulfilled')
        .map(r => r.value);

      setAssets(validAssets);
      setLoading(false);
    }

    loadSectorData();
  }, [activeCategory]);

  const toggleFilter = (f: string) => {
    const next = new Set(activeFilters);
    if (next.has(f)) next.delete(f);
    else next.add(f);
    setActiveFilters(next);
  };

  const filteredAndSortedData = useMemo(() => {
    let result = [...assets];

    // Búsqueda
    if (query) {
      result = result.filter(a => 
        a.symbol.toLowerCase().includes(query.toLowerCase()) || 
        a.name.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Filtros
    if (activeFilters.has('vol')) result = result.filter(a => a.volume_ratio > 1.2);
    if (activeFilters.has('bull')) result = result.filter(a => a.change_pct > 0.5);
    if (activeFilters.has('buy')) result = result.filter(a => a.score >= 7);
    if (activeFilters.has('sell')) result = result.filter(a => a.score <= 4);

    // Orden
    result.sort((a, b) => {
      if (sortBy === 'change') return b.change_pct - a.change_pct;
      if (sortBy === 'volume') return b.volume_ratio - a.volume_ratio;
      return b.score - a.score;
    });

    return result;
  }, [assets, query, activeFilters, sortBy]);

  return (
    <div className="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Search Bar */}
      <div className="relative group px-1">
        <div className="absolute inset-0 bg-blue-500/10 blur-xl rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
        <div className="relative flex items-center bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-white/30 focus-within:bg-white/10 transition-all">
          <Search className="w-5 h-5 text-white/30 mr-3" />
          <input 
            type="text"
            placeholder="Search symbols or companies..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="bg-transparent border-none outline-none w-full text-sm font-medium placeholder:text-white/20"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const active = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap text-xs font-bold uppercase tracking-tight transition-all border ${
                active 
                ? 'bg-white text-black border-white shadow-lg shadow-white/10' 
                : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Filter Chips */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'vol', label: '⚡ Alto Volumen', color: 'blue' },
            { id: 'bull', label: '🚀 Alcista', color: 'green' },
            { id: 'buy', label: '🟢 Compra', color: 'emerald' },
            { id: 'sell', label: '🔴 Venta', color: 'red' },
          ].map((chip) => {
            const active = activeFilters.has(chip.id);
            return (
              <button
                key={chip.id}
                onClick={() => toggleFilter(chip.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                  active 
                  ? 'bg-white text-black border-white' 
                  : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Sort Controls */}
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-white/30 px-1">
          <span>Sort by:</span>
          <div className="flex gap-4">
            <button 
              onClick={() => setSortBy('score')}
              className={`hover:text-white transition-colors ${sortBy === 'score' ? 'text-blue-400' : ''}`}
            >
              Score IA
            </button>
            <button 
              onClick={() => setSortBy('change')}
              className={`hover:text-white transition-colors ${sortBy === 'change' ? 'text-blue-400' : ''}`}
            >
              % Cambio
            </button>
            <button 
              onClick={() => setSortBy('volume')}
              className={`hover:text-white transition-colors ${sortBy === 'volume' ? 'text-blue-400' : ''}`}
            >
              Volumen
            </button>
          </div>
        </div>
      </div>

      {/* Asset Grid */}
      <div className="grid grid-cols-1 gap-3">
        {loading ? (
          // Skeleton Loading
          [...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-white/5 rounded-3xl border border-white/5 animate-pulse overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shimmer" />
            </div>
          ))
        ) : filteredAndSortedData.length > 0 ? (
          filteredAndSortedData.map((asset) => (
            <button
              key={asset.symbol}
              onClick={() => setSelectedSymbol(asset.symbol)}
              className="glass group flex flex-col p-4 text-left transition-all hover:bg-white/10 active:scale-[0.98] border border-white/5"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                  <StockIcon symbol={asset.symbol} size="sm" />
                  <div>
                    <div className="flex items-center gap-1.5">
                       <span className="font-bold text-white/90 text-sm tracking-tight">{asset.symbol}</span>
                       <div className="w-1 h-1 bg-white/20 rounded-full" />
                       <span className="text-[10px] font-bold text-white/30 truncate max-w-[120px]">{asset.name}</span>
                    </div>
                    <div className="text-xl font-bold tracking-tighter mt-0.5">
                      ${asset.price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                   <div className="text-2xl font-black text-white/90 leading-none mb-1">
                      {asset.score.toFixed(1)}
                   </div>
                   <div className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                     asset.change_pct >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                   }`}>
                     {asset.change_pct >= 0 ? '+' : ''}{asset.change_pct.toFixed(2)}%
                   </div>
                </div>
              </div>

              {/* Mini Signal Bar */}
              <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((seg) => {
                    const threshold = seg * 2;
                    const isActive = asset.score >= (threshold - 1);
                    let colorClass = "bg-white/10";
                    if (isActive) {
                      if (asset.score >= 7) colorClass = "bg-green-500";
                      else if (asset.score >= 4) colorClass = "bg-gray-400";
                      else colorClass = "bg-red-500";
                    }
                    return (
                      <div 
                        key={seg} 
                        className={`h-1 w-6 rounded-full transition-all duration-500 ${colorClass}`}
                      />
                    );
                  })}
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest text-white/20">
                  {asset.signal}
                </span>
              </div>
            </button>
          ))
        ) : (
          <div className="py-20 text-center space-y-4">
             <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                <Search className="w-8 h-8 text-white/10" />
             </div>
             <p className="text-sm text-white/40 font-medium italic">No assets found for these filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
