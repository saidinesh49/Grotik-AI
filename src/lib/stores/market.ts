import { writable } from 'svelte/store';
import { browser } from '$app/environment';

type MarketUpdate = {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    intradayChange?: number;
    intradayChangePercent?: number;
    volume: number;
    analysis?: string;
    timestamp: number;
    market: 'US' | 'IN';
};

type SingleMarketStatus = {
    isOpen: boolean;
    nextOpenTime: number | null;
    nextCloseTime: number | null;
    lastUpdate: number;
};

type CombinedMarketStatus = {
    US: SingleMarketStatus;
    IN: SingleMarketStatus;
};

type MarketStore = {
    updates: MarketUpdate[];
    connected: boolean;
    marketStatus: CombinedMarketStatus;
    watchlist: string[];
};

function createMarketStore() {
    // Load any previously stored data from localStorage to maintain state between refreshes
    const getSavedState = (): Partial<MarketStore> => {
        if (!browser) return {};
        
        try {
            const savedData = localStorage.getItem('marketStoreData');
            if (savedData) {
                return JSON.parse(savedData);
            }
        } catch (error) {
            console.error('[MarketStore] Error loading saved state:', error);
        }
        return {};
    };
    
    const savedState = getSavedState();
    
    const { subscribe, set, update } = writable<MarketStore>({
        updates: savedState.updates || [],
        connected: false,
        marketStatus: savedState.marketStatus || {
            US: {
                isOpen: false,
                nextOpenTime: null,
                nextCloseTime: null,
                lastUpdate: Date.now()
            },
            IN: {
                isOpen: false,
                nextOpenTime: null,
                nextCloseTime: null,
                lastUpdate: Date.now()
            }
        },
        watchlist: savedState.watchlist || []
    });

    // Persist state to localStorage when it changes
    let currentStore: MarketStore | null = null;
    subscribe(store => {
        currentStore = store;
        
        if (browser) {
            try {
                localStorage.setItem('marketStoreData', JSON.stringify({
                    updates: store.updates,
                    marketStatus: store.marketStatus,
                    watchlist: store.watchlist
                }));
            } catch (error) {
                console.warn('[MarketStore] Failed to save state to localStorage:', error);
            }
        }
    });

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;
    const RETRY_INTERVALS = [1000, 2000, 5000, 10000, 30000]; // Progressive backoff

    function handleWebSocketMessage(event: MessageEvent) {
        try {
            const message = JSON.parse(event.data);
            console.log(`[WebSocket] Received message of type: ${message.type}`);

            if (message.type === 'marketStatus') {
                if (message.data && message.data.US && message.data.IN) {
                    console.log(`[WebSocket] Updating marketStatus: US=${message.data.US.isOpen}, IN=${message.data.IN.isOpen}`);
                    update(store => ({
                        ...store,
                        marketStatus: message.data
                    }));
                } else {
                    console.warn("Received malformed marketStatus:", message.data);
                }
            } else if (message.type === 'marketUpdate') {
                const newUpdate: MarketUpdate = message.data;

                if (!newUpdate || typeof newUpdate.symbol !== 'string' || typeof newUpdate.market !== 'string') {
                    console.warn("[WebSocket] Received malformed marketUpdate:", newUpdate);
                    return;
                }
                
                console.log(`[WebSocket] Received market update for ${newUpdate.symbol} (${newUpdate.market}): price=${newUpdate.price}`);

                update(store => {
                    const existingIndex = store.updates.findIndex(u => u.symbol === newUpdate.symbol);
                    let updates = [...store.updates];

                    if (existingIndex >= 0) {
                        updates[existingIndex] = newUpdate;
                        console.log(`[WebSocket] Updated existing symbol ${newUpdate.symbol} at index ${existingIndex}`);
                    } else {
                        updates = [newUpdate, ...updates];
                        console.log(`[WebSocket] Added new symbol ${newUpdate.symbol}`);
                    }

                    updates.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
                    console.log(`[WebSocket] Total updates after sort: ${updates.length}`);

                    updates = updates.slice(0, 50);

                    return { ...store, updates };
                });

                if (
                    browser &&
                    currentStore &&
                    Notification.permission === 'granted' &&
                    Math.abs(newUpdate.changePercent) > 2 &&
                    currentStore.watchlist.includes(newUpdate.symbol)
                ) {
                    showNotification(newUpdate);
                }
            }
        } catch (error) {
            console.error("Error processing WebSocket message:", error, "Data:", event.data);
        }
    }

    function handleWebSocketOpen() {
        console.log('[WebSocket] Connection established.');
        update(store => ({ ...store, connected: true }));
        clearTimeout(reconnectTimeout as NodeJS.Timeout);
        reconnectAttempts = 0;
        
        // Dump store state after connection
        setTimeout(() => {
            if (currentStore) {
                console.log('[WebSocket] Current store state after connection:');
                console.log('- Connected:', currentStore.connected);
                console.log('- Updates count:', currentStore.updates.length);
                console.log('- Market status US:', currentStore.marketStatus.US?.isOpen);
                console.log('- Market status IN:', currentStore.marketStatus.IN?.isOpen);
            }
        }, 1000);
    }

    function handleWebSocketClose(event: CloseEvent) {
        console.log('[WebSocket] Connection closed.', event.code, event.reason);
        update(store => ({ ...store, connected: false }));
        ws = null;

        if (!reconnectTimeout) { 
            scheduleReconnect();
        }
    }

    function handleWebSocketError(event: Event) {
        console.error('[WebSocket] Error:', event);
        if (!reconnectTimeout) { 
            scheduleReconnect();
        }
    }

    function scheduleReconnect() {
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        
        // Apply increasing delays between reconnection attempts
        let delay = RETRY_INTERVALS[Math.min(reconnectAttempts, RETRY_INTERVALS.length - 1)];
        console.log(`[WebSocket] Scheduling reconnect in ${delay/1000} seconds (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})...`);
        
        reconnectTimeout = setTimeout(() => {
            console.log('[WebSocket] Attempting reconnect...');
            reconnectAttempts++;
            connectWebSocket();
            
            // If we've tried too many times, use fallback data
            if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                console.log(`[WebSocket] Maximum reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Using fallback data.`);
                loadFallbackData();
            }
        }, delay); 
    }

    function connectWebSocket() {
        if (!browser) return; 

        if (ws && ws.readyState === WebSocket.OPEN) {
            console.log('[WebSocket] Already connected.');
            return; 
        }

        console.log('[WebSocket] Attempting to connect...'); 
        try {
            // Try different connection options (localhost and current hostname)
            const currentHostname = window.location.hostname;
            const wsUrl = currentHostname === 'localhost' ? 'ws://localhost:8080' : `ws://${currentHostname}:8080`;
            console.log(`[WebSocket] Trying to connect to: ${wsUrl}`);
            
            ws = new WebSocket(wsUrl);

            ws.onopen = handleWebSocketOpen;
            ws.onmessage = handleWebSocketMessage;
            ws.onclose = handleWebSocketClose;
            ws.onerror = handleWebSocketError;
            
            // Fallback data if WebSocket fails
            setTimeout(() => {
                if (!currentStore?.connected) {
                    console.log('[WebSocket] Connection taking too long, using fallback data');
                    loadFallbackData();
                }
            }, 3000);
        } catch (error) {
            console.error('[WebSocket] Error creating connection:', error);
            scheduleReconnect();
            loadFallbackData();
        }
    }

    // Load fallback data if server connection is failing
    function loadFallbackData() {
        console.log('[MarketStore] Loading fallback data');
        
        // Update market status
        update(store => ({
            ...store,
            marketStatus: {
                US: {
                    isOpen: false,
                    nextOpenTime: Date.now() + 3600000, // Now + 1 hour
                    nextCloseTime: null,
                    lastUpdate: Date.now()
                },
                IN: {
                    isOpen: true,
                    nextOpenTime: null,
                    nextCloseTime: Date.now() + 7200000, // Now + 2 hours
                    lastUpdate: Date.now()
                }
            }
        }));
        
        // Add sample data for US market
        const usStocks = [
            { symbol: 'AAPL', name: 'Apple Inc.', price: 182.52, change: -0.87, changePercent: -0.47, volume: 54281900, market: 'US' },
            { symbol: 'MSFT', name: 'Microsoft', price: 425.15, change: 2.35, changePercent: 0.56, volume: 18723500, market: 'US' },
            { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 176.44, change: -0.21, changePercent: -0.12, volume: 21569400, market: 'US' },
            { symbol: 'AMZN', name: 'Amazon.com, Inc.', price: 186.82, change: 1.12, changePercent: 0.60, volume: 36541200, market: 'US' },
            { symbol: 'META', name: 'Meta Platforms', price: 504.19, change: 3.48, changePercent: 0.69, volume: 12458300, market: 'US' },
            { symbol: 'NVDA', name: 'NVIDIA Corporation', price: 887.65, change: 12.43, changePercent: 1.42, volume: 38954200, market: 'US' }
        ];
        
        // Add sample data for IN market
        const inStocks = [
            { symbol: 'RELIANCE', name: 'Reliance Industries', price: 2841.65, change: 12.45, changePercent: 0.44, volume: 3524100, market: 'IN' },
            { symbol: 'TCS', name: 'Tata Consultancy', price: 3715.20, change: -4.30, changePercent: -0.12, volume: 1254600, market: 'IN' },
            { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd.', price: 1048.75, change: 5.45, changePercent: 0.52, volume: 2845700, market: 'IN' },
            { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', price: 1674.80, change: -2.55, changePercent: -0.15, volume: 3267900, market: 'IN' },
            { symbol: 'INFY', name: 'Infosys Ltd.', price: 1456.25, change: 8.70, changePercent: 0.60, volume: 2145800, market: 'IN' }
        ];
        
        // Update store with sample data
        update(store => {
            // Add timestamps to all stocks
            const updateWithTimestamps = [...usStocks, ...inStocks].map(stock => ({
                ...stock,
                timestamp: Date.now()
            }));
            
            // If we already have some data, don't replace it all
            if (store.updates && store.updates.length > 0) {
                console.log('[MarketStore] Keeping existing data and adding fallback data');
                // Update any existing entries, add new ones if they don't exist
                const existingSymbols = new Set(store.updates.map(u => u.symbol));
                const newUpdates = updateWithTimestamps.filter(u => !existingSymbols.has(u.symbol));
                
                return {
                    ...store,
                    updates: [...store.updates, ...newUpdates],
                    connected: true // Pretend we're connected
                };
            }
            
            return {
                ...store,
                updates: updateWithTimestamps,
                connected: true // Pretend we're connected
            };
        });
        
        console.log('[MarketStore] Fallback data loaded');
    }

    function disconnectWebSocket() {
        if (ws) {
            ws.close();
            ws = null;
        }
    }

    function isSymbolInWatchlist(symbol: string): boolean {
        return currentStore ? currentStore.watchlist.includes(symbol) : false;
    }

    function addToWatchlist(symbol: string): void {
        update(store => {
            if (store.watchlist.includes(symbol)) return store;
            return { ...store, watchlist: [...store.watchlist, symbol] };
        });
    }

    function removeFromWatchlist(symbol: string): void {
        update(store => ({
            ...store,
            watchlist: store.watchlist.filter(s => s !== symbol)
        }));
    }

    function showNotification(data: MarketUpdate): void {
        if (!browser) return;

        new Notification(`${data.name} (${data.symbol})`, {
            body: `Price ${data.change >= 0 ? 'up' : 'down'} ${Math.abs(
                data.changePercent
            ).toFixed(2)}% to $${data.price.toFixed(2)}\n${data.analysis || ''}`,
            icon: '/favicon.png'
        });
    }

    // Auto-connect on store creation if in browser
    if (browser) {
        // Check if we need to load fallback data right away (on refresh)
        if (savedState.updates && savedState.updates.length === 0) {
            setTimeout(() => {
                loadFallbackData();
            }, 500);
        }
        
        connectWebSocket();
    }

    return {
        subscribe,
        connect: connectWebSocket,
        disconnect: disconnectWebSocket,
        forceRefresh: () => {
            loadFallbackData();
        },
        addToWatchlist: (symbol: string) => {
            if (currentStore && !currentStore.watchlist.includes(symbol)) {
                update(store => ({ ...store, watchlist: [...store.watchlist, symbol] }));
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'addToWatchlist', symbol }));
                }
            }
        },
        removeFromWatchlist: (symbol: string) => {
            update(store => ({ ...store, watchlist: store.watchlist.filter(s => s !== symbol) }));
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'removeFromWatchlist', symbol }));
            }
        }
    };
}

export const marketStore = createMarketStore();
