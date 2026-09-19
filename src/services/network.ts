// WebSocket based network manager for chat functionality

interface NetworkMessage {
  type: 'chat' | 'connect' | 'connected' | 'disconnect' | 'error' | 
        'player-joined' | 'player-left' | 'player-list' |
        'host-registered' | 'host-available' | 'host-disconnected' |
        'register-host' | 'player-join' | 'private-message' | 'player-private-message';
  content?: string;
  message?: string;
  timestamp: number;
  senderId?: string;
  clientId?: string;
  isHost?: boolean;
  senderName?: string;
  recipientId?: string;
  isPrivate?: boolean;
  players?: string[];
  targetPlayerId?: string;
}

type MessageCallback = (message: NetworkMessage) => void;
type ConnectionCallback = (connected: boolean, message: string) => void;

class NetworkManager {
  private ws: WebSocket | null = null;
  private connectionUrl: string | null = null;
  private localId: string = '';
  private isHost: boolean = false;
  private messageCallback: MessageCallback | null = null;
  private connectionCallback: ConnectionCallback | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isReconnecting: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private readonly DEFAULT_PORT = 8080;
  
  constructor() {
    // Generate a random client ID
    this.localId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
  }

  // Set the message callback
  public set message_callback(callback: MessageCallback | null) {
    this.messageCallback = callback;
  }

  // Set connection status callback
  public set connection_callback(callback: ConnectionCallback | null) {
    this.connectionCallback = callback;
  }

  // Get local client ID
  public get_local_id(): string {
    return this.localId;
  }

