'use client';

import { useEffect, useState } from 'react';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

export interface AgentSignal {
  type: string;
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reason: string;
  timestamp: string;
}

export function useAgentSignals() {
  const [lastSignal, setLastSignal] = useState<AgentSignal | null>(null);
  const [livePrices, setLivePrices] = useState<Record<string, {price: number, change_pct: number}>>({});

  useEffect(() => {
    // Dynamic WS URL based on current window location
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const socket = new WebSocket(`ws://${host}:8000/api/v1/ws/signals`);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'SIGNAL') {
          setLastSignal(data);
          // Auto-clear after 10s
          setTimeout(() => setLastSignal(null), 10000);
        } else if (data.type === 'PRICE_UPDATE') {
          setLivePrices(prev => ({
            ...prev,
            [data.symbol]: {
              price: data.price,
              change_pct: data.change_pct
            }
          }));
        }
      } catch (e) {
        console.error("Error parsing signal:", e);
      }
    };

    socket.onerror = (error) => console.error("WS Signal Error:", error);
    
    return () => socket.close();
  }, []);

  return { lastSignal, livePrices };
}

