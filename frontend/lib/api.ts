const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://nuo-backend.onrender.com';
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'wss://nuo-backend.onrender.com';

export const api = {
    get: async (endpoint: string) => {
        const response = await fetch(`${API_URL}${endpoint}`);
        if (!response.ok) throw new Error('API request failed');
        return response.json();
    },

    post: async (endpoint: string, data: any) => {
        const response = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('API request failed');
        return response.json();
    },
};
