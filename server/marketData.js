import fetch from 'node-fetch';
import { config } from './config.js';
import { NSE } from 'nse-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Create a cache mechanism
const dataCache = {
    US: {
        lastFetch: 0, 
        data: [],
        expiry: 5 * 60 * 1000 // 5 minutes
    },
    IN: {
        lastFetch: 0,
        data: [],
        expiry: 5 * 60 * 1000 // 5 minutes
    }
};

// Initialize Gemini Client (outside class, assuming config is available)
let genAI;
let generativeModel;
if (config.GEMINI_API_KEY) {
    try {
        genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
        generativeModel = genAI.getGenerativeModel({ 
            model: "gemini-2.0-flash", // Or another suitable model
            // Configuration for grounding (ensure structure matches SDK expectations)
            tools: [{
                "aip_grounding_tool": {
                    "web_search": {
                        "grounding_config": { // Assuming this structure, might need adjustment
                            "disabled": !config.GEMINI.searchGrounding.enabled
                        }
                    }
                }
            }]
        });
        console.log('[Gemini] Client initialized successfully.');
    } catch (error) {
        console.error('[Gemini] Failed to initialize client:', error);
        genAI = null; // Ensure it's null if init fails
        generativeModel = null;
    }
} else {
    console.warn('[Gemini] API Key not found. Gemini insights will be disabled.');
    genAI = null;
    generativeModel = null;
}

export class MarketDataService {
    constructor() {
        this.nse = new NSE();
        this.lastPrices = new Map(); 
        this.averageVolumes = new Map(); 
        this.marketStatus = {
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
        };
        this.requestQueue = [];
        this.requestHistory = [];
        this.isFetchingAllData = false; 
        this.NSE_REQUEST_DELAY = 400; 
        
        // Track API calls to avoid rate limiting
        this.apiCalls = {
            lastCalledTime: Date.now(),
            countSinceReset: 0,
            resetTime: Date.now() + 60 * 1000
        };
        
        console.log('MarketDataService initialized');
        this.newsCache = new Map(); // Simple cache for news
        this.NEWS_CACHE_EXPIRY = 15 * 60 * 1000; // 15 minutes
        this.geminiInsightCache = new Map(); // Simple cache for insights
        this.GEMINI_CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes
    }

    // Check if we can make an API call based on rate limits
    canMakeApiCall() {
        const now = Date.now();
        
        // Reset counter if needed
        if (now > this.apiCalls.resetTime) {
            this.apiCalls.countSinceReset = 0;
            this.apiCalls.resetTime = now + 60 * 1000; // Reset every minute
            console.log('[MarketData] Resetting API call counter');
        }
        
        // Check if we've made too many calls
        if (this.apiCalls.countSinceReset >= 20) { // Max 20 calls per minute
            console.warn(`[MarketData] Rate limit reached (${this.apiCalls.countSinceReset} calls in the last minute)`);
            return false;
        }
        
        // Update counter
        this.apiCalls.countSinceReset++;
        this.apiCalls.lastCalledTime = now;
        
        return true;
    }

    async initialize() {
        await this.updateMarketStatus();
        console.log('Initial market status:', this.marketStatus);
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async fetchStockData(company, retryCount = 0) {
        const { symbol, name, sector } = company;
        try {
            const now = Date.now();
            if (now - this.lastRequestTime < config.RATE_LIMIT.delay) {
                console.log(`Rate limit hit for ${symbol}, using cached data`);
                return this.lastPrices.get(symbol);
            }

            if (now - this.lastRequestTime > config.RATE_LIMIT.per) {
                this.requestCount = 0;
            }

            if (this.requestCount >= config.RATE_LIMIT.requests) {
                console.log(`Request limit hit for ${symbol}, using cached data`);
                return this.lastPrices.get(symbol);
            }

            const quoteResponse = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${config.ALPHA_VANTAGE_API_KEY}`);
            const quoteData = await quoteResponse.json();

            this.lastRequestTime = now;
            this.requestCount++;

            if (quoteData['Note']) {
                throw new Error('API rate limit exceeded');
            }

            if (quoteData['Global Quote']) {
                const quote = quoteData['Global Quote'];
                const price = parseFloat(quote['05. price']);
                const change = parseFloat(quote['09. change']);
                const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));
                const volume = parseInt(quote['06. volume']);

                if (!this.averageVolumes.has(symbol)) {
                    await this.fetchAverageVolume(symbol);
                }

                const stockData = {
                    symbol,
                    name,
                    sector,
                    price,
                    change,
                    changePercent,
                    volume,
                    averageVolume: this.averageVolumes.get(symbol),
                    market: 'US',
                    timestamp: Date.now(),
                };

                // Integrate News and Insights
                stockData.news = await this.fetchNewsForSymbol(symbol);
                stockData.insight = await this.generateGeminiInsight(stockData);

                this.lastPrices.set(symbol, stockData);
                return stockData;
            }

            throw new Error('Invalid API response');
        } catch (error) {
            console.error(`Error fetching data for ${symbol}:`, error);

            if (retryCount < this.retryDelays.length) {
                const delay = this.retryDelays[retryCount];
                console.log(`Retrying ${symbol} in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return this.fetchStockData(company, retryCount + 1);
            }

            return this.lastPrices.get(symbol);
        }
    }

