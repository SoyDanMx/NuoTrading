'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/app-store';
import { getCompanyName } from '@/lib/constants';
import MiniSparkline from '../MiniSparkline';
import StockIcon from '../StockIcon';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

interface OHLCVPoint {
  time: number;
  close: number;
}

export default function StocksView() {
  const { watchlist, setSelectedSymbol } = useAppStore();
  const [spyQuote, setSpyQuote] = useState<Quote | null>(null);
  const [watchlistQuotes, setWatchlistQuotes] = useState<Record<string, Quote>>({});
  const [sparklines, setSparklines] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);

  const REFRESH_MS = 60000;

  useEffect(() => {
    async function fetchSpy() {
      try {
        const res = await fetch(`${API_URL}/api/v1/stocks/quote/SPY`);
        if (res.ok) {
          const q = await res.json();
          setSpyQuote(q);
        }
      } catch {
        setSpyQuote({
          symbol: 'SPY',
          current_price: 4128.32,
          percent_change: 1.2,
          change: 49,
          high: 4140,
          low: 4080,
          open: 4085,
          previous_close: 4079,
        });
      }
    }
    fetchSpy();
    const t = setInterval(fetchSpy, REFRESH_MS);
    return () => clearInterval(t);
  }, []);

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
              const { data } = await ohlcvRes.json();
              if (Array.isArray(data) && data.length) {
                spark[symbol] = data.map((d: { close: number }) => d.close);
              }
            }
          } catch {
            // keep previous or empty
          }
        })
      );
      setWatchlistQuotes(quotes);
      setSparklines(spark);
      setLoading(false);
    }
    fetchWatchlist();
    const t = setInterval(fetchWatchlist, REFRESH_MS);
    return () => clearInterval(t);
  }, [watchlist]);

  const spyChange = spyQuote?.percent_change ?? 1.2;
  const spyVolume = '2.4M';
  const anySimulated =
    spyQuote?.is_simulated || Object.values(watchlistQuotes).some((q) => q?.is_simulated);

  return (
    <div className="px-4 space-y-4 pb-4">
      {anySimulated && (
        <div className="bg-white border-2 border-black p-3 text-black text-xs font-black uppercase">
          Datos simulados: revisa FINNHUB_API_KEY en .env
        </div>
      )}
      
      {/* S&P 500 card - Brutalist */}
      <div className="bg-black border-2 border-white p-4 text-white">
        <div className="flex justify-between items-start mb-3">
          <span className="brutal-text text-sm">S&P 500</span>
          <span className="text-[10px] font-black uppercase text-white/60">VOL: {spyVolume}</span>
        </div>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="brutal-title text-3xl">
            {spyQuote?.current_price?.toLocaleString('en-US', { minimumFractionDigits: 2 }) ?? '4,128.32'}
          </span>
          <span className={`brutal-text text-base ${spyChange >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
            {spyChange >= 0 ? '▲' : '▼'} {Math.abs(spyChange).toFixed(1)}%
          </span>
        </div>
        <div className="mb-3">
          <button
            type="button"
            className="bg-white text-black text-[10px] font-black uppercase px-4 py-2 border-2 border-white"
          >
            MARKET OPEN
          </button>
        </div>
        {/* Chart with exposed grid */}
        <div className="h-20 bg-white border-2 border-black overflow-hidden relative">
          <svg width="100%" height="100%" className="absolute inset-0">
            {/* Grid lines */}
            {[0, 1, 2, 3, 4].map((i) => (
              <line
                key={`h-${i}`}
                x1="0"
                y1={`${(i * 100) / 4}%`}
                x2="100%"
                y2={`${(i * 100) / 4}%`}
                stroke="#e5e5e5"
                strokeWidth="1"
              />
            ))}
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <line
                key={`v-${i}`}
                x1={`${(i * 100) / 5}%`}
                y1="0"
                x2={`${(i * 100) / 5}%`}
                y2="100%"
                stroke="#e5e5e5"
                strokeWidth="1"
              />
            ))}
          </svg>
          <MiniSparkline
            data={
              spyQuote
                ? Array.from({ length: 20 }, (_, i) => spyQuote.current_price - (20 - i) * (spyChange >= 0 ? -2 : 2))
                : []
            }
            positive={spyChange >= 0}
            width={400}
            height={80}
            className="w-full h-full relative z-10"
          />
        </div>
      </div>

      {/* Watchlist */}
      <div className="flex justify-between items-center border-b-2 border-white pb-2">
        <h2 className="brutal-text text-sm">WATCHLIST</h2>
        <button
          type="button"
          className="text-[10px] font-black uppercase text-white border-2 border-white px-2 py-1 bg-black hover:bg-white hover:text-black"
        >
          EDIT LIST
        </button>
      </div>
      
      <div className="space-y-2">
        {loading && !Object.keys(watchlistQuotes).length
          ? watchlist.slice(0, 3).map((s) => (
              <div key={s} className="bg-white border-2 border-black p-4 text-black animate-pulse">
                <div className="h-4 bg-gray-300 w-1/3 mb-2" />
                <div className="h-6 bg-gray-300 w-1/4" />
              </div>
            ))
          : watchlist.map((symbol) => {
              const q = watchlistQuotes[symbol];
              const price = q?.current_price ?? 0;
              const pct = q?.percent_change ?? 0;
              const positive = pct >= 0;
              const sparkData = sparklines[symbol]?.length
                ? sparklines[symbol]
                : Array.from({ length: 10 }, (_, i) => price - (9 - i) * (pct >= 0 ? -0.5 : 0.5));
              return (
                <button
                  key={symbol}
                  type="button"
                  onClick={() => setSelectedSymbol(symbol)}
                  className="w-full bg-white border-2 border-black p-4 text-left text-black hover:bg-black hover:text-white hover:border-white"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <StockIcon symbol={symbol} size="sm" showTrend={true} trend={positive ? 'up' : 'down'} />
                      <div>
                        <div className="brutal-title text-lg">{symbol}</div>
                        <div className="text-[10px] font-black uppercase text-black/60">
                          {getCompanyName(symbol)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="brutal-text text-lg">{price.toFixed(2)}</div>
                      <div
                        className={`brutal-text text-sm ${positive ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}
                      >
                        {positive ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 h-8 w-24 ml-auto border border-black">
                    <MiniSparkline data={sparkData} positive={positive} width={96} height={32} />
                  </div>
                </button>
              );
            })}
      </div>
    </div>
  );
}
