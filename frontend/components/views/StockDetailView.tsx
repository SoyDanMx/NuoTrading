'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/app-store';
import { getCompanyName } from '@/lib/constants';
import { 
  Plus, Activity, ArrowUpRight, ArrowDownRight, Info, CheckCircle2, History, Sparkles, Brain
} from 'lucide-react';
import LineChart from '../LineChart';
import CandlestickChart from '../CandlestickChart';
import StockIcon from '../StockIcon';
import Disclaimer from '../Disclaimer';
import CircularGauge from '../CircularGauge';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type Timeframe = '1D' | '1W' | '1M' | '1Y' | '5Y' | 'ALL';
type Tab = 'Overview' | 'Stock Analysis' | 'Trading Parameters' | 'Buy Track Record' | 'Scores Evolution';

export default function StockDetailView({ symbol }: { symbol: string }) {
  const { watchlist, addToWatchlist } = useAppStore();
  const [analysis, setAnalysis] = useState<any>(null);
  const [sentiment, setSentiment] = useState<any>(null);
  const [agentStatus, setAgentStatus] = useState<any>(null);
  const [memory, setMemory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<Timeframe>('1Y');
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [chartType, setChartType] = useState<'line' | 'candlestick'>('line');
  const [error, setError] = useState<string | null>(null);

  const inWatchlist = watchlist.includes(symbol);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const fetchWithTimeout = (url: string) => 
          fetch(url, { signal: controller.signal }).then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          });

        const [analysisRes, sentimentRes, agentRes, memoryRes] = await Promise.allSettled([
          fetchWithTimeout(`${API_URL}/api/v1/stocks/analysis/${symbol}`),
          fetchWithTimeout(`${API_URL}/api/v1/stocks/sentiment/${symbol}`),
          fetchWithTimeout(`${API_URL}/api/v1/agents/${symbol}`),
          fetchWithTimeout(`${API_URL}/api/v1/memory/${symbol}`)
        ]);
        
        clearTimeout(timeoutId);

        if (analysisRes.status === 'fulfilled') setAnalysis(analysisRes.value);
        if (sentimentRes.status === 'fulfilled') setSentiment(sentimentRes.value);
        if (agentRes.status === 'fulfilled') setAgentStatus(agentRes.value);
        if (memoryRes.status === 'fulfilled') setMemory(memoryRes.value.memories || []);
      } catch (e: any) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [symbol]);

  const quote = analysis?.quote;
  const chartData = analysis?.indicators?.chart_data || [];
  const candlestickData = analysis?.indicators?.candles || [];
  const currentPrice = quote?.current_price ?? 0;
  const percentChange = quote?.percent_change ?? 0;
  const priceChange = quote?.change ?? 0;
  const positive = percentChange >= 0;

  // Derive Scores (1-10)
  const aiScore = agentStatus?.confidence ? Math.round(agentStatus.confidence / 10) : 7;
  const fundamentalScore = 7; // Placeholder
  const technicalScore = analysis?.indicators?.rsi ? (analysis.indicators.rsi > 50 ? 8 : 4) : 6;
  const sentimentScore = sentiment?.sentiment_score ? Math.round(sentiment.sentiment_score * 10) : 7;
  const riskScore = 6; // Placeholder

  if (loading && !quote) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-gray-500 dark:text-white/40 text-sm font-medium animate-pulse">Analizando {symbol}...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-32 animate-fade-in text-gray-900 dark:text-white">
      
      {/* Top Breadcrumb / Market Info */}
      <div className="flex items-center justify-between text-sm py-2 border-b border-gray-200 dark:border-white/10">
        <div className="flex gap-2">
          <button className="px-3 py-1 font-semibold text-blue-600 bg-blue-50 dark:bg-blue-500/10 rounded-md flex items-center gap-2">
            🇺🇸 USA <Info className="w-3 h-3" />
          </button>
          <button className="px-3 py-1 text-gray-500 dark:text-white/40 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md flex items-center gap-2 transition-colors">
            🇪🇺 Europe <Info className="w-3 h-3" />
          </button>
        </div>
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium text-xs">
          <CheckCircle2 className="w-4 h-4" />
          Last update: {new Date().toLocaleDateString()}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Main Detail */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Header */}
          <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <StockIcon symbol={symbol} size="md" />
                  <h1 className="text-3xl font-bold flex items-center gap-2">
                    {symbol} Stock AI Analysis
                  </h1>
                </div>
                <h2 className="text-xl text-gray-600 dark:text-white/60 mb-4">{getCompanyName(symbol)}</h2>
                
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="text-5xl font-bold">${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className={`text-lg font-semibold flex items-center ${positive ? 'text-green-500' : 'text-red-500'}`}>
                    {positive ? '+' : ''}{priceChange.toFixed(2)} ({positive ? '+' : ''}{percentChange.toFixed(2)}%)
                  </span>
                  <span className="text-sm text-gray-400 font-medium ml-2">NASDAQ</span>
                </div>

                <div className="mt-6 space-y-1 text-sm">
                  <p className="text-gray-500 dark:text-white/50">#12 of 657 in <span className="text-blue-500 cursor-pointer hover:underline">Information Technology</span></p>
                  <p className="text-gray-500 dark:text-white/50">#2 of 36 in <span className="text-blue-500 cursor-pointer hover:underline">Technology Hardware</span></p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mt-8 border-b border-gray-100 dark:border-white/10 pb-4">
              {(['Overview', 'Stock Analysis', 'Trading Parameters', 'Buy Track Record', 'Scores Evolution'] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                    activeTab === tab
                      ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-transparent dark:text-white/60 dark:border-white/10 dark:hover:bg-white/5'
                  }`}
                >
                  {tab === 'Buy Track Record' && <span className="mr-2 text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded uppercase tracking-wider">NEW</span>}
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content Area */}
            <div className="pt-6">
              {activeTab === 'Overview' && (
                <div className="space-y-4">
                  {/* Timeframe selector */}
                  <div className="flex justify-between items-center">
                    <div className="flex gap-1 bg-gray-100 dark:bg-white/5 p-1 rounded-lg">
                      {(['1M', '3M', '6M', '1Y', '5Y', 'ALL'] as Timeframe[]).map((tf) => (
                        <button
                          key={tf}
                          onClick={() => setTimeframe(tf)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                            timeframe === tf
                              ? 'bg-white text-blue-600 shadow-sm dark:bg-blue-500/20 dark:text-blue-400'
                              : 'text-gray-500 hover:text-gray-900 dark:text-white/50 dark:hover:text-white'
                          }`}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="h-[350px] w-full mt-4">
                    {chartData.length > 0 ? (
                      <LineChart data={chartData} color={positive ? '#22c55e' : '#ef4444'} height={350} />
                    ) : (
                      <div className="h-full flex items-center justify-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl">
                        <p className="text-gray-400 text-sm">Chart data unavailable</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'Stock Analysis' && (
                <div className="space-y-6">
                  {/* Reuse the existing Agent Thought Process UI here */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-500/20">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-blue-500" />
                      <h3 className="font-bold text-lg">AI Reasoning</h3>
                    </div>
                    <p className="text-gray-700 dark:text-white/80 leading-relaxed italic">
                      "{analysis?.reasoning || 'El agente está analizando las variables técnicas y fundamentales...'}"
                    </p>
                  </div>

                  {/* Market Memory */}
                  <div>
                     <div className="flex items-center gap-2 mb-4">
                        <History className="w-5 h-5 text-amber-500" />
                        <h3 className="font-bold text-lg">Market Memory (Obsidian)</h3>
                      </div>
                      {memory.length > 0 ? (
                        <div className="space-y-3">
                          {memory.map((entry, i) => (
                            <div key={i} className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl border border-gray-100 dark:border-white/10">
                              <div className="flex justify-between text-xs font-bold text-gray-400 uppercase mb-2">
                                <span>{entry.date}</span>
                                <span>{entry.confidence}% Conf.</span>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-white/70 italic line-clamp-2">"{entry.reasoning}"</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">No historical memory found.</p>
                      )}
                  </div>
                </div>
              )}

              {['Trading Parameters', 'Buy Track Record', 'Scores Evolution'].includes(activeTab) && (
                <div className="h-64 flex items-center justify-center border border-dashed border-gray-200 dark:border-white/10 rounded-xl">
                  <p className="text-gray-400 text-sm">Contenido de {activeTab} en desarrollo...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AI Score & Metrics */}
        <div className="space-y-6">
          
          {/* AI Score Card */}
          <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm flex flex-col items-center">
            
            <div className="w-full flex justify-between items-start mb-6">
              <h3 className="font-bold text-gray-900 dark:text-white">AI Score <Info className="inline w-3 h-3 text-gray-400 ml-1 cursor-pointer" /></h3>
              <a href="#" className="text-xs font-semibold text-blue-500 hover:underline">See AI Analysis</a>
            </div>

            <div className="flex w-full items-center justify-between mb-8">
              {/* Circular Gauge */}
              <div className="flex-1 flex justify-center">
                <CircularGauge score={aiScore} size={130} strokeWidth={12} />
              </div>

              {/* Sub-scores */}
              <div className="flex-1 flex flex-col gap-4 pl-4 border-l border-gray-100 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full border-2 border-green-500 flex items-center justify-center text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10">
                    {fundamentalScore}
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-white/70">Fundamental</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full border-2 border-green-500 flex items-center justify-center text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10">
                    {technicalScore}
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-white/70">Technical</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full border-2 border-green-500 flex items-center justify-center text-xs font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10">
                    {sentimentScore}
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-white/70">Sentiment</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full border-2 border-yellow-500 flex items-center justify-center text-xs font-bold text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-500/10">
                    {riskScore}
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-white/70">Low Risk</span>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <button 
              onClick={() => addToWatchlist(symbol)}
              disabled={inWatchlist}
              className={`w-full py-4 rounded-xl font-bold flex flex-col items-center justify-center transition-all ${
                inWatchlist 
                ? 'bg-gray-100 text-gray-400 dark:bg-white/5 dark:text-white/30 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20'
              }`}
            >
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                <span className="text-lg">{inWatchlist ? 'In Portfolio' : 'Add to portfolio'}</span>
              </div>
              {!inWatchlist && <span className="text-xs font-normal opacity-80 mt-1">To track daily AI Score</span>}
            </button>
          </div>

          {/* Metrics Table */}
          <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100 dark:border-white/10">
              <span className="text-sm font-bold text-gray-500 dark:text-white/50">{symbol} / US0378331005</span>
              <span className="text-lg">🇺🇸</span>
            </div>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-white/60 font-medium">Market Cap</span>
                <span className="font-bold text-gray-900 dark:text-white">--</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-white/60 font-medium">Short Float</span>
                <span className="font-bold text-gray-900 dark:text-white">--</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-white/60 font-medium">Volume</span>
                <span className="font-bold text-gray-900 dark:text-white">--</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-white/60 font-medium">Dividend %</span>
                <span className="font-bold text-gray-900 dark:text-white">--</span>
              </div>
            </div>

            <h4 className="font-bold text-gray-900 dark:text-white mb-4">Performance</h4>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-white/60 font-medium">Perf Week</span>
                <span className="font-bold text-green-500">+2.5%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-white/60 font-medium">Perf Quarter</span>
                <span className="font-bold text-green-500">+8.1%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-white/60 font-medium">Perf Year</span>
                <span className="font-bold text-green-500">+42.3%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-white/60 font-medium">Perf YTD</span>
                <span className="font-bold text-green-500">+12.4%</span>
              </div>
            </div>

            <button className="w-full py-3 bg-gray-50 hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10 text-gray-900 dark:text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm border border-gray-200 dark:border-white/10">
              <Activity className="w-4 h-4" /> Compare {symbol}
            </button>
          </div>

        </div>

      </div>

      <Disclaimer />
    </div>
  );
}
