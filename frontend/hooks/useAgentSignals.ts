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
    if (typeof window === 'undefined') return;

    // Use environment variable if present, otherwise fallback to current host
    // Replace http/https with ws/wss accordingly
    let wsUrl = WS_URL;
    if (!process.env.NEXT_PUBLIC_WS_URL) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      // In production (Vercel), we expect the backend to be elsewhere, 
      // but if not set, we try the same host (though it likely fails if it's Vercel)
      wsUrl = `${protocol}//${host}${window.location.port ? `:${window.location.port}` : ''}/api/v1/ws/signals`;
    } else {
      // Ensure the protocol matches if we are on HTTPS
      if (window.location.protocol === 'https:' && wsUrl.startsWith('ws:')) {
        wsUrl = wsUrl.replace('ws:', 'wss:');
      }
    }

    const socket = new WebSocket(wsUrl);

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