    async fetchAverageVolume(symbol) {
        try {
            const now = Date.now();
            if (now - this.lastRequestTime < config.RATE_LIMIT.delay) {
                return;
            }

            const response = await fetch(
                `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${config.ALPHA_VANTAGE_API_KEY}`
            );
            const data = await response.json();

            this.lastRequestTime = now;
            this.requestCount++;

            if (data['Time Series (Daily)']) {
                const dailyData = data['Time Series (Daily)'];
                const volumes = Object.values(dailyData)
                    .slice(0, 30) 
                    .map(day => parseInt(day['5. volume']));

                const averageVolume = Math.round(
                    volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length
                );

                this.averageVolumes.set(symbol, averageVolume);
            }
        } catch (error) {
            console.error(`Error fetching average volume for ${symbol}:`, error);
        }
    }

    async fetchNSEStockData(company) {
        const { symbol, name, sector } = company;
        console.log(`[NSE] Fetching data for ${symbol}...`);
        try {
            const quoteData = await this.nse.quote(symbol);
            console.log(`[NSE] Received quote data for ${symbol}`);
            await delay(this.NSE_REQUEST_DELAY); 

            const tradeInfoData = await this.nse.quote(symbol, 'equity', 'trade_info');
            console.log(`[NSE] Received trade info data for ${symbol}`);

            if (!quoteData?.priceInfo || !tradeInfoData?.securityWiseDP) {
                 console.warn(`[NSE] Incomplete data received for ${symbol}. Quote: ${!!quoteData?.priceInfo}, TradeInfo: ${!!tradeInfoData?.securityWiseDP}`);
                 return null; 
            }

            const priceInfo = quoteData.priceInfo;
            const volumeInfo = tradeInfoData.securityWiseDP;

            if (priceInfo.lastPrice === undefined || priceInfo.change === undefined || priceInfo.pChange === undefined || volumeInfo.quantityTraded === undefined) {
                 console.warn(`[NSE] Missing required field in data for ${symbol}. Price: ${priceInfo.lastPrice}, Change: ${priceInfo.change}, pChange: ${priceInfo.pChange}, Volume: ${volumeInfo.quantityTraded}`);
                 return null;
            }

            const stockData = {
                symbol, 
                name,
                sector,
                price: priceInfo.lastPrice,
                change: priceInfo.change,
                changePercent: priceInfo.pChange, 
                volume: volumeInfo.quantityTraded,
                market: 'IN',
                timestamp: new Date(quoteData.metadata.lastUpdateTime).getTime() || Date.now(),
                apiSource: 'NSE'
            };

             this.lastPrices.set(symbol, stockData.price);

             // Integrate News and Insights
             stockData.news = await this.fetchNewsForSymbol(symbol);
             stockData.insight = await this.generateGeminiInsight(stockData);

             console.log(`[NSE] Fetched data for ${symbol}: Price=${stockData.price}, Change=${stockData.change}, pChange=${stockData.changePercent}%, Vol=${stockData.volume}`);
             return stockData;

        } catch (error) {
            console.error(`[NSE] Error fetching data for ${symbol}:`, error.message || error);
            return null;
        }
    }