  // Method to clean up resources
  private cleanup(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onopen = null;
      this.ws.close();
      this.ws = null;
    }
    this.isReconnecting = false;
  }

  // Attempt to establish a WebSocket connection
  private attemptConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.connectionUrl) {
        reject(new Error('No connection URL set'));
        return;
      }

      if (this.isReconnecting) {
        reject(new Error('Already attempting to reconnect'));
        return;
      }

      this.cleanup();
      
      try {
        console.log(`[Network] Attempting to connect to: ${this.connectionUrl}`);
        this.ws = new WebSocket(this.connectionUrl);
        
        this.ws.onopen = () => {
          console.log('[Network] WebSocket connected successfully');
          this.reconnectAttempts = 0;
          this.isReconnecting = false;
          
          // If this is a player (not host), send player-join message with username
          if (!this.isHost && this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
              type: 'player-join',
              clientId: this.localId,
              username: this.username,
              timestamp: Date.now()
            }));
          }
          
          this.connectionCallback?.(true, 'Connected to server');
          resolve();
        };
        
        this.ws.onclose = (event) => {
          console.log(`[Network] WebSocket disconnected: ${event.code} ${event.reason}`);
          this.connectionCallback?.(false, `Disconnected: ${event.reason || 'Connection closed'}`);
          if (!this.isReconnecting) {
            this.scheduleReconnect();
          }
        };
        
        this.ws.onerror = (error) => {
          console.error('[Network] WebSocket error:', error);
          this.connectionCallback?.(false, 'Connection error occurred');
          reject(error);
        };
        
        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as NetworkMessage;
            console.log('[Network] Received message:', message);
            
            // Handle connection established message
            if (message.type === 'connected') {
              console.log('[Network] Server connection confirmed');
              this.localId = message.clientId || this.localId;
              
              // If this is a host, register after connection
              if (this.isHost && this.ws?.readyState === WebSocket.OPEN) {
                console.log('[Network] Registering as host...');
                this.ws.send(JSON.stringify({
                  type: 'register-host',
                  clientId: this.localId,
                  timestamp: Date.now()
                }));
              }
            }
            
            this.messageCallback?.(message);
          } catch (error) {
            console.error('[Network] Error processing message:', error, event.data);
          }
        };

        // Set a connection timeout
        setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            console.error('[Network] Connection timeout');
            reject(new Error('Connection timeout'));
            this.cleanup();
          }
        }, 10000); // 10 second timeout

      } catch (error) {
        console.error('[Network] Connection failed:', error);
        this.connectionCallback?.(false, 'Failed to connect to server');
        this.scheduleReconnect();
        reject(error);
      }
    });
  }

  // Schedule a reconnection attempt
  private scheduleReconnect(): void {
    if (this.isReconnecting || this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[Network] Max reconnection attempts reached or already reconnecting');
      return;
    }
    
    this.isReconnecting = true;
    this.reconnectAttempts++;
    
    // Exponential backoff: 1s, 2s, 4s, 8s, etc.
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    console.log(`[Network] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      if (this.connectionUrl) {
        this.attemptConnection()
          .catch(error => {
            console.error('[Network] Reconnection failed:', error);
          })
          .finally(() => {
            this.isReconnecting = false;
          });
      }
    }, delay);
  }

  private username: string = '';

  // Set the username for the player
  public set_username(username: string) {
    this.username = username;
  }

  // Connect to a host (for players)
  public async connect_to_host(url: string): Promise<void> {
    this.isHost = false;
    let finalUrl = this.normalizeWebSocketUrl(url, this.DEFAULT_PORT);
    this.connectionUrl = finalUrl;
    
    console.log(`[Network] Connecting to host at ${finalUrl}`);
    return this.attemptConnection();
  }
  
  // Connect as host`
  public async connect_as_host(port: number = 8080): Promise<void> {
    this.isHost = true;
    this.connectionUrl = import.meta.env.VITE_WS_URL || `ws://${window.location.hostname}:${port}`;
    
    console.log(`[Network] Starting as host at ${this.connectionUrl}`);
    return this.attemptConnection();
  }
  
  // Normalize WebSocket URL
  private normalizeWebSocketUrl(url: string, defaultPort: number): string {
    let finalUrl = url.trim();
    
    // Ensure URL has protocol
    if (!finalUrl.startsWith('ws://') && !finalUrl.startsWith('wss://')) {
      finalUrl = `ws://${finalUrl}`;
    }
    
    // Parse URL to handle port
    const urlObj = new URL(finalUrl);
    
    // If it's a secure websocket (wss), don't force a port unless specified
    if (urlObj.protocol === 'wss:' || urlObj.hostname !== 'localhost') {
       return urlObj.toString();
    }
    
    // For localhost testing, default to 8080
    if (!urlObj.port) {
      urlObj.port = defaultPort.toString();
    }
    
    return urlObj.toString();
  }

  // Start a server (for hosting) - KEEP THIS METHOD
  public async start_server(port: number = this.DEFAULT_PORT, success?: (id: string) => void): Promise<void> {
    this.connectionUrl = `ws://${window.location.hostname}:${port}`;
    this.isHost = true;
    
    console.log(`[Network] Starting server on: ${this.connectionUrl}`);
    
    try {
      await this.attemptConnection();
      console.log('[Network] Server connection established');
      success?.(this.localId);
    } catch (error) {
      console.error('[Network] Failed to start server:', error);
      throw error;
    }
  }

  // Disconnect from the server - KEEP THIS METHOD
  public disconnect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const disconnectMsg: NetworkMessage = {
        type: 'disconnect',
        content: 'Client disconnecting',
        timestamp: Date.now(),
        senderId: this.localId
      };
      this.ws.send(JSON.stringify(disconnectMsg));
    }
    this.cleanup();
    this.connectionCallback?.(false, 'Disconnected by user');
  }

  // Send a chat message - KEEP THIS METHOD
  public send_chat_message(content: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[Network] Cannot send message: WebSocket not connected');
      this.connectionCallback?.(false, 'Not connected to server');
      return;
    }
    
    const message: NetworkMessage = {
      type: 'chat',
      content,
      timestamp: Date.now(),
      senderId: this.localId
    };
    
    console.log('[Network] Sending message:', message);
    this.ws.send(JSON.stringify(message));
  }

  // Send a private message to the host
  public send_private_message_to_host(content: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[Network] Cannot send private message to host: WebSocket not connected');
      return;
    }
    
    const message: NetworkMessage = {
      type: 'player-private-message',
      content,
      timestamp: Date.now(),
      senderId: this.localId
    };
    
    console.log('[Network] Sending private message to host:', message);
    this.ws.send(JSON.stringify(message));
  }

  // Send a private message to a specific player (host only)
  public send_private_message_to_player(targetPlayerId: string, content: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('[Network] Cannot send private message: WebSocket not connected');
      return;
    }
    
    const message: NetworkMessage = {
      type: 'private-message',
      targetPlayerId: targetPlayerId,
      content,
      timestamp: Date.now(),
      senderId: this.localId
    };
    
    console.log(`[Network] Sending private message to ${targetPlayerId}:`, message);
    this.ws.send(JSON.stringify(message));
  }

  // Check if connected
  public is_connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Get connection URL
  public get_connection_url(): string | null {
    return this.connectionUrl;
  }
}

// Create a singleton instance
export const network_manager = new NetworkManager();