'use client';

import { useEffect, useState } from 'react';
import { Briefcase, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Position {
    symbol: string;
    amount: number;
    entry: number;
    current: number;
    pnl: number;
}

interface Portfolio {
    balance: number;
    pnl_daily: number;
    pnl_percent: number;
    positions: Position[];
}

export default function PortfolioSummary() {
    const [portfolio, setPortfolio] = useState<Portfolio | null>(null);

    useEffect(() => {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        fetch(`${API_URL}/api/v1/portfolio`)
            .then(res => res.json())
            .then(data => setPortfolio(data))
            .catch(err => console.error('Error fetching portfolio:', err));
    }, []);

    if (!portfolio) return null;

    return (
        <div className="bg-zinc-900/30 rounded-xl p-3 border border-zinc-800/40 mt-4">
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                    <Briefcase className="w-3.5 h-3.5 text-gray-500" />
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Portfolio</h3>
                </div>
                <div className="text-right">
                    <span className="text-[10px] font-mono text-white font-bold">
                        ${portfolio.balance.toLocaleString()}
                    </span>
                    <span className={`ml-2 text-[9px] font-bold ${portfolio.pnl_daily >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {portfolio.pnl_daily >= 0 ? '+' : ''}{portfolio.pnl_percent}%
                    </span>
                </div>
            </div>

            <div className="space-y-1.5">
                {portfolio.positions.map((pos) => (
                    <div key={pos.symbol} className="flex justify-between items-center bg-black/40 p-2 rounded border border-gray-800/30">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-white w-10">{pos.symbol}</span>
                            <div className="flex flex-col">
                                <span className="text-[8px] text-gray-500 font-bold uppercase">Qty: {pos.amount}</span>
                                <span className="text-[8px] text-gray-500 font-bold uppercase">Avg: ${pos.entry}</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center justify-end gap-1">
                                {pos.pnl >= 0 ? <ArrowUpRight className="w-2.5 h-2.5 text-green-500" /> : <ArrowDownRight className="w-2.5 h-2.5 text-red-500" />}
                                <span className={`text-[10px] font-mono font-bold ${pos.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    ${pos.pnl.toFixed(2)}
                                </span>
                            </div>
                            <span className="text-[8px] text-gray-600 font-mono">${pos.current.toFixed(2)}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
