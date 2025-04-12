import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { MarketDataService } from './marketData.js';
import { MarketAnalysis } from './analysis.js';
import { config } from './config.js';

const app = express();
app.use(cors());

// Initialize services
const marketData = new MarketDataService();
const marketAnalysis = new MarketAnalysis();

// Rate limiting configuration
const API_CALLS = {
    lastCallTime: Date.now(),
    totalCalls: 0,
    resetTime: Date.now() + 60 * 1000, // Reset counter every minute
    maxCallsPerMinute: 30, // Maximum number of API calls per minute
};

// Helper function to manage API rate limiting
function checkRateLimit() {
    const now = Date.now();
    
    // Reset counter if needed
    if (now > API_CALLS.resetTime) {
        API_CALLS.totalCalls = 0;
        API_CALLS.resetTime = now + 60 * 1000;
        console.log('[RateLimit] Reset API call counter');
    }
    
    // Update call counter
    API_CALLS.totalCalls++;
    API_CALLS.lastCallTime = now;
    
    // Check if we're over the limit
    if (API_CALLS.totalCalls > API_CALLS.maxCallsPerMinute) {
        console.warn(`[RateLimit] API call limit exceeded (${API_CALLS.totalCalls}/${API_CALLS.maxCallsPerMinute})`);
        return false;
    }
    
    return true;
}

// Function to get cached or fallback data when rate limited
function getFallbackData() {
    // Generate some basic fallback data
    const fallbackTime = Date.now();
    const usCompanies = config.COMPANIES_US.slice(0, 5).map(company => ({
        symbol: company.symbol,
        name: company.name,
        price: 0.00,
        change: 0.00,
        changePercent: 0.00,
        volume: 0,
        market: 'US',
        timestamp: fallbackTime
    }));
    
    const inCompanies = config.COMPANIES_NSE.slice(0, 5).map(company => ({
        symbol: company.symbol,
        name: company.name,
        price: 0.00,
        change: 0.00,
        changePercent: 0.00,
        volume: 0,
        market: 'IN',
        timestamp: fallbackTime
    }));
    
    return [...usCompanies, ...inCompanies];
}

// Initialize WebSocket server
const wss = new WebSocketServer({ port: 8080 });

// Store connected clients
const clients = new Set();

// Function to broadcast market status
function broadcastMarketStatus() {
    const status = marketData.getMarketStatus();
    const message = JSON.stringify({
        type: 'marketStatus',
        data: status
    });
    
    for (const client of clients) {
        if (client.readyState === 1) {
            client.send(message);
        }
    }
}

// Function to send market updates
async function sendMarketUpdates() {
    console.log('[WebSocket] Starting sendMarketUpdates function...');
    
    // Check rate limit before making API calls
    let updates = [];
    if (checkRateLimit()) {
        try {
            updates = await marketData.fetchAllStockData();
            console.log(`[WebSocket] Fetched ${updates.length} market updates`);
        } catch (error) {
            console.error('[WebSocket] Error fetching market data:', error);
            updates = getFallbackData();
            console.log(`[WebSocket] Using fallback data with ${updates.length} items`);
        }
    } else {
        updates = getFallbackData();
        console.log(`[WebSocket] Rate limited, using fallback data with ${updates.length} items`);
    }
    
    for (const update of updates) {
        // Ensure required fields are present
        if (!update.symbol || !update.market || !update.name) {
            console.warn(`[WebSocket] Skipping invalid update:`, update);
            continue;
        }

        // Ensure numeric fields are numbers, not strings
        update.price = Number(update.price) || 0;
        update.change = Number(update.change) || 0;
        update.changePercent = Number(update.changePercent) || 0;
        update.volume = Number(update.volume) || 0;
        
        // Get AI analysis for significant changes (>0.5%)
        if (Math.abs(update.changePercent) > 0.5 && update.price > 0) {
            try {
                if (checkRateLimit()) {
                    update.analysis = await marketAnalysis.analyzeMarketMove(
                        update.symbol,
                        update.name,
                        update,
                        marketData.getMarketStatus()
                    );
                }
            } catch (error) {
                console.error(`[WebSocket] Error generating analysis for ${update.symbol}:`, error);
            }
        }

        const message = JSON.stringify({
            type: 'marketUpdate',
            data: update
        });

        console.log(`[WebSocket Send] Sending update for ${update.symbol} (${update.market}) to ${clients.size} clients.`);

        for (const client of clients) {
            if (client.readyState === 1) {
                client.send(message);
            }
        }
    }
}

