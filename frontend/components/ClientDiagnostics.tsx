'use client';

import { useEffect } from 'react';

export default function ClientDiagnostics() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log("🚀 NUO TRADE INITIALIZED");
      console.log("📍 API URL:", process.env.NEXT_PUBLIC_API_URL || 'RELATIVE (PROXY)');
      console.log("📍 WS URL:", process.env.NEXT_PUBLIC_WS_URL || 'DYNAMIC');
    }
  }, []);

  return null;
}
