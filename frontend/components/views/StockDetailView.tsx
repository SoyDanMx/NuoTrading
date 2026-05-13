'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/app-store';
import { getCompanyName } from '@/lib/constants';
import { 
  Plus, Activity, BarChart2, ArrowUpRight, Sparkles, Brain, 
  Newspaper, Play, Square, History, Tag, Database
} from 'lucide-react';
import LineChart from '../LineChart';
import CandlestickChart from '../CandlestickChart';
import TradingViewChart from '../TradingViewChart';
import EnhancedIndicatorBar from '../EnhancedIndicatorBar';
import AdvancedIndicators from '../AdvancedIndicators';
import StockIcon from '../StockIcon';
import Disclaimer from '../Disclaimer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type Timeframe = '1D' | '1W' | '1M' | '1Y';

const TIMEFRAMES: { id: Timeframe; resolution: string; days: number }[] = [
  { id: '1D', resolution: '60', days: 1 },
  { id: '1W', resolution: 'D', days: 7 },
  { id: '1M', resolution: 'D', days: 30 },
  { id: '1Y', resolution: 'W', days: 365 },
];

export default function StockDetailView({ symbol }: { symbol: string }) {
  const { watchlist, addToWatchlist } = useAppStore();
  const [analysis, setAnalysis] = useState<any>(null);
  const [sentiment, setSentiment] = useState<any>(null);
  const [agentStatus, setAgentStatus] = useState<any>(null);
  const [memory, setMemory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');
  const [chartType, setChartType] = useState<'line' | 'candlestick'>('line');

  const inWatchlist = watchlist.includes(symbol);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

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
        else console.warn("Analysis failed:", analysisRes.reason);

        if (sentimentRes.status === 'fulfilled') setSentiment(sentimentRes.value);
        else console.warn("Sentiment failed:", sentimentRes.reason);

        if (agentRes.status === 'fulfilled') setAgentStatus(agentRes.value);
        if (memoryRes.status === 'fulfilled') setMemory(memoryRes.value.memories || []);

        // If at least basic analysis failed, show a warning
        if (analysisRes.status === 'rejected') {
          setError("Technical analysis timed out or failed. Displaying limited data.");
        }

      } catch (e: any) {
        if (e.name === 'AbortError') {
          setError("Server took too long to respond. Please try again.");
        } else {
          setError("Failed to fetch market data.");
        }
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [symbol]);

  const toggleAgent = async () => {
    const method = agentStatus?.is_running ? 'DELETE' : 'POST';
    const endpoint = agentStatus?.is_running ? 'stop' : 'start';
    try {
      const res = await fetch(`${API_URL}/api/v1/agents/${symbol}/${endpoint}`, { method });
      if (res.ok) {
        // Refresh status
        const statusRes = await fetch(`${API_URL}/api/v1/agents/${symbol}`);
        if (statusRes.ok) setAgentStatus(await statusRes.json());
        else if (statusRes.status === 404) setAgentStatus(null);
      }
    } catch (e) {
      console.error("Error toggling agent:", e);
    }
  };

  const quote = analysis?.quote;
  const chartData = analysis?.indicators?.chart_data || [];
  const candlestickData = analysis?.indicators?.candles || [];
  const percentChange = quote?.percent_change ?? 0;
  const positive = percentChange >= 0;
  const chartColor = positive ? '#3B82F6' : '#EF4444';

  if (loading && !quote) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-white/10 border-t-white rounded-full animate-spin" />
        <p className="text-white/40 text-sm font-medium animate-pulse">Analyzing {symbol}...</p>
      </div>
    );
  }

  if (!loading && !quote) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 animate-slide-up">
        <div className="p-6 rounded-full bg-red-500/10 border border-red-500/20">
          <Activity className="w-12 h-12 text-red-400" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-serif font-medium">Símbolo no encontrado</h2>
          <p className="text-sm text-white/40 max-w-xs mx-auto">
            No hemos podido obtener datos para {symbol}. Es posible que el ticker no exista o la API de mercado esté saturada.
          </p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="px-8 py-3 bg-white text-black font-bold rounded-2xl hover:scale-105 transition-all"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const rec = analysis?.recommendation;
  const ind = analysis?.indicators;
  const ai = analysis?.ai_insights;
  const news = analysis?.news || [];

  return (
    <div className="space-y-8 pb-32 animate-slide-up">
      {/* Error Banner */}
      {error && (
        <div className="glass bg-red-500/10 border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-bold uppercase tracking-widest animate-pulse">
          <Activity className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Symbol & Meta */}
      <div className="flex justify-between items-center pt-4">
        <div className="flex items-center gap-4">
          <StockIcon symbol={symbol} size="lg" />
          <div>
            <h2 className="font-serif text-3xl font-medium tracking-tight text-white/90">{getCompanyName(symbol)}</h2>
            <p className="text-xs text-white/40 font-bold tracking-[0.2em] uppercase">{symbol} • NASDAQ</p>
          </div>
        </div>
        <button
          onClick={() => addToWatchlist(symbol)}
          className={`p-3 rounded-2xl border transition-all ${
            inWatchlist 
            ? 'bg-white/5 border-white/10 text-white/30' 
            : 'bg-white border-white text-black shadow-lg shadow-white/10 hover:scale-105'
          }`}
          disabled={inWatchlist}
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* Price Display */}
      <div className="space-y-1">
        <h1 className="text-6xl font-semibold tracking-tighter">
          ${quote?.current_price?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '—'}
        </h1>
        <p className={`text-lg font-medium ${positive ? 'text-blue-400' : 'text-red-400'}`}>
          {quote?.change?.toFixed(2) ?? '—'} ({percentChange.toFixed(2)}%)
        </p>
      </div>

      {/* FASE 2: Active Agent Panel */}
      <div className="space-y-6 animate-slide-up" style={{ animationDelay: '0.05s' }}>
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-green-400" />
            <h3 className="text-xl font-medium font-serif">Agente Autónomo</h3>
          </div>
          <button 
            onClick={toggleAgent}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
              agentStatus?.is_running 
              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' 
              : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
            }`}
          >
            {agentStatus?.is_running ? <><Square className="w-3 h-3 fill-current" /> Stop Agent</> : <><Play className="w-3 h-3 fill-current" /> Start Agent</>}
          </button>
        </div>

        <div className="glass p-6 grid grid-cols-2 md:grid-cols-4 gap-6 relative overflow-hidden">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Status</p>
            <p className={`text-lg font-bold ${agentStatus?.is_running ? 'text-green-400' : 'text-white/40'}`}>
              {agentStatus?.status || 'OFFLINE'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Last Signal</p>
            <p className="text-lg font-bold text-white/90">{agentStatus?.last_decision || 'None'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Confidence</p>
            <p className="text-lg font-bold text-white/90">{agentStatus?.confidence || 0}%</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Loop</p>
            <p className="text-lg font-bold text-white/90">60s</p>
          </div>
        </div>
      </div>

      {/* FASE 4: Agent Observability (Thought Process) */}
      {agentStatus?.is_running && agentStatus?.last_decision && (
        <div className="space-y-6 animate-slide-up" style={{ animationDelay: '0.08s' }}>
          <div className="flex items-center gap-2 border-b border-white/5 pb-4">
            <Activity className="w-5 h-5 text-blue-400" />
            <h3 className="text-xl font-medium font-serif">Pensamiento del Agente</h3>
          </div>
          
          <div className="glass p-8 bg-blue-500/5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Sparkles className="w-24 h-24" />
            </div>
            
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-widest">
                  Live Reasoning
                </div>
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              </div>
              
              <div className="space-y-4">
                <p className="text-xl font-medium text-white/90 leading-relaxed font-serif italic">
                  "{analysis?.reasoning || 'El agente está analizando las variables técnicas y fundamentales...'}"
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/5">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Sentiment Factor</p>
                    <p className="text-sm text-white/70">{sentiment?.signal || 'Neutral'} ({sentiment?.sentiment_score?.toFixed(2) || '0.00'})</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Technical Bias</p>
                    <p className="text-sm text-white/70">RSI: {analysis?.indicators?.rsi || 'N/A'} • MACD: {analysis?.indicators?.macd?.histogram || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chart Section */}
      <div className="relative h-[300px] w-full group">
        {chartType === 'line' && chartData.length ? (
          <LineChart data={chartData} color={chartColor} height={300} />
        ) : chartType === 'candlestick' && candlestickData.length ? (
          <CandlestickChart data={candlestickData} height={300} />
        ) : (
          <div className="h-full w-full glass flex items-center justify-center">
            <p className="text-white/20 text-sm">Loading market data...</p>
          </div>
        )}
        <div className="absolute top-4 right-0 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setChartType('line')} className={`p-2 rounded-lg ${chartType === 'line' ? 'bg-white/10 text-white' : 'text-white/40'}`}>
            <Activity className="w-4 h-4" />
          </button>
          <button onClick={() => setChartType('candlestick')} className={`p-2 rounded-lg ${chartType === 'candlestick' ? 'bg-white/10 text-white' : 'text-white/40'}`}>
            <BarChart2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* FASE 3: Market Memory Panel (Obsidian++) */}
      <div className="space-y-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center gap-2 border-b border-white/5 pb-4">
          <History className="w-5 h-5 text-amber-400" />
          <h3 className="text-xl font-medium font-serif">Memoria del Ticker (Obsidian)</h3>
        </div>
        
        {memory.length > 0 ? (
          <div className="space-y-3">
            {memory.map((entry, i) => (
              <div key={i} className="glass p-5 space-y-3 group hover:bg-white/5 transition-all">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      entry.recommendation === 'BUY' ? 'bg-blue-400' : 
                      entry.recommendation === 'SELL' ? 'bg-red-400' : 'bg-white/20'
                    }`} />
                    <span className="text-xs font-bold text-white/40 uppercase tracking-widest">{entry.date}</span>
                  </div>
                  <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{entry.confidence}% Conf.</span>
                </div>
                <p className="text-sm text-white/70 leading-relaxed italic line-clamp-2">"{entry.reasoning}"</p>
                <div className="flex gap-2">
                  <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest bg-white/5 px-2 py-1 rounded text-white/30"><Tag className="w-2 h-2" /> #pattern-match</span>
                  <span className="flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest bg-white/5 px-2 py-1 rounded text-white/30"><Tag className="w-2 h-2" /> #historical</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass p-12 text-center space-y-2 opacity-30">
            <Brain className="w-12 h-12 mx-auto mb-2" />
            <p className="text-xs font-bold uppercase tracking-widest">No historical memory found</p>
            <p className="text-[10px]">Start an agent to begin generating technical memories.</p>
          </div>
        )}
      </div>

      {/* AI Insights & Sentiment Sections (Existing) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {ai && (
          <div className="glass p-6 space-y-4">
            <div className="flex justify-between items-center">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Veredicto Global</span>
            </div>
            <h4 className={`text-4xl font-bold ${ai.recommendation === 'BUY' ? 'text-blue-400' : ai.recommendation === 'SELL' ? 'text-red-400' : 'text-white/60'}`}>
              {ai.recommendation}
            </h4>
            <p className="text-sm text-white/60 leading-relaxed">"{ai.reasoning}"</p>
          </div>
        )}
        {sentiment && (
          <div className="glass p-6 space-y-4">
             <div className="flex justify-between items-center">
              <Brain className="w-5 h-5 text-purple-400" />
              <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Sentimiento Social</span>
            </div>
            <h4 className={`text-4xl font-bold ${sentiment.signal === 'BULLISH' ? 'text-blue-400' : sentiment.signal === 'BEARISH' ? 'text-red-400' : 'text-white/60'}`}>
              {sentiment.signal}
            </h4>
            <p className="text-sm text-white/60 leading-relaxed">Score: {sentiment.sentiment_score.toFixed(2)} basado en {sentiment.news_analyzed} noticias.</p>
          </div>
        )}
      </div>

      <Disclaimer />
    </div>
  );
}
