import dotenv from 'dotenv';
dotenv.config();

export const config = {
    ALPHA_VANTAGE_API_KEY: process.env.ALPHA_VANTAGE_API_KEY, 
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    ALPHA_VANTAGE_DELAY: 12000, // Delay in ms between AV calls (adjust based on API tier)

    // --- US Market Configuration ---
    COMPANIES_US: [
        // Technology
        { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology' },
        { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology' },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology' },
        { symbol: 'AMZN', name: 'Amazon.com, Inc.', sector: 'Technology' },
        { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology' },
        { symbol: 'META', name: 'Meta Platforms, Inc.', sector: 'Technology' },
        { symbol: 'TSM', name: 'Taiwan Semiconductor Manufacturing Company', sector: 'Technology' },
        { symbol: 'AVGO', name: 'Broadcom Inc.', sector: 'Technology' },

        // Finance
        { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Finance' },
        { symbol: 'BAC', name: 'Bank of America Corp', sector: 'Finance' },
        { symbol: 'V', name: 'Visa Inc.', sector: 'Finance' },
        { symbol: 'MA', name: 'Mastercard Incorporated', sector: 'Finance' },
        { symbol: 'WFC', name: 'Wells Fargo & Company', sector: 'Finance' },

        // EV / Auto
        { symbol: 'TSLA', name: 'Tesla, Inc.', sector: 'EV/Auto' },
        { symbol: 'RIVN', name: 'Rivian Automotive, Inc.', sector: 'EV/Auto' },
        { symbol: 'F', name: 'Ford Motor Company', sector: 'EV/Auto' },
        { symbol: 'GM', name: 'General Motors Company', sector: 'EV/Auto' },

        // Healthcare
        { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare' },
        { symbol: 'UNH', name: 'UnitedHealth Group Incorporated', sector: 'Healthcare' },
        { symbol: 'PFE', name: 'Pfizer Inc.', sector: 'Healthcare' },
        { symbol: 'ABBV', name: 'AbbVie Inc.', sector: 'Healthcare' },
        { symbol: 'MRK', name: 'Merck & Co., Inc.', sector: 'Healthcare' },

        // Energy
        { symbol: 'XOM', name: 'Exxon Mobil Corporation', sector: 'Energy' },
        { symbol: 'CVX', name: 'Chevron Corporation', sector: 'Energy' },
        { symbol: 'COP', name: 'ConocoPhillips', sector: 'Energy' },

        // Retail
        { symbol: 'WMT', name: 'Walmart Inc.', sector: 'Retail' },
        { symbol: 'COST', name: 'Costco Wholesale Corporation', sector: 'Retail' },
        { symbol: 'HD', name: 'The Home Depot, Inc.', sector: 'Retail' },
        { symbol: 'TGT', name: 'Target Corporation', sector: 'Retail' },
    ],
    US_MARKET_HOURS: {
        open: '09:30', // New York Time (ET)
        close: '16:00', // New York Time (ET)
        timezone: 'America/New_York'
    },

    // --- Indian Market Configuration ---
    COMPANIES_NSE: [
        // Conglomerate
        { symbol: 'RELIANCE', name: 'Reliance Industries Ltd.', sector: 'Conglomerate' },
        { symbol: 'ITC', name: 'ITC Ltd.', sector: 'Conglomerate' },
        { symbol: 'ADANIENT', name: 'Adani Enterprises Ltd.', sector: 'Conglomerate' },

        // IT Services
        { symbol: 'TCS', name: 'Tata Consultancy Services Ltd.', sector: 'IT Services' },
        { symbol: 'INFY', name: 'Infosys Ltd.', sector: 'IT Services' },
        { symbol: 'HCLTECH', name: 'HCL Technologies Ltd.', sector: 'IT Services' },
        { symbol: 'WIPRO', name: 'Wipro Ltd.', sector: 'IT Services' },

        // Banking
        { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd.', sector: 'Banking' },
        { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd.', sector: 'Banking' },
        { symbol: 'SBIN', name: 'State Bank of India', sector: 'Banking' },
        { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd.', sector: 'Banking' },
        { symbol: 'AXISBANK', name: 'Axis Bank Ltd.', sector: 'Banking' },

        // Consumer Goods
        { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd.', sector: 'Consumer Goods' },
        { symbol: 'NESTLEIND', name: 'Nestle India Ltd.', sector: 'Consumer Goods' },
        { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd.', sector: 'Consumer Goods' },

        // Telecom
        { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd.', sector: 'Telecom' },
        { symbol: 'RELIANCE JIO', name: 'Reliance Jio Infocomm Ltd.', sector: 'Telecom', is_unlisted: true },

        // Infrastructure
        { symbol: 'LT', name: 'Larsen & Toubro Ltd.', sector: 'Infrastructure' },
        { symbol: 'ULTRACEMCO', name: 'UltraTech Cement Ltd.', sector: 'Infrastructure' },

        // Pharmaceuticals
        { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Industries Ltd.', sector: 'Pharmaceuticals' },
        { symbol: 'DRREDDY', name: 'Dr. Reddy\'s Laboratories Ltd.', sector: 'Pharmaceuticals' },

        // Auto
        { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd.', sector: 'Auto' },
        { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd.', sector: 'Auto' },
        { symbol: 'M&M', name: 'Mahindra & Mahindra Ltd.', sector: 'Auto' }
    ],
    INDIAN_MARKET_HOURS: {
        open: '09:15', // India Time (IST)
        close: '15:30', // India Time (IST)
        timezone: 'Asia/Kolkata'
    },

    // --- General Settings ---
    RATE_LIMIT: {
        // Alpha Vantage limits (adjust if needed, nse-js has its own internal limits)
        requests: 5, // Max requests per minute (conservative)
        per: 60000, // Milliseconds (1 minute)
        delay: 12000 // Delay between batches if limit hit (ms)
    },
    GEMINI: {
        searchGrounding: {
            enabled: true,
            threshold: 0.3,  // Threshold for dynamic retrieval (0-1)
            maxResults: 3    // Maximum number of search results to use
        },
        // How significant a price change should be to trigger analysis
        analysisThresholds: {
            price: 0.5,     // Percentage change in price
            volume: 50       // Percentage change in volume
        }
    }
};