    async fetchAllStockData() {
        if (this.isFetchingAllData) {
            console.log('fetchAllStockData already running, skipping concurrent execution.');
            return [];
        }

        this.isFetchingAllData = true;
        const results = [];
        const fetchTimestamp = Date.now();
        console.log(`Starting fetchAllStockData run at ${new Date(fetchTimestamp).toISOString()}`);

        console.log(`[FetchAll] Checking market status before fetch: US=${this.marketStatus.US.isOpen}, IN=${this.marketStatus.IN.isOpen}`); 
        try {
            // Fetch US Stocks (Alpha Vantage)
            console.log("--- Fetching US Stocks ---");
            // Always fetch at least some US stocks for display purposes, even if market is closed
            const usStocks = this.marketStatus.US.isOpen ? config.COMPANIES_US : config.COMPANIES_US.slice(0, 5);
            
            for (const company of usStocks) {
                let data;
                if (this.marketStatus.US.isOpen) {
                    // Pass the full company object
                    data = await this.fetchStockData(company);
                } else if (this.lastPrices.has(company.symbol)) {
                    // If market is closed but we have cached data, use it
                    data = {
                        symbol: company.symbol,
                        name: company.name,
                        price: this.lastPrices.get(company.symbol),
                        change: 0,
                        changePercent: 0,
                        volume: 0,
                        market: 'US',
                        timestamp: Date.now()
                    };
                    console.log(`[FetchAll] Using cached data for ${company.symbol} as US market is closed`);
                } else {
                    // If no cached data, create placeholder
                    data = {
                        symbol: company.symbol,
                        name: company.name,
                        price: 0,
                        change: 0,
                        changePercent: 0,
                        volume: 0,
                        market: 'US',
                        timestamp: Date.now()
                    };
                    console.log(`[FetchAll] Created placeholder for ${company.symbol} as US market is closed`);
                }
                
                if (data) {
                    results.push({
                        ...data,
                        market: 'US'
                    });
                }
                
                // Only delay API calls if actually fetching live data
                if (this.marketStatus.US.isOpen) {
                    console.log(`[AV] Waiting for ${config.ALPHA_VANTAGE_DELAY || 12000}ms before next AV call...`);
                    await this.delay(config.ALPHA_VANTAGE_DELAY || 12000);
                }
            }

            // Fetch Indian Stocks (NSE)
            console.log("--- Fetching Indian Stocks ---");
            // Always fetch at least some Indian stocks for display purposes, even if market is closed
            const inStocks = this.marketStatus.IN.isOpen ? config.COMPANIES_NSE : config.COMPANIES_NSE.slice(0, 5);
            
            for (const company of inStocks) {
                let data;
                if (this.marketStatus.IN.isOpen) {
                    // Pass the full company object
                    data = await this.fetchNSEStockData(company);
                } else if (this.lastPrices.has(company.symbol)) {
                    // If market is closed but we have cached data, use it
                    data = {
                        symbol: company.symbol,
                        name: company.name,
                        price: this.lastPrices.get(company.symbol),
                        change: 0,
                        changePercent: 0,
                        volume: 0,
                        market: 'IN',
                        timestamp: Date.now()
                    };
                    console.log(`[FetchAll] Using cached data for ${company.symbol} as IN market is closed`);
                } else {
                    // If no cached data, create placeholder
                    data = {
                        symbol: company.symbol,
                        name: company.name,
                        price: 0,
                        change: 0,
                        changePercent: 0,
                        volume: 0,
                        market: 'IN',
                        timestamp: Date.now()
                    };
                    console.log(`[FetchAll] Created placeholder for ${company.symbol} as IN market is closed`);
                }
                
                if (data) {
                    results.push({
                        ...data,
                        market: 'IN'
                    });
                }
                
                // Only delay API calls if actually fetching live data
                if (this.marketStatus.IN.isOpen) {
                    console.log(`[NSE] Waiting for ${this.NSE_REQUEST_DELAY}ms before next NSE symbol fetch...`);
                    await this.delay(this.NSE_REQUEST_DELAY);
                }
            }

            console.log(`Finished fetchAllStockData run. Fetched ${results.length} items.`);

        } catch (error) {
            console.error('Error during fetchAllStockData:', error);
        } finally {
            this.isFetchingAllData = false; // Release the lock
            const duration = Date.now() - fetchTimestamp;
            console.log(`fetchAllStockData run took ${duration}ms`);
        }
        return results;
    }

