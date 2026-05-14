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

    // Use environment variable if present, otherwise fallback to API_URL or current host
    let wsUrl = process.env.NEXT_PUBLIC_WS_URL || '';
    
    if (!wsUrl) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      if (apiUrl.startsWith('http')) {
        wsUrl = apiUrl.replace(/^http/, 'ws') + '/api/v1/ws/signals';
      } else {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const port = window.location.port ? `:${window.location.port}` : '';
        wsUrl = `${protocol}//${host}${port}/api/v1/ws/signals`;
      }
    } else {
      // Normalize existing WS_URL
      wsUrl = wsUrl.replace(/^http/, 'ws');
    }

    // Force wss if on https
    if (window.location.protocol === 'https:') {
      wsUrl = wsUrl.replace(/^ws:/, 'wss:');
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

