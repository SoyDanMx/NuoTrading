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
import SignalBar from '../SignalBar';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

type Timeframe = '1D' | '1W' | '1M' | '1Y' | '5Y' | 'ALL';
type Tab = 'Overview' | 'Stock Analysis' | 'Precision' | 'Trading Parameters' | 'Buy Track Record' | 'Scores Evolution';

export default function StockDetailView({ symbol }: { symbol: string }) {
  const { watchlist, addToWatchlist, isBeginnerMode } = useAppStore();
  const [analysis, setAnalysis] = useState<any>(null);
  const [sentiment, setSentiment] = useState<any>(null);
  const [agentStatus, setAgentStatus] = useState<any>(null);
  const [memory, setMemory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<Timeframe>('1Y');
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [chartType, setChartType] = useState<'line' | 'candlestick'>('line');
  const [error, setError] = useState<string | null>(null);
  const [accuracyData, setAccuracyData] = useState<any>(null);
  const [recentPredictions, setRecentPredictions] = useState<any[]>([]);
  const [beginnerExplanation, setBeginnerExplanation] = useState<string>('');

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

        const [analysisRes, sentimentRes, agentRes, memoryRes, accuracyRes, predictionsRes] = await Promise.allSettled([
          fetchWithTimeout(`${API_URL}/api/v1/stocks/analysis/${symbol}`),
          fetchWithTimeout(`${API_URL}/api/v1/stocks/sentiment/${symbol}`),
          fetchWithTimeout(`${API_URL}/api/v1/agents/${symbol}`),
          fetchWithTimeout(`${API_URL}/api/v1/memory/${symbol}`),
          fetchWithTimeout(`${API_URL}/api/v1/accuracy/report?symbol=${symbol}`),
          fetchWithTimeout(`${API_URL}/api/v1/accuracy/predictions/${symbol}`)
        ]);
        
        clearTimeout(timeoutId);

        if (analysisRes.status === 'fulfilled') setAnalysis(analysisRes.value || null);
        if (sentimentRes.status === 'fulfilled') setSentiment(sentimentRes.value || null);
        if (agentRes.status === 'fulfilled') setAgentStatus(agentRes.value || null);
        if (memoryRes.status === 'fulfilled') setMemory(memoryRes.value?.memories || []);
        if (accuracyRes.status === 'fulfilled') setAccuracyData(accuracyRes.value || null);
        if (predictionsRes.status === 'fulfilled') setRecentPredictions(predictionsRes.value?.predictions || []);

        // Fetch beginner explanation if needed
        if (isBeginnerMode) {
          fetch(`${API_URL}/api/v1/stocks/${symbol}/explanation`)
            .then(res => res.json())
            .then(data => setBeginnerExplanation(data.explanation));
        }
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

  // --- Danelfin-style Score Mapping (-1.0 to 1.0) -> (1 to 10) ---
  const mapTo10 = (score: number) => {
    // Map -1.0 to 1, 0.0 to 5.5 (neutral/mid), 1.0 to 10
    // formula: ((score + 1) / 2) * 9 + 1
    return Math.round(((score + 1) / 2) * 9 + 1);
  };

  const getSkillScore = (name: string) => {
    const skill = agentStatus?.analysis?.skills?.find((s: any) => 
      s?.skill_name && (s.skill_name.includes(name) || name.includes(s.skill_name))
    );
    return skill ? mapTo10(skill.score) : 5; // Default 5 (neutral)
  };

  const aiScore = agentStatus?.analysis?.final_score !== undefined 
    ? mapTo10(agentStatus.analysis.final_score) 
    : 5;

  const fundamentalScore = getSkillScore("Earnings");
  const technicalScore = getSkillScore("Técnico");
  const sentimentScore = Math.round((getSkillScore("Sentimiento") + getSkillScore("Opciones") + getSkillScore("Social")) / 3);
  const riskScore = 6; // To be implemented in Fase E

  const getSimplifiedReasoning = () => {
    if (aiScore >= 8) return "Excelente oportunidad. El agente detecta señales fuertes de crecimiento a corto plazo.";
    if (aiScore >= 6) return "Buena opción. Los indicadores son mayormente positivos con riesgo moderado.";
    if (aiScore >= 4) return "Neutral. No hay una dirección clara en este momento. Mejor esperar.";
    return "Precaución. El agente detecta debilidad técnica y sentimientos negativos.";
  };


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
        <div suppressHydrationWarning className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium text-xs">
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
                    <p className={`text-xs font-medium ${positive ? 'text-blue-400' : 'text-red-400'}`}>
                      {positive ? '+' : ''}{(Math.abs(percentChange) || 0).toFixed(2)}%
                    </p>
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
              {(['Overview', 'Stock Analysis', 'Precision', 'Trading Parameters', 'Buy Track Record', 'Scores Evolution'] as Tab[])
                .filter(tab => !isBeginnerMode || ['Overview', 'Stock Analysis'].includes(tab))
                .map((tab) => (
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
                      "{isBeginnerMode ? getSimplifiedReasoning() : (agentStatus?.analysis?.reasoning || analysis?.reasoning || 'El agente está analizando las variables técnicas y fundamentales...')}"
                    </p>
                  </div>

                  {/* Skill Breakdown (Danelfin Style) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {agentStatus?.analysis?.skills?.map((skill: any, i: number) => (
                      <div key={i} className="p-4 bg-white dark:bg-[#111] border border-gray-100 dark:border-white/10 rounded-xl shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="font-bold text-sm text-gray-700 dark:text-white/80">{skill.skill_name}</h4>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            skill.score > 0.2 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            skill.score < -0.2 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-white/40'
                          }`}>
                            {skill.signal}
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 dark:bg-white/5 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${
                              skill.score > 0 ? 'bg-green-500' : skill.score < 0 ? 'bg-red-500' : 'bg-gray-400'
                            }`}
                            style={{ width: `${Math.abs(skill.score) * 100}%`, marginLeft: skill.score < 0 ? '0' : '0' }}
                          />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-2 line-clamp-1">{skill.reasoning}</p>
                      </div>
                    ))}
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

              {activeTab === 'Precision' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Accuracy Overview */}
                    <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-6 border border-gray-100 dark:border-white/10">
                       <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-6">Overall Accuracy</h3>
                       <div className="flex items-center gap-8">
                         <CircularGauge score={(accuracyData?.overall_accuracy || 0.5) * 10} label="Accuracy" size={120} />
                         <div className="space-y-4 flex-1">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500 text-sm">Total Predicciones</span>
                              <span className="font-bold">{accuracyData?.total_predictions || 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500 text-sm">Promedio Movimiento 24h</span>
                              <span className="font-bold text-blue-500">{(accuracyData?.avg_24h_move * 100 || 0).toFixed(2)}%</span>
                            </div>
                            <div className="pt-4 border-t border-gray-200 dark:border-white/10">
                              <p className="text-[10px] text-gray-400 leading-tight">
                                Las predicciones se evalúan comparando el precio de cierre 24 horas después de emitida la señal.
                              </p>
                            </div>
                         </div>
                       </div>
                    </div>

                    {/* Skill Accuracy */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">Accuracy por Skill</h3>
                      {accuracyData?.by_skill && Object.entries(accuracyData.by_skill).map(([name, data]: [string, any], i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white dark:bg-[#111] rounded-xl border border-gray-100 dark:border-white/10">
                           <span className="text-sm font-medium text-gray-600 dark:text-white/70">{name}</span>
                           <div className="flex items-center gap-3">
                              <span className="text-xs font-bold text-blue-500">{Math.round(data.accuracy * 100)}%</span>
                              <div className="w-24 h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500" style={{ width: `${data.accuracy * 100}%` }} />
                              </div>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Prediction History */}
                  <div className="bg-white dark:bg-transparent rounded-2xl">
                     <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Historial de Predicciones</h3>
                     <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-white/10">
                        <table className="w-full text-left text-sm">
                           <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 font-bold">
                              <tr>
                                 <th className="px-4 py-3">Fecha</th>
                                 <th className="px-4 py-3">Señal</th>
                                 <th className="px-4 py-3">Precio Orig.</th>
                                 <th className="px-4 py-3">Cambio 24h</th>
                                 <th className="px-4 py-3">Resultado</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                              {recentPredictions && recentPredictions.length > 0 ? recentPredictions.map((pred, i) => (
                                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                   <td className="px-4 py-3 text-gray-400 font-medium">
                                     {new Date(pred.date).toLocaleDateString()}
                                   </td>
                                   <td className="px-4 py-3">
                                     <span className={`font-bold ${pred.signal.includes('COMPRA') ? 'text-green-500' : pred.signal.includes('VENTA') ? 'text-red-500' : 'text-gray-500'}`}>
                                       {pred.signal}
                                     </span>
                                   </td>
                                   <td className="px-4 py-3 font-mono">${pred.price.toFixed(2)}</td>
                                   <td className="px-4 py-3 font-bold">
                                     {pred.change_pct > 0 ? '+' : ''}{pred.change_pct}%
                                   </td>
                                   <td className="px-4 py-3">
                                     {pred.was_correct ? (
                                       <span className="flex items-center gap-1 text-green-500 font-bold">
                                         <CheckCircle2 className="w-4 h-4" /> Correcto
                                       </span>
                                     ) : (
                                       <span className="flex items-center gap-1 text-red-500 font-bold opacity-60">
                                         ❌ Incorrecto
                                       </span>
                                     )}
                                   </td>
                                </tr>
                              )) : (
                                <tr>
                                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400 italic">
                                    No hay predicciones evaluadas aún. El sistema evalúa señales automáticamente después de 24 horas.
                                  </td>
                                </tr>
                              )}
                           </tbody>
                        </table>
                     </div>
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
          
          {/* Signal Bar (Replacing or Complementing Score Card) */}
          <SignalBar 
            score={aiScore}
            signal={agentStatus?.analysis?.final_signal || (aiScore >= 8 ? 'STRONG_BUY' : aiScore >= 6 ? 'BUY' : aiScore <= 3 ? 'SELL' : 'HOLD')}
            reasoning={isBeginnerMode ? beginnerExplanation : (agentStatus?.analysis?.reasoning || 'Analyzing...')}
            isBeginnerMode={isBeginnerMode}
            onAddWatchlist={() => addToWatchlist(symbol)}
            onSeeAnalysis={() => setActiveTab('Stock Analysis')}
            indicators={{
              rsi: analysis?.indicators?.rsi || 50,
              macd: analysis?.indicators?.macd?.signal || 'Neutral',
              volume: 45, // Demo value, could be fetched from volume skill
              sma50: 'ABOVE',
              sma200: 'ABOVE'
            }}
          />

          {/* AI Score Card (Optional/Expert) */}
          {!isBeginnerMode && (
            <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm flex flex-col items-center">
              {/* ... existing score card ... */}
            
            <div className="w-full flex justify-between items-start mb-6">
              <h3 className="font-bold text-gray-900 dark:text-white">
                {isBeginnerMode ? 'Señal AI' : 'AI Score'} <Info className="inline w-3 h-3 text-gray-400 ml-1 cursor-pointer" />
              </h3>
              {!isBeginnerMode && <a href="#" className="text-xs font-semibold text-blue-500 hover:underline">See AI Analysis</a>}
            </div>

            <div className="flex w-full items-center justify-between mb-8">
              {/* Circular Gauge */}
              <div className="flex-1 flex justify-center">
                <CircularGauge 
                  score={aiScore} 
                  size={130} 
                  strokeWidth={12} 
                  label={isBeginnerMode ? "Señal" : "Score"}
                />
              </div>

              {/* Sub-scores */}
              {!isBeginnerMode && (
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
              )}
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
          )}

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
