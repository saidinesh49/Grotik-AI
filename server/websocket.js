export class WebSocketServer {
  constructor(server) {
    // Check if WebSocket is available (for environments like StackBlitz)
    if (typeof global.WebSocket === 'undefined') {
      console.warn('WebSocket is not available in this environment. Market updates will not work.');
      this.wss = null;
      // Provide dummy methods or ensure no calls are made to this.wss
    } else {
      this.wss = new WebSocket.Server({ server }); // Use WebSocket.Server
    }
    
    this.marketData = new MarketDataService();
    this.clients = new Map();
    this.isServiceRunning = false;
    this.dataRefreshInterval = null;
    this.lastSentData = {
      US: [],
      IN: []
    };
    this.lastSentStatus = {}; // Cache last sent status
    
    this.connectionAttempts = new Map();
    
    console.log('WebSocket Server initialized');
  }

  async initialize() {
    if (!this.wss) return; // Don't initialize if WebSocket is unavailable
    await this.marketData.initialize();
    this.setupWebSocketServer();
    this.startMarketDataService();
  }

  setupWebSocketServer() {
    if (!this.wss) return; 
    this.wss.on('connection', (ws, req) => {
      const clientId = req.headers['sec-websocket-key'] || uuid.v4();
      const ip = req.socket.remoteAddress;
      
      console.log(`[WebSocket] Client connected: ${clientId} from ${ip}`);
      
      this.clients.set(clientId, { ws, subscriptions: new Set(['ALL']), lastActivity: Date.now(), ip }); // Subscribe all clients to ALL by default for simplicity
      this.resetConnectionAttempts(clientId);
      this.sendInitialDataToClient(ws); // Send initial data

      ws.on('message', (message) => this.handleClientMessage(clientId, message));
      
      ws.on('close', () => {
        console.log(`[WebSocket] Client disconnected: ${clientId}`);
        this.clients.delete(clientId);
      });
      
      ws.on('error', (error) => {
        console.error(`[WebSocket] Error with client ${clientId}:`, error);
      });
      
      // Ping to keep connection alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        } else {
          clearInterval(pingInterval);
        }
      }, 30000);
    });

    this.wss.on('error', (error) => {
      console.error('[WebSocket] Server error:', error);
    });

    console.log('[WebSocket] WebSocket server setup complete');
  }
  
  resetConnectionAttempts(clientId) {
    this.connectionAttempts.set(clientId, {
      count: 0,
      lastAttempt: Date.now()
    });
  }
  
  sendInitialDataToClient(ws) {
    console.log('[WebSocket] Sending initial data to new client...');
    // Send market status first
    if (this.lastSentStatus) {
      this.sendToClient(ws, {
        type: 'market_status',
        data: this.lastSentStatus // Send cached status
      });
    }
    
    // Send last known data as individual updates
    this.lastSentData.US.forEach(update => {
      this.sendToClient(ws, { type: 'marketUpdate', data: update });
    });
    this.lastSentData.IN.forEach(update => {
      this.sendToClient(ws, { type: 'marketUpdate', data: update });
    });
    
    console.log(`[WebSocket] Sent initial status and ${this.lastSentData.US.length + this.lastSentData.IN.length} cached updates.`);
  }

  async startMarketDataService() {
    if (!this.wss || this.isServiceRunning) return; // Check wss availability
    this.isServiceRunning = true;
    if (this.dataRefreshInterval) clearInterval(this.dataRefreshInterval);
    
    // Initial fetch immediately
    await this.refreshAndBroadcastMarketData();
    await this.updateAndBroadcastMarketStatus();

    // Start regular data updates (longer interval, e.g., 60s)
    this.dataRefreshInterval = setInterval(async () => {
      await this.refreshAndBroadcastMarketData();
    }, 60000); // Fetch data every 60 seconds

    // Update market status periodically (e.g., every 5 mins)
    setInterval(async () => {
      await this.updateAndBroadcastMarketStatus();
    }, 5 * 60 * 1000); // Check status every 5 minutes
    
    console.log('[WebSocket] Market data service started');
  }

  async refreshAndBroadcastMarketData() {
    if (!this.wss) return; 
    try {
      console.log('[WebSocket] Refreshing market data...');
      // Fetch US market data
      const usData = await this.marketData.fetchUSMarketData();
      if (usData && usData.length > 0) {
        this.lastSentData.US = usData; // Update cache
        // Send individual updates
        usData.forEach(update => {
          this.broadcastToSubscribedClients('US', { type: 'marketUpdate', data: update });
        });
        console.log(`[WebSocket] Broadcasted ${usData.length} US updates.`);
      } else {
        console.log('[WebSocket] No new US data fetched or data was empty.');
      }
      
      // Fetch Indian market data
      const inData = await this.marketData.fetchIndianMarketData();
      if (inData && inData.length > 0) {
        this.lastSentData.IN = inData; // Update cache
        // Send individual updates
        inData.forEach(update => {
          this.broadcastToSubscribedClients('IN', { type: 'marketUpdate', data: update });
        });
        console.log(`[WebSocket] Broadcasted ${inData.length} IN updates.`);
      } else {
        console.log('[WebSocket] No new IN data fetched or data was empty.');
      }
    } catch (error) {
      console.error('[WebSocket] Error refreshing market data:', error);
    }
  }
  
  async updateAndBroadcastMarketStatus() {
    if (!this.wss) return; 
    try {
      const marketStatus = await this.marketData.updateMarketStatus();
      this.lastSentStatus = marketStatus; // Cache status
      this.broadcastToAll({
        type: 'market_status',
        data: marketStatus
      });
      console.log('[WebSocket] Broadcasted market status update.');
    } catch (error) {
      console.error('[WebSocket] Error updating market status:', error);
    }
  }

  // NEW Helper: Broadcasts a message to clients subscribed to a specific market or ALL
  broadcastToSubscribedClients(market, message) {
    if (!this.wss) return; 
    let subscribedClientsCount = 0;
    for (const [clientId, client] of this.clients) {
      // Check if client is subscribed to this specific market or 'ALL'
      if (client.subscriptions.has('ALL') || client.subscriptions.has(market)) {
        this.sendToClient(client.ws, message);
        subscribedClientsCount++;
      }
    }
    // Optional: Log count if needed, can be verbose
    // if (subscribedClientsCount > 0) {
    //     console.log(`[WebSocket] Sent message type ${message.type} for market ${market} to ${subscribedClientsCount} clients`);
    // }
  }
  
  sendToClient(ws, data) {
    if (!this.wss) return; 
    if (ws.readyState === WebSocket.OPEN) { // Use WebSocket.OPEN
      try {
        ws.send(JSON.stringify(data));
      } catch (error) {
        console.error('[WebSocket] Error sending data to client:', error);
      }
    }
  }

  broadcastToAll(message) {
    if (!this.wss) return; 
    let sentCount = 0;
    for (const [clientId, client] of this.clients) {
      this.sendToClient(client.ws, message);
      sentCount++;
    }
    // console.log(`[WebSocket] Broadcast message type ${message.type} to ${sentCount} clients`); // Can be verbose
  }

  // Simplified message handling for now, focusing on receiving data
  handleClientMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    client.lastActivity = Date.now();
    console.log(`[WebSocket] Received raw message from ${clientId}: ${message}`);
    // Currently, client doesn't send messages needing complex handling
    // We mainly broadcast from server to client.
    // Parsing can be added back if client needs to send commands like subscribe/unsubscribe
    /*
    try {
      const parsed = JSON.parse(message);
      console.log(`[WebSocket] Parsed message from ${clientId}:`, parsed);
      // Handle specific message types like subscribe, force_refresh etc.
      // switch (parsed.type) { ... }
    } catch (error) {
      console.error(`[WebSocket] Error handling message from client ${clientId}:`, message, error);
    }
    */
  }
  
  // --- Subscription handling (can be simplified if clients don't dynamically subscribe) ---
  /*
  handleSubscribe(clientId, markets) { ... }
  handleUnsubscribe(clientId, markets) { ... }
  */

  // --- Data request handling (client requests data - might not be needed if server pushes) ---
  /*
  handleGetMarketData(clientId, market) { ... }
  handleGetMarketStatus(clientId) { ... }
  sendLatestDataToClient(client) { ... }
  */

  // Add method to handle manual refresh requests from client if needed
  // handleForceRefresh(clientId) { ... }
} 