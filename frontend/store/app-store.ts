import { create } from 'zustand';

interface AppState {
    isConnected: boolean;
    setIsConnected: (connected: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
    isConnected: false,
    setIsConnected: (connected) => set({ isConnected: connected }),
}));
