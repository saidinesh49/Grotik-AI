import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from './config.js';

export class MarketAnalysis {
    constructor() {
        this.genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({
            model: 'gemini-pro',
            safetySettings: [{
                category: 'HARM_CATEGORY_DANGEROUS',
                threshold: 'BLOCK_NONE'
            }]
        });
        this.context = new Map(); // Store historical context for each symbol
    }

    async searchNews(symbol, name) {
        try {
            const searchPrompt = `Search for recent news about ${name} (${symbol}) stock price movements, market analysis, or significant company events in the last 24 hours. Focus on factors that could affect the stock price.`;
            
            const searchResult = await this.model.generateContent({
                contents: [{ role: 'user', parts: [{ text: searchPrompt }] }],
                generationConfig: {
                    temperature: 0.2,
                    candidateCount: 1,
                    maxOutputTokens: 1024,
                    topP: 0.8,
                    topK: 40
                }
            });

            const searchResponse = await searchResult.response;
            return searchResponse.text();
        } catch (error) {
            console.error('Error searching news:', error);
            return '';
        }
    }

    async analyzeMarketMove(symbol, name, data, marketStatus) {
        try {
            // Check if the change is significant enough for detailed analysis
            const isSignificantMove = Math.abs(data.changePercent) >= config.GEMINI.analysisThresholds.price;
            const isSignificantVolume = data.volume > 0 && data.averageVolume > 0 &&
                (data.volume / data.averageVolume - 1) * 100 >= config.GEMINI.analysisThresholds.volume;

            // Build context for analysis
            const context = this.buildContext(symbol, name, data, marketStatus);
            
            // Get recent news and market sentiment if the move is significant
            let newsContext = '';
            if (isSignificantMove || isSignificantVolume) {
                newsContext = await this.searchNews(symbol, name);
            }
            
            // Generate analysis prompt with grounding
            const prompt = `You are a professional financial analyst. Based on the following market data and context:

Company: ${name} (${symbol})
Current Price: $${data.price.toFixed(2)}
Daily Change: ${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)} (${data.changePercent.toFixed(2)}%)
${data.intradayChange ? `Intraday Change: ${data.intradayChange >= 0 ? '+' : ''}${data.intradayChange.toFixed(2)} (${data.intradayChangePercent.toFixed(2)}%)` : ''}
Volume: ${data.volume.toLocaleString()}${data.averageVolume ? `\nAverage Volume: ${data.averageVolume.toLocaleString()}` : ''}
Market Status: ${marketStatus.isOpen ? 'Open' : 'Closed'}

Historical Context:
${context}

${newsContext ? `Recent News & Market Sentiment:\n${newsContext}\n` : ''}

Provide a concise, one-sentence analysis of the current price movement. Focus on:
1. The most likely reason for the movement based on recent news and market conditions
2. Any significant company-specific events or broader market trends
3. Volume analysis if there are unusual trading patterns

Keep the response factual and evidence-based. If the movement is minor (<0.5%), focus on broader market conditions.`;

            const result = await this.model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    candidateCount: 1,
                    maxOutputTokens: 150,
                    topP: 0.8,
                    topK: 40
                }
            });

            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('Error analyzing market move:', error);
            return null;
        }
    }

    buildContext(symbol, name, data, marketStatus) {
        // Keep track of price history
        let context = this.context.get(symbol) || [];
        context.push({
            price: data.price,
            change: data.change,
            changePercent: data.changePercent,
            volume: data.volume,
            timestamp: data.timestamp
        });

        // Keep only last 24 hours of data
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        context = context.filter(point => point.timestamp > oneDayAgo);
        this.context.set(symbol, context);

        // Build context string
        let contextString = `${name} (${symbol}) 24-hour trading summary:\n`;
        
        if (context.length > 1) {
            const oldestPoint = context[0];
            const dayChange = data.price - oldestPoint.price;
            const dayChangePercent = (dayChange / oldestPoint.price) * 100;
            
            contextString += `
- 24h Change: ${dayChange >= 0 ? '+' : ''}${dayChange.toFixed(2)} (${dayChangePercent.toFixed(2)}%)
- Highest Price: $${Math.max(...context.map(p => p.price)).toFixed(2)}
- Lowest Price: $${Math.min(...context.map(p => p.price)).toFixed(2)}
- Average Volume: ${Math.round(context.reduce((sum, p) => sum + p.volume, 0) / context.length).toLocaleString()}`;
        }

        return contextString;
    }
}