    _calculateMarketStatus(marketConfig) {
        const now = new Date();
        let marketTime;
        try {
             marketTime = new Date(now.toLocaleString('en-US', { timeZone: marketConfig.timezone }));
        } catch (e) {
            console.error(`Invalid timezone identifier: ${marketConfig.timezone}. Falling back to system time.`, e);
            marketTime = now; 
        }
        const day = marketTime.getDay(); 
        const time = marketTime.getHours() * 100 + marketTime.getMinutes();

        // Define US extended hours if applicable
        const isUSMarket = marketConfig.timezone === 'America/New_York';
        const preMarketOpen = isUSMarket ? 400 : null; // 4:00 AM ET
        const regularMarketOpen = marketConfig.open.split(':').map(Number)[0] * 100 + marketConfig.open.split(':').map(Number)[1];
        const regularMarketClose = marketConfig.close.split(':').map(Number)[0] * 100 + marketConfig.close.split(':').map(Number)[1];
        const afterHoursClose = isUSMarket ? 2000 : null; // 8:00 PM ET

        console.log(`[MarketStatus-${marketConfig.timezone}] Raw Now: ${now.toISOString()}, Market Time: ${marketTime.toISOString()}, Day: ${day}, Time: ${time}, Pre: ${preMarketOpen}, Open: ${regularMarketOpen}, Close: ${regularMarketClose}, AfterClose: ${afterHoursClose}`);

        // Basic weekend check (refine later with holidays)
        if (day === 0 || day === 6) { // Sunday or Saturday
            const daysUntilMonday = day === 0 ? 1 : 2;
            const nextOpenDate = new Date(marketTime);
            nextOpenDate.setDate(marketTime.getDate() + daysUntilMonday);
            const [openHour, openMin] = marketConfig.open.split(':').map(Number);
            nextOpenDate.setHours(openHour, openMin, 0, 0);
            return {
                isOpen: false, // Market is fully closed
                status: 'CLOSED',
                nextOpenTime: nextOpenDate.getTime(),
                nextCloseTime: null,
                lastUpdate: Date.now()
            };
        }

        let currentStatus = 'CLOSED';
        let isOpenOverall = false;
        let nextOpenTimestamp = null;
        let nextCloseTimestamp = null; // Represents end of the current *active* session

        if (isUSMarket) {
            if (time >= preMarketOpen && time < regularMarketOpen) {
                currentStatus = 'PRE_MARKET';
                isOpenOverall = true;
                nextOpenTimestamp = null; // Market phase is already open (pre-market)
                // Next "close" is the start of regular hours
                const regularOpenDate = new Date(marketTime);
                regularOpenDate.setHours(marketConfig.open.split(':').map(Number)[0], marketConfig.open.split(':').map(Number)[1], 0, 0);
                nextCloseTimestamp = regularOpenDate.getTime();
            } else if (time >= regularMarketOpen && time < regularMarketClose) {
                currentStatus = 'OPEN';
                isOpenOverall = true;
                nextOpenTimestamp = null; // Market is open
                const regularCloseDate = new Date(marketTime);
                regularCloseDate.setHours(marketConfig.close.split(':').map(Number)[0], marketConfig.close.split(':').map(Number)[1], 0, 0);
                nextCloseTimestamp = regularCloseDate.getTime();
            } else if (time >= regularMarketClose && time < afterHoursClose) {
                currentStatus = 'AFTER_HOURS';
                isOpenOverall = true;
                nextOpenTimestamp = null; // Market phase is active (after-hours)
                const afterHoursEndDate = new Date(marketTime);
                afterHoursEndDate.setHours(20, 0, 0, 0); // 8:00 PM
                nextCloseTimestamp = afterHoursEndDate.getTime();
            }
        } else { // Non-US Market (simplified open/close)
            if (time >= regularMarketOpen && time < regularMarketClose) {
                currentStatus = 'OPEN';
                isOpenOverall = true;
                nextOpenTimestamp = null;
                const regularCloseDate = new Date(marketTime);
                regularCloseDate.setHours(marketConfig.close.split(':').map(Number)[0], marketConfig.close.split(':').map(Number)[1], 0, 0);
                nextCloseTimestamp = regularCloseDate.getTime();
            }
        }
        
        console.log(`[MarketStatus-${marketConfig.timezone}] Calculated Status: ${currentStatus}, isOpenOverall: ${isOpenOverall}`);

        // Calculate next opening time if currently closed or after hours ended
        if (currentStatus === 'CLOSED' || (isUSMarket && time >= afterHoursClose) || (!isUSMarket && time >= regularMarketClose)) {
            const nextDay = new Date(marketTime);
            nextDay.setDate(marketTime.getDate() + 1);
            nextDay.setSeconds(0, 0);
            if (nextDay.getDay() === 6) nextDay.setDate(nextDay.getDate() + 2); // Skip Sat -> Mon
            if (nextDay.getDay() === 0) nextDay.setDate(nextDay.getDate() + 1); // Skip Sun -> Mon
            const [openHour, openMin] = marketConfig.open.split(':').map(Number);
            // For US, next open is Pre-Market; otherwise, regular open
            const nextActualOpenHour = isUSMarket ? 4 : openHour;
            const nextActualOpenMin = isUSMarket ? 0 : openMin;
            nextDay.setHours(nextActualOpenHour, nextActualOpenMin);
            nextOpenTimestamp = nextDay.getTime();
            nextCloseTimestamp = null; // No active session, so no close time
        } else if (currentStatus === 'PRE_MARKET' && nextCloseTimestamp === null) {
             // This case handles when pre-market is active but we haven't set nextClose (which is regular open)
             const regularOpenDate = new Date(marketTime);
             regularOpenDate.setHours(marketConfig.open.split(':').map(Number)[0], marketConfig.open.split(':').map(Number)[1], 0, 0);
             nextCloseTimestamp = regularOpenDate.getTime();
        } else if (currentStatus === 'OPEN' && nextCloseTimestamp === null) {
            // This case handles when regular market is active but we haven't set nextClose
            const regularCloseDate = new Date(marketTime);
            regularCloseDate.setHours(marketConfig.close.split(':').map(Number)[0], marketConfig.close.split(':').map(Number)[1], 0, 0);
            nextCloseTimestamp = regularCloseDate.getTime();
        } else if (currentStatus === 'AFTER_HOURS' && nextCloseTimestamp === null) {
            // This case handles when after hours is active but we haven't set nextClose
             const afterHoursEndDate = new Date(marketTime);
             afterHoursEndDate.setHours(20, 0, 0, 0); // 8:00 PM
             nextCloseTimestamp = afterHoursEndDate.getTime();
        }


        return {
            isOpen: isOpenOverall, // True if any session (pre, regular, after) is active
            status: currentStatus, // 'PRE_MARKET', 'OPEN', 'AFTER_HOURS', 'CLOSED'
            nextOpenTime: nextOpenTimestamp, // Time the next session starts (null if already in a session)
            nextCloseTime: nextCloseTimestamp, // Time the current active session ends (null if closed)
            lastUpdate: Date.now()
        };
    }

