'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/app-store';
import { getCompanyName } from '@/lib/constants';
import StockIcon from '../StockIcon';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Quote {
  symbol: string;
  current_price: number;
  percent_change: number;
  is_simulated?: boolean;
}

export default function WatchlistView() {
  const { watchlist, setSelectedSymbol } = useAppStore();
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(true);

  const REFRESH_MS = 60000;

  useEffect(() => {
    async function fetchQuotes() {
      setLoading(true);
      const result: Record<string, Quote> = {};
      await Promise.all(
        watchlist.map(async (sym) => {
          try {
            const res = await fetch(`${API_URL}/api/v1/stocks/quote/${sym}`);
            if (res.ok) {
              const q = await res.json();
              result[sym] = q;
            }
          } catch {
            // skip
          }
        })
      );
      setQuotes(result);
      setLoading(false);
    }
    fetchQuotes();
    const t = setInterval(fetchQuotes, REFRESH_MS);
    return () => clearInterval(t);
  }, [watchlist]);

  const list = watchlist.map((symbol) => ({
    symbol,
    quote: quotes[symbol],
    price: quotes[symbol]?.current_price ?? 0,
    pct: quotes[symbol]?.percent_change ?? 0,
  }));

  const gainers = list.filter((x) => x.pct > 0).length;
  const losers = list.filter((x) => x.pct < 0).length;
  const neutral = list.filter((x) => x.pct === 0).length;

  const leftCol = list.filter((_, i) => i % 2 === 0);
  const rightCol = list.filter((_, i) => i % 2 === 1);
  const anySimulated = Object.values(quotes).some((q) => q?.is_simulated);

  return (
    <div className="px-4 space-y-4 pb-4">
      {anySimulated && (
        <div className="bg-white border-2 border-black p-3 text-black text-xs font-black uppercase">
          Datos simulados. Revisa FINNHUB_API_KEY en .env.
        </div>
      )}
      <div className="flex justify-between items-center border-b-2 border-white pb-2">
        <h2 className="brutal-text text-sm text-white">WATCHLIST</h2>
        <button
          type="button"
          className="bg-white text-black text-[10px] font-black uppercase px-3 py-2 border-2 border-white hover:bg-black hover:text-white"
        >
          + ADD
        </button>
      </div>
      <p className="text-[10px] font-black uppercase text-white/60">
        {watchlist.length} ASSETS TRACKED
      </p>

      {/* Grid - Brutalist */}
      <div className="grid grid-cols-2 gap-2 border-2 border-white p-2">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white border-2 border-black p-3 h-20 animate-pulse" />
            ))
          : [
              ...leftCol.map((item) => (
                <button
                  key={item.symbol}
                  type="button"
                  onClick={() => setSelectedSymbol(item.symbol)}
                  className="bg-white border-2 border-black p-3 text-black text-left hover:bg-black hover:text-white hover:border-white"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <StockIcon symbol={item.symbol} size="sm" showTrend={true} trend={item.pct >= 0 ? 'up' : 'down'} />
                    <div className="brutal-title text-sm">{item.symbol}</div>
                  </div>
                  <div className="brutal-text text-lg mt-1">{item.price.toFixed(2)}</div>
                  <div
                    className={`brutal-text text-xs mt-0.5 ${
                      item.pct >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'
                    }`}
                  >
                    {item.pct >= 0 ? '▲' : '▼'} {Math.abs(item.pct).toFixed(2)}%
                  </div>
                </button>
              )),
              ...rightCol.map((item) => (
                <button
                  key={item.symbol}
                  type="button"
                  onClick={() => setSelectedSymbol(item.symbol)}
                  className="bg-white border-2 border-black p-3 text-black text-left hover:bg-black hover:text-white hover:border-white"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <StockIcon symbol={item.symbol} size="sm" showTrend={true} trend={item.pct >= 0 ? 'up' : 'down'} />
                    <div className="brutal-title text-sm">{item.symbol}</div>
                  </div>
                  <div className="brutal-text text-lg mt-1">{item.price.toFixed(2)}</div>
                  <div
                    className={`brutal-text text-xs mt-0.5 ${
                      item.pct >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'
                    }`}
                  >
                    {item.pct >= 0 ? '▲' : '▼'} {Math.abs(item.pct).toFixed(2)}%
                  </div>
                </button>
              )),
            ]}
      </div>

      {/* Market status */}
      <div className="flex justify-between items-center text-[10px] font-black uppercase text-white border-t-2 border-white pt-2">
        <span>MARKET STATUS OPEN</span>
        <span>NEXT CLOSE 04:00:00 PM EST</span>
      </div>

      {/* Summary cards - Brutalist */}
      <div className="grid grid-cols-3 gap-2 border-2 border-white p-2">
        <div className="bg-white border-2 border-black p-3 text-center">
          <div className="text-[10px] font-black uppercase text-black/60">GAINERS</div>
          <div className="brutal-title text-2xl text-[#22c55e]">{gainers}</div>
        </div>
        <div className="bg-white border-2 border-black p-3 text-center">
          <div className="text-[10px] font-black uppercase text-black/60">LOSERS</div>
          <div className="brutal-title text-2xl text-[#ef4444]">{losers}</div>
        </div>
        <div className="bg-white border-2 border-black p-3 text-center">
          <div className="text-[10px] font-black uppercase text-black/60">NEUTRAL</div>
          <div className="brutal-title text-2xl text-black">{neutral}</div>
        </div>
      </div>
    </div>
  );
}
