'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/app-store';
import { getCompanyName } from '@/lib/constants';
import StockIcon from '../StockIcon';
import MiniSparkline from '../MiniSparkline';
import { Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, PieChart as PieChartIcon } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://nuo-backend.onrender.com';

interface Quote {
  symbol: string;
  current_price: number;
  percent_change: number;
}

export default function PortfolioView() {
  const { holdings, setSelectedSymbol } = useAppStore();
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPortfolioData() {
      setLoading(true);
      const result: Record<string, Quote> = {};
      const symbols = Object.keys(holdings);
      await Promise.all(
        symbols.map(async (sym) => {
          try {
            const res = await fetch(`${API_URL}/api/v1/stocks/quote/${sym}`);
            if (res.ok) {
              const q = await res.json();
              result[sym] = q;
            }
          } catch (e) {
            console.error(e);
          }
        })
      );
      setQuotes(result);
      setLoading(false);
    }
    fetchPortfolioData();
  }, [holdings]);

  const totalBalance = Object.entries(holdings).reduce((acc, [sym, qty]) => {
    const price = quotes[sym]?.current_price ?? 0;
    return acc + price * qty;
  }, 0);

  const dailyChange = Object.entries(holdings).reduce((acc, [sym, qty]) => {
    const price = quotes[sym]?.current_price ?? 0;
    const pct = quotes[sym]?.percent_change ?? 0;
    const prevPrice = price / (1 + pct / 100);
    return acc + (price - prevPrice) * qty;
  }, 0);

  const dailyPct = totalBalance > 0 ? (dailyChange / (totalBalance - dailyChange)) * 100 : 0;

  return (
    <div className="space-y-8 pb-12 animate-slide-up">
      {/* Portfolio Summary Card */}
      <div className="glass p-8 space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full -mr-20 -mt-20" />
        
        <div className="flex justify-between items-start relative z-10">
          <div className="space-y-1">
            <p className="text-white/40 text-xs font-bold tracking-widest uppercase">Total Balance</p>
            <h2 className="text-5xl font-semibold tracking-tighter">
              ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
          </div>
          <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
            <Wallet className="w-6 h-6 text-white/60" />
          </div>
        </div>

        <div className="flex gap-4 relative z-10">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${dailyChange >= 0 ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
            {dailyChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            <span className="text-sm font-bold">
              {dailyChange >= 0 ? '+' : ''}{dailyChange.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({dailyPct.toFixed(2)}%)
            </span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/40">
            <span className="text-xs font-bold uppercase tracking-widest">Today</span>
          </div>
        </div>
      </div>

      {/* Assets List */}
      <div className="space-y-6">
        <div className="flex justify-between items-end">
          <h3 className="text-xl font-medium text-white/90">Your Assets</h3>
          <button className="text-sm text-white/40 hover:text-white transition-colors flex items-center gap-2">
            <PieChartIcon className="w-4 h-4" /> Allocation
          </button>
        </div>

        <div className="space-y-3">
          {Object.entries(holdings).map(([symbol, qty]) => {
            const q = quotes[symbol];
            const price = q?.current_price ?? 0;
            const value = price * qty;
            const pct = q?.percent_change ?? 0;
            const positive = pct >= 0;

            return (
              <button
                key={symbol}
                onClick={() => setSelectedSymbol(symbol)}
                className="glass w-full group flex items-center justify-between p-4 hover:bg-white/10 transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <StockIcon symbol={symbol} size="md" />
                  <div className="text-left">
                    <h4 className="font-medium text-white/90">{getCompanyName(symbol)}</h4>
                    <p className="text-[10px] text-white/40 font-bold tracking-widest uppercase">
                      {qty} Shares • {symbol}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-semibold text-white/90">
                    ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className={`text-xs font-medium ${positive ? 'text-blue-400' : 'text-red-400'}`}>
                    {positive ? '+' : ''}{pct.toFixed(2)}%
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Market Insights / News placeholder */}
      <div className="glass p-6 border-dashed border-white/10 flex flex-col items-center justify-center text-center space-y-2">
        <TrendingUp className="w-8 h-8 text-white/10 mb-2" />
        <h4 className="text-sm font-medium text-white/60">Insights Coming Soon</h4>
        <p className="text-xs text-white/30 max-w-[200px]">We're building AI-powered analysis for your specific portfolio.</p>
      </div>
    </div>
  );
}