    async updateMarketStatus() {
        console.log('[MarketStatus] Updating market statuses...'); 
        // Calculate US status with extended hours logic
        this.marketStatus.US = this._calculateMarketStatus(config.US_MARKET_HOURS); 
        // Calculate IN status with standard logic
        this.marketStatus.IN = this._calculateMarketStatus(config.INDIAN_MARKET_HOURS); 
        
        console.log(`[MarketStatus] Calculated Status: US=${this.marketStatus.US.status} (isOpen: ${this.marketStatus.US.isOpen}), IN=${this.marketStatus.IN.status} (isOpen: ${this.marketStatus.IN.isOpen})`); 

        // Optional: Use nse.status() to refine IN status if available and reliable
        try {
            const nseStatusData = await this.nse.status();
            console.log(`[MarketStatus] NSE API Status Result: ${JSON.stringify(nseStatusData)}`); 
            // Example: Check nseStatusData.status and update this.marketStatus.IN.isOpen if needed
            const isNseApiOnline = (nseStatusData.status === 'Online'); // Adjust based on actual response
            if (this.marketStatus.IN.isOpen !== isNseApiOnline) {
                 console.log(`[MarketStatus] Overriding calculated IN status (${this.marketStatus.IN.isOpen}) with NSE API status (${isNseApiOnline})`); 
                 this.marketStatus.IN.isOpen = isNseApiOnline;
            }
            this.marketStatus.IN.lastUpdate = Date.now(); // Update timestamp even if using API
        } catch (err) { 
            console.error("[MarketStatus] Error fetching live NSE status:", err.message || err); 
            // Rely on calculated status if API fails
        }
        console.log(`[MarketStatus] Final Status: US=${this.marketStatus.US.status} (isOpen: ${this.marketStatus.US.isOpen}), IN=${this.marketStatus.IN.status} (isOpen: ${this.marketStatus.IN.isOpen})`); 
    }

