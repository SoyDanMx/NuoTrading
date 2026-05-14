'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import StockIcon from '../StockIcon';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const SECTORS = {
  'POPULAR': ['AAPL', 'TSLA', 'NVDA', 'GOOGL', 'META', 'MSFT', 'AMZN', 'NFLX'],
  'TECH': ['NVDA', 'AMD', 'ARM', 'ASML', 'AVGO', 'SMCI', 'TSM'],
  'ENERGY': ['XOM', 'CVX', 'SHEL', 'BP', 'TTE', 'SLB', 'COP'],
  'FINANCE': ['JPM', 'GS', 'MS', 'BAC', 'WFC', 'V', 'MA'],
  'CRYPTO': ['BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD', 'XRP-USD', 'ADA-USD']
};

type SectorKey = keyof typeof SECTORS;

export default function FindView() {
  const { setSelectedSymbol, addToWatchlist } = useAppStore();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    symbol: string;
    current_price: number;
    percent_change: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSector, setActiveSector] = useState<SectorKey>('POPULAR');

  const handleSearchWithSym = async (sym: string) => {
    if (!sym) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/stocks/quote/${sym}`);
      if (!res.ok) throw new Error('Ticker no encontrado');
      const data = await res.json();
      setResult({
        symbol: data.symbol,
        current_price: data.current_price,
        percent_change: data.percent_change ?? 0,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al buscar');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => handleSearchWithSym(query.trim().toUpperCase());

  return (
    <div className="px-4 space-y-6 pb-4">
      <h2 className="brutal-text text-sm text-white">BUSCAR ACCIÓN</h2>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="SÍMBOLO (EJ. AAPL)"
            className="w-full bg-white border-2 border-black px-4 py-3 text-black placeholder-black/40 font-black uppercase text-sm focus:outline-none focus:border-white"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black" strokeWidth={3} />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          disabled={loading}
          className="bg-black text-white text-xs font-black uppercase px-4 py-3 border-2 border-white hover:bg-white hover:text-black disabled:opacity-50"
        >
          {loading ? '...' : 'BUSCAR'}
        </button>
      </div>
      {error && (
        <div className="bg-white border-2 border-black p-3 text-black text-sm font-black uppercase">
          {error}
        </div>
      )}
      {result && (
        <div className="bg-white border-2 border-black p-4 text-black">
          <div className="flex justify-between items-center mb-3 border-b-2 border-black pb-2">
            <div className="flex items-center gap-2">
              <StockIcon symbol={result.symbol} size="md" showTrend={true} trend={result.percent_change >= 0 ? 'up' : 'down'} />
              <span className="brutal-title text-xl">{result.symbol}</span>
            </div>
            <span
              className={`brutal-text text-base ${
                result.percent_change >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'
              }`}
            >
              {result.percent_change >= 0 ? '▲' : '▼'} {Math.abs(result.percent_change).toFixed(2)}%
            </span>
          </div>
          <div className="brutal-title text-3xl mb-4">
            {result.current_price.toFixed(2)} USD
          </div>
          <div className="flex gap-2 border-t-2 border-black pt-3">
            <button
              type="button"
              onClick={() => setSelectedSymbol(result.symbol)}
              className="flex-1 bg-black text-white text-[10px] font-black uppercase py-3 border-2 border-black hover:bg-white hover:text-black"
            >
              VER DETALLE
            </button>
            <button
              type="button"
              onClick={() => {
                addToWatchlist(result.symbol);
                setResult(null);
                setQuery('');
              }}
              className="flex-1 bg-white text-black text-[10px] font-black uppercase py-3 border-2 border-black hover:bg-black hover:text-white"
            >
              + AÑADIR A LISTA
            </button>
          </div>
        </div>
      )}
      <div>
        <div className="flex items-center justify-between mb-4 border-b-2 border-white pb-2">
          <h3 className="text-[10px] font-black uppercase text-white tracking-widest">
            CATEGORÍAS
          </h3>
        </div>
        
        {/* Sector Pills */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
          {Object.keys(SECTORS).map((s) => (
            <button
              key={s}
              onClick={() => setActiveSector(s as SectorKey)}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-tighter border-2 transition-all ${
                activeSector === s 
                ? 'bg-white text-black border-white shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]' 
                : 'bg-transparent text-white border-white/20 hover:border-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white/5 p-4 border-2 border-dashed border-white/10">
          {SECTORS[activeSector].map((sym) => (
            <button
              key={sym}
              type="button"
              onClick={() => {
                setQuery(sym);
                setResult(null);
                handleSearchWithSym(sym);
              }}
              className="group bg-white text-black text-xs font-black uppercase p-3 border-2 border-black hover:bg-black hover:text-white transition-all flex flex-col items-center gap-2"
            >
              <StockIcon symbol={sym} size="sm" />
              <span>{sym}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