// WebSocket connection handling
wss.on('connection', async (ws) => {
    console.log('Client connected');
    clients.add(ws);

    // Send market status immediately
    broadcastMarketStatus();

    // Send initial data
    try {
        console.log('[WebSocket] Fetching initial data for new client...');
        
        // Use cached data if available or rate limited
        let updates;
        if (checkRateLimit()) {
            updates = await marketData.fetchAllStockData();
        } else {
            updates = getFallbackData();
        }
        
        console.log(`[WebSocket] Sending ${updates.length} initial updates to new client`);
        
        for (const update of updates) {
            if (update && update.symbol) {
                ws.send(JSON.stringify({
                    type: 'marketUpdate',
                    data: update
                }));
            }
        }
    } catch (error) {
        console.error('[WebSocket] Error sending initial data:', error);
        
        // Send fallback data if there's an error
        const fallbackData = getFallbackData();
        for (const update of fallbackData) {
            ws.send(JSON.stringify({
                type: 'marketUpdate',
                data: update
            }));
        }
    }

    // Handle client messages
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'subscribe' && data.symbol) {
                // Handle stock subscription
                ws.subscriptions = ws.subscriptions || new Set();
                ws.subscriptions.add(data.symbol);
            } else if (data.type === 'unsubscribe' && data.symbol) {
                // Handle stock unsubscription
                if (ws.subscriptions) {
                    ws.subscriptions.delete(data.symbol);
                }
            } else if (data.type === 'refresh') {
                // Handle manual refresh request
                console.log('[WebSocket] Received refresh request');
                
                // Send market status
                broadcastMarketStatus();
                
                // Send updated data
                const refreshData = checkRateLimit() 
                    ? await marketData.fetchAllStockData() 
                    : getFallbackData();
                
                for (const update of refreshData) {
                    if (update && update.symbol) {
                        ws.send(JSON.stringify({
                            type: 'marketUpdate',
                            data: update
                        }));
                    }
                }
            }
        } catch (error) {
            console.error('Error handling message:', error);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);
    });
});

// Initialize market data service
marketData.initialize().then(() => {
    console.log('Market data service initialized');
    
    // Start market status updates
    setInterval(broadcastMarketStatus, 60000); // Every minute
    
    // Initial data fetch to populate cache
    console.log('[Server] Performing initial data fetch...');
    sendMarketUpdates().then(() => {
        console.log('[Server] Initial data fetch completed');
    });
    
    // Start market data updates with exponential backoff
    let updateInterval = 60000; // Start with 1 minute
    
    const scheduleNextUpdate = () => {
        setTimeout(async () => {
            try {
                await sendMarketUpdates();
                // If successful, gradually reduce the interval back to normal
                updateInterval = Math.max(60000, updateInterval * 0.8);
            } catch (error) {
                console.error('[Server] Error in market update cycle:', error);
                // If error, increase interval to avoid excessive API calls
                updateInterval = Math.min(300000, updateInterval * 1.5); // Cap at 5 minutes
            }
            console.log(`[Server] Next update scheduled in ${updateInterval/1000} seconds`);
            scheduleNextUpdate();
        }, updateInterval);
    };
    
    scheduleNextUpdate();
});

// Add an endpoint to check server status and get market info
app.get('/api/status', (req, res) => {
    res.json({
        status: 'running',
        uptime: process.uptime(),
        marketStatus: marketData.getMarketStatus(),
        apiCalls: API_CALLS
    });
});

// Start HTTP server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`HTTP Server running on port ${PORT}`);
    console.log('WebSocket Server running on port 8080');
});