    getMarketStatus() {
        return this.marketStatus; 
    }

    async fetchUSMarketData() {
        console.log('[MarketData] Fetching US market data...');
        
        const now = Date.now();
        const cache = dataCache.US;
        
        // Check if we have valid cached data
        if (cache.data.length > 0 && now - cache.lastFetch < cache.expiry) {
            console.log('[MarketData] Using cached US market data');
            return cache.data;
        }
        
        // Check rate limits before making API call
        if (!this.canMakeApiCall() && cache.data.length > 0) {
            console.log('[MarketData] Rate limited, using cached US data');
            return cache.data;
        }
        
        try {
            const result = [];
            let newDataFetched = false; // Flag to check if we fetched anything new
            
            if (this.marketStatus.US.isOpen) {
                console.log('[MarketData] Fetching live US market data...');
                for (const company of config.COMPANIES_US) {
                    try {
                        if (!this.canMakeApiCall()) {
                            console.log(`[MarketData] Rate limited, skipping ${company.symbol}`);
                            // Attempt to add from lastPrices cache if rate limited mid-fetch
                             if (this.lastPrices.has(company.symbol)) {
                                 result.push(this.lastPrices.get(company.symbol));
                             }
                            continue;
                        }
                        
                        const stockData = await this.fetchStockData(company); 
                        
                        if (stockData) {
                           result.push(stockData);
                           newDataFetched = true;
                        } else if (this.lastPrices.has(company.symbol)) {
                            // If fetch failed but we have cached data, use it
                            result.push(this.lastPrices.get(company.symbol));
                        }
                        
                        // Delay needed for Alpha Vantage free tier
                        await this.delay(config.ALPHA_VANTAGE_DELAY || 12000); 
                    } catch (error) {
                        console.error(`[MarketData] Error processing US company ${company.symbol}:`, error);
                         // Attempt to add from lastPrices cache on error
                         if (this.lastPrices.has(company.symbol)) {
                             result.push(this.lastPrices.get(company.symbol));
                         }
                    }
                }
                // Update main data cache only if new data was actually fetched
                if (newDataFetched && result.length > 0) {
                   console.log(`[MarketData] Updating US cache with ${result.length} fresh items.`);
                   dataCache.US.data = result;
                   dataCache.US.lastFetch = Date.now();
                }
            } else {
                console.log('[MarketData] US market is closed, generating placeholder data with sector...');
                // Generate placeholder data for closed market
                for (const company of config.COMPANIES_US) {
                    result.push({
                        symbol: company.symbol,
                        name: company.name,
                        sector: company.sector,
                        price: 0,
                        change: 0,
                        changePercent: 0,
                        volume: 0,
                        market: 'US',
                        timestamp: Date.now(),
                        news: [],
                        insight: null
                    });
                }
                // Update cache with placeholder data
                dataCache.US.data = result;
                dataCache.US.lastFetch = Date.now();
            }
            
            // Return current data (either newly fetched, cached, or placeholder)
            return result.length > 0 ? result : dataCache.US.data;
        } catch (error) {
             console.error('[MarketData] Error fetching US market data:', error);
             
             // Fallback placeholder generation should also include sector/news/insight
             const fallbackData = cache.data.length > 0 ? cache.data : config.COMPANIES_US.map(company => ({
                 symbol: company.symbol,
                 name: company.name, 
                 sector: company.sector,
                 price: 0,
                 change: 0,
                 changePercent: 0,
                 volume: 0,
                 market: 'US',
                 timestamp: Date.now(),
                 news: [],
                 insight: null
             }));
             // Ensure cache is updated if generating fallback from scratch
             if (cache.data.length === 0) {
                 dataCache.US.data = fallbackData;
                 dataCache.US.lastFetch = Date.now();
             }
             return fallbackData;
        }
    }

    async fetchIndianMarketData() {
        console.log('[MarketData] Fetching Indian market data...');
        
        const now = Date.now();
        const cache = dataCache.IN;
        
        // Check if we have valid cached data
        if (cache.data.length > 0 && now - cache.lastFetch < cache.expiry) {
            console.log('[MarketData] Using cached Indian market data');
            return cache.data;
        }
        
        // Check rate limits before making API call
        if (!this.canMakeApiCall() && cache.data.length > 0) {
            console.log('[MarketData] Rate limited, using cached Indian data');
            return cache.data;
        }
        
        try {
            const result = [];
            let newDataFetched = false;
            
            if (this.marketStatus.IN.isOpen) {
                console.log('[MarketData] Fetching live Indian market data...');
                for (const company of config.COMPANIES_NSE) {
                    try {
                         if (!this.canMakeApiCall()) {
                            console.log(`[MarketData] Rate limited, skipping ${company.symbol}`);
                             if (this.lastPrices.has(company.symbol)) {
                                 result.push(this.lastPrices.get(company.symbol));
                             }
                            continue;
                        }
 
                        const stockData = await this.fetchNSEStockData(company);
                        
                        if (stockData) {
                           result.push(stockData);
                           newDataFetched = true;
                        } else if (this.lastPrices.has(company.symbol)) {
                            result.push(this.lastPrices.get(company.symbol));
                        }
                        // Delay handled within fetchNSEStockData
                    } catch (error) {
                        console.error(`[MarketData] Error processing IN company ${company.symbol}:`, error);
                        if (this.lastPrices.has(company.symbol)) {
                             result.push(this.lastPrices.get(company.symbol));
                        }
                    }
                }
                 // Update main data cache only if new data was actually fetched
                if (newDataFetched && result.length > 0) {
                    console.log(`[MarketData] Updating IN cache with ${result.length} fresh items.`);
                   dataCache.IN.data = result;
                   dataCache.IN.lastFetch = Date.now();
                }
            } else {
                console.log('[MarketData] Indian market is closed, generating placeholder data with sector...');
                // Generate placeholder data for closed market
                for (const company of config.COMPANIES_NSE) {
                    result.push({
                        symbol: company.symbol,
                        name: company.name,
                        sector: company.sector,
                        price: 0,
                        change: 0,
                        changePercent: 0,
                        volume: 0,
                        market: 'IN',
                        timestamp: Date.now(),
                        news: [],
                        insight: null
                    });
                }
                // Update cache with placeholder data
                dataCache.IN.data = result;
                dataCache.IN.lastFetch = Date.now();
            }
            
            // Return current data (either newly fetched, cached, or placeholder)
            return result.length > 0 ? result : dataCache.IN.data;
        } catch (error) {
             console.error('[MarketData] Error fetching Indian market data:', error);

             // Fallback placeholder generation should also include sector/news/insight
             const fallbackData = cache.data.length > 0 ? cache.data : config.COMPANIES_NSE.map(company => ({
                 symbol: company.symbol,
                 name: company.name,
                 sector: company.sector,
                 price: 0,
                 change: 0,
                 changePercent: 0,
                 volume: 0,
                 market: 'IN',
                 timestamp: Date.now(),
                 news: [],
                 insight: null
             }));
              // Ensure cache is updated if generating fallback from scratch
              if (cache.data.length === 0) {
                  dataCache.IN.data = fallbackData;
                  dataCache.IN.lastFetch = Date.now();
              }
             return fallbackData;
        }
    }

    async fetchNewsForSymbol(symbol) {
        const now = Date.now();
        if (this.newsCache.has(symbol) && (now - this.newsCache.get(symbol).timestamp < this.NEWS_CACHE_EXPIRY)) {
            // console.log(`[News] Using cached news for ${symbol}`);
            return this.newsCache.get(symbol).data;
        }

        console.log(`[News] Fetching news for ${symbol}...`);
        try {
            // Basic check to avoid spamming AV news endpoint if primary data fetch is rate limited
            if (!this.canMakeApiCall()) {
                console.warn(`[News] Primary rate limit active, skipping news fetch for ${symbol}`);
                return [];
            }

            const newsUrl = `https://www.alphavantage.co/query?function=NEWS_SENTIMENT&tickers=${symbol}&limit=5&apikey=${config.ALPHA_VANTAGE_API_KEY}`;
            const response = await fetch(newsUrl);
            const newsData = await response.json();

            this.apiCalls.lastCalledTime = Date.now();
            this.apiCalls.countSinceReset++;

            if (newsData.Information && newsData.Information.includes("rate limit")) {
                 console.warn(`[News] Rate limit hit for ${symbol}`);
                 return []; // Return empty on rate limit
            }
            
            if (newsData && newsData.feed && Array.isArray(newsData.feed)) {
                const formattedNews = newsData.feed.slice(0, 3).map(item => ({
                    title: item.title,
                    url: item.url,
                    summary: item.summary,
                    source: item.source,
                    time_published: item.time_published // Keep original format
                }));
                this.newsCache.set(symbol, { data: formattedNews, timestamp: now });
                console.log(`[News] Fetched ${formattedNews.length} articles for ${symbol}`);
                return formattedNews;
            } else {
                console.warn(`[News] Unexpected response format for ${symbol}:`, newsData);
                this.newsCache.set(symbol, { data: [], timestamp: now }); // Cache empty result
                return [];
            }
        } catch (error) {
            console.error(`[News] Error fetching news for ${symbol}:`, error);
            return []; // Return empty array on error
        }
    }

    async generateGeminiInsight(stockData) {
        if (!generativeModel) return null; // Gemini client not initialized
        
        const { symbol, name, price, changePercent, volume, averageVolume, news } = stockData;
        const now = Date.now();

        // Cache check
        if (this.geminiInsightCache.has(symbol) && (now - this.geminiInsightCache.get(symbol).timestamp < this.GEMINI_CACHE_EXPIRY)) {
            // console.log(`[Gemini] Using cached insight for ${symbol}`);
            return this.geminiInsightCache.get(symbol).data;
        }

        // Threshold check
        const priceThreshold = config.GEMINI.analysisThresholds?.price || 1.0; // Default 1%
        const volumeThreshold = config.GEMINI.analysisThresholds?.volume || 100; // Default 100% increase
        const volumeChangePercent = averageVolume ? ((volume - averageVolume) / averageVolume) * 100 : 0;

        const meetsPriceThreshold = Math.abs(changePercent) >= priceThreshold;
        const meetsVolumeThreshold = averageVolume > 0 && volumeChangePercent >= volumeThreshold;

        // Only generate if significant change or volume spike
        if (!meetsPriceThreshold && !meetsVolumeThreshold) {
            // console.log(`[Gemini] Thresholds not met for ${symbol}. Price: ${changePercent.toFixed(2)}% (Threshold: ${priceThreshold}%), Volume: ${volumeChangePercent.toFixed(0)}% (Threshold: ${volumeThreshold}%)`);
            return null; 
        }

        console.log(`[Gemini] Generating insight for ${symbol} (Thresholds met)`);

        try {
            let prompt = `Provide a brief (1-2 sentence) insight for a financial dashboard about ${name} (${symbol}). Current status: Price is ${price}, changed ${changePercent.toFixed(2)}% today. `; 
            if (meetsVolumeThreshold) {
                 prompt += `Trading volume (${volume.toLocaleString()}) is significantly higher than average (${averageVolume.toLocaleString()}). `;
            }
            if (news && news.length > 0) {
                prompt += `Recent news headlines include: "${news[0].title}". `;
            }
            prompt += `Focus on the potential reason for the current movement or outlook. Be objective and concise.`;

            const result = await generativeModel.generateContent(prompt);
            const response = result.response;
            const insightText = response.text();
            
            console.log(`[Gemini] Insight generated for ${symbol}: "${insightText.substring(0, 50)}..."`);
            this.geminiInsightCache.set(symbol, { data: insightText, timestamp: now });
            return insightText;
            
        } catch (error) {
            console.error(`[Gemini] Error generating insight for ${symbol}:`, error);
            // Cache null on error to prevent retrying immediately
             this.geminiInsightCache.set(symbol, { data: null, timestamp: now }); 
            return null;
        }
    }
}
