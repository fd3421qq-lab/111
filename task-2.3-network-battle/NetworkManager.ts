/**
 * NetworkManager.ts
 * Core network communication system using WebSocket
 * Handles real-time PVP battle communication
 */

import { Position } from './GridSystem';

/**
 * Network message types
 */
export enum NetworkMessageType {
  // Connection
  CONNECT = 'CONNECT',
  DISCONNECT = 'DISCONNECT',
  
  // Room management
  CREATE_ROOM = 'CREATE_ROOM',
  JOIN_ROOM = 'JOIN_ROOM',
  LEAVE_ROOM = 'LEAVE_ROOM',
  ROOM_CREATED = 'ROOM_CREATED',
  ROOM_JOINED = 'ROOM_JOINED',
  ROOM_FULL = 'ROOM_FULL',
  ROOM_NOT_FOUND = 'ROOM_NOT_FOUND',
  
  // Game actions
  MOVE = 'MOVE',
  STATE_SYNC = 'STATE_SYNC',
  EVENT = 'EVENT',
  GAME_START = 'GAME_START',
  GAME_END = 'GAME_END',
  
  // Chat
  CHAT = 'CHAT',
  
  // System
  PING = 'PING',
  PONG = 'PONG',
  ERROR = 'ERROR'
}

/**
 * Network message interface
 */
export interface NetworkMessage {
  type: NetworkMessageType;
  data: any;
  timestamp: number;
  playerId: string;
  messageId?: string;
}

/**
 * Move data structure
 */
export interface MoveData {
  pos1: Position;
  pos2: Position;
  moveNumber: number;
}

/**
 * Game state sync data
 */
export interface StateSyncData {
  playerGrid: any[][];
  opponentGrid: any[][];
  playerScore: number;
  opponentScore: number;
  playerMoves: number;
  opponentMoves: number;
  eventProgress: number;
  activeEvents: string[];
  currentTurn: string;
}

/**
 * Connection state
 */
export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR'
}

/**
 * Network configuration
 */
export interface NetworkConfig {
  serverUrl: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  pingInterval?: number;
  timeout?: number;
  compression?: boolean;
  encryption?: boolean;
}

/**
 * NetworkManager class
 * Handles all WebSocket communication for real-time PVP battles
 */
export class NetworkManager {
  private ws: WebSocket | null = null;
  private config: NetworkConfig;
  private playerId: string;
  private roomId: string | null = null;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private messageHandlers: Map<NetworkMessageType, ((msg: NetworkMessage) => void)[]> = new Map();
  private reconnectAttempts = 0;
  private pingIntervalId: number | null = null;
  private latency = 0;
  private lastPingTime = 0;
  private messageQueue: NetworkMessage[] = [];
  private pendingMessages: Map<string, NetworkMessage> = new Map();

  constructor(config: NetworkConfig) {
    this.config = {
      reconnectAttempts: 5,
      reconnectDelay: 2000,
      pingInterval: 5000,
      timeout: 10000,
      compression: true,
      encryption: false,
      ...config
    };
    this.playerId = this.generatePlayerId();
  }

  /**
   * Connect to WebSocket server
   */
  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connectionState === ConnectionState.CONNECTED) {
        resolve();
        return;
      }

      this.connectionState = ConnectionState.CONNECTING;
      
      try {
        this.ws = new WebSocket(this.config.serverUrl);

        this.ws.onopen = () => {
          console.log('[NetworkManager] Connected to server');
          this.connectionState = ConnectionState.CONNECTED;
          this.reconnectAttempts = 0;
          this.startPingLoop();
          this.flushMessageQueue();
          
          // Send connection message
          this.send({
            type: NetworkMessageType.CONNECT,
            data: { playerId: this.playerId },
            timestamp: Date.now(),
            playerId: this.playerId
          });

          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('[NetworkManager] WebSocket error:', error);
          this.connectionState = ConnectionState.ERROR;
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[NetworkManager] Connection closed');
          this.handleDisconnect();
        };

        // Timeout handler
        setTimeout(() => {
          if (this.connectionState === ConnectionState.CONNECTING) {
            reject(new Error('Connection timeout'));
            this.ws?.close();
          }
        }, this.config.timeout);

      } catch (error) {
        this.connectionState = ConnectionState.ERROR;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from server
   */
  public disconnect(): void {
    if (this.ws) {
      this.send({
        type: NetworkMessageType.DISCONNECT,
        data: { playerId: this.playerId },
        timestamp: Date.now(),
        playerId: this.playerId
      });
      
      this.stopPingLoop();
      this.ws.close();
      this.ws = null;
      this.connectionState = ConnectionState.DISCONNECTED;
    }
  }

  /**
   * Create a new battle room
   */
  public async createRoom(): Promise<string> {
    return new Promise((resolve, reject) => {
      const messageId = this.generateMessageId();
      
      // Listen for room created response
      const handler = (msg: NetworkMessage) => {
        if (msg.messageId === messageId) {
          this.roomId = msg.data.roomId;
          this.off(NetworkMessageType.ROOM_CREATED, handler);
          resolve(msg.data.roomId);
        }
      };
      
      this.on(NetworkMessageType.ROOM_CREATED, handler);
      
      this.send({
        type: NetworkMessageType.CREATE_ROOM,
        data: { playerId: this.playerId },
        timestamp: Date.now(),
        playerId: this.playerId,
        messageId
      });

      // Timeout
      setTimeout(() => {
        this.off(NetworkMessageType.ROOM_CREATED, handler);
        reject(new Error('Create room timeout'));
      }, this.config.timeout);
    });
  }

  /**
   * Join an existing battle room
   */
  public async joinRoom(roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const messageId = this.generateMessageId();
      
      // Listen for room joined response
      const successHandler = (msg: NetworkMessage) => {
        if (msg.messageId === messageId) {
          this.roomId = roomId;
          this.off(NetworkMessageType.ROOM_JOINED, successHandler);
          this.off(NetworkMessageType.ROOM_NOT_FOUND, errorHandler);
          this.off(NetworkMessageType.ROOM_FULL, fullHandler);
          resolve();
        }
      };

      const errorHandler = (msg: NetworkMessage) => {
        if (msg.messageId === messageId) {
          this.off(NetworkMessageType.ROOM_JOINED, successHandler);
          this.off(NetworkMessageType.ROOM_NOT_FOUND, errorHandler);
          this.off(NetworkMessageType.ROOM_FULL, fullHandler);
          reject(new Error('Room not found'));
        }
      };

      const fullHandler = (msg: NetworkMessage) => {
        if (msg.messageId === messageId) {
          this.off(NetworkMessageType.ROOM_JOINED, successHandler);
          this.off(NetworkMessageType.ROOM_NOT_FOUND, errorHandler);
          this.off(NetworkMessageType.ROOM_FULL, fullHandler);
          reject(new Error('Room is full'));
        }
      };
      
      this.on(NetworkMessageType.ROOM_JOINED, successHandler);
      this.on(NetworkMessageType.ROOM_NOT_FOUND, errorHandler);
      this.on(NetworkMessageType.ROOM_FULL, fullHandler);
      
      this.send({
        type: NetworkMessageType.JOIN_ROOM,
        data: { roomId, playerId: this.playerId },
        timestamp: Date.now(),
        playerId: this.playerId,
        messageId
      });

      // Timeout
      setTimeout(() => {
        this.off(NetworkMessageType.ROOM_JOINED, successHandler);
        this.off(NetworkMessageType.ROOM_NOT_FOUND, errorHandler);
        this.off(NetworkMessageType.ROOM_FULL, fullHandler);
        reject(new Error('Join room timeout'));
      }, this.config.timeout);
    });
  }

  /**
   * Leave current room
   */
  public leaveRoom(): void {
    if (this.roomId) {
      this.send({
        type: NetworkMessageType.LEAVE_ROOM,
        data: { roomId: this.roomId, playerId: this.playerId },
        timestamp: Date.now(),
        playerId: this.playerId
      });
      this.roomId = null;
    }
  }

  /**
   * Send a move to opponent
   */
  public sendMove(move: MoveData): void {
    if (!this.roomId) {
      throw new Error('Not in a room');
    }

    this.send({
      type: NetworkMessageType.MOVE,
      data: { move, roomId: this.roomId },
      timestamp: Date.now(),
      playerId: this.playerId
    });
  }

  /**
   * Send state sync data
   */
  public sendStateSync(state: StateSyncData): void {
    if (!this.roomId) {
      throw new Error('Not in a room');
    }

    this.send({
      type: NetworkMessageType.STATE_SYNC,
      data: { state, roomId: this.roomId },
      timestamp: Date.now(),
      playerId: this.playerId
    });
  }

  /**
   * Send chat message
   */
  public sendChat(message: string): void {
    if (!this.roomId) {
      throw new Error('Not in a room');
    }

    this.send({
      type: NetworkMessageType.CHAT,
      data: { message, roomId: this.roomId },
      timestamp: Date.now(),
      playerId: this.playerId
    });
  }

  /**
   * Register message handler
   */
  public on(type: NetworkMessageType, handler: (msg: NetworkMessage) => void): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);
  }

  /**
   * Unregister message handler
   */
  public off(type: NetworkMessageType, handler: (msg: NetworkMessage) => void): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Register generic message handler (for all types)
   */
  public onMessage(callback: (msg: NetworkMessage) => void): void {
    this.on(NetworkMessageType.MOVE, callback);
    this.on(NetworkMessageType.STATE_SYNC, callback);
    this.on(NetworkMessageType.EVENT, callback);
    this.on(NetworkMessageType.CHAT, callback);
  }

  /**
   * Get current connection state
   */
  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Get current latency
   */
  public getLatency(): number {
    return this.latency;
  }

  /**
   * Get player ID
   */
  public getPlayerId(): string {
    return this.playerId;
  }

  /**
   * Get current room ID
   */
  public getRoomId(): string | null {
    return this.roomId;
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.connectionState === ConnectionState.CONNECTED && this.ws?.readyState === WebSocket.OPEN;
  }

  // Private methods

  /**
   * Send message to server
   */
  private send(message: NetworkMessage): void {
    if (!this.isConnected()) {
      // Queue message for later
      this.messageQueue.push(message);
      return;
    }

    try {
      const data = this.serializeMessage(message);
      this.ws!.send(data);

      // Track pending message for acknowledgment
      if (message.messageId) {
        this.pendingMessages.set(message.messageId, message);
      }
    } catch (error) {
      console.error('[NetworkManager] Send error:', error);
      this.messageQueue.push(message);
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: string): void {
    try {
      const message: NetworkMessage = this.deserializeMessage(data);

      // Handle ping/pong
      if (message.type === NetworkMessageType.PING) {
        this.send({
          type: NetworkMessageType.PONG,
          data: message.data,
          timestamp: Date.now(),
          playerId: this.playerId
        });
        return;
      }

      if (message.type === NetworkMessageType.PONG) {
        this.latency = Date.now() - this.lastPingTime;
        return;
      }

      // Remove from pending messages
      if (message.messageId) {
        this.pendingMessages.delete(message.messageId);
      }

      // Dispatch to handlers
      const handlers = this.messageHandlers.get(message.type);
      if (handlers) {
        handlers.forEach(handler => handler(message));
      }

    } catch (error) {
      console.error('[NetworkManager] Message handling error:', error);
    }
  }

  /**
   * Handle disconnect
   */
  private handleDisconnect(): void {
    this.connectionState = ConnectionState.DISCONNECTED;
    this.stopPingLoop();

    // Attempt reconnection
    if (this.reconnectAttempts < this.config.reconnectAttempts!) {
      this.reconnect();
    }
  }

  /**
   * Reconnect to server
   */
  private async reconnect(): Promise<void> {
    this.connectionState = ConnectionState.RECONNECTING;
    this.reconnectAttempts++;

    console.log(`[NetworkManager] Reconnecting (attempt ${this.reconnectAttempts}/${this.config.reconnectAttempts})...`);

    setTimeout(async () => {
      try {
        await this.connect();
        console.log('[NetworkManager] Reconnected successfully');

        // Rejoin room if was in one
        if (this.roomId) {
          await this.joinRoom(this.roomId);
        }
      } catch (error) {
        console.error('[NetworkManager] Reconnect failed:', error);
        this.handleDisconnect();
      }
    }, this.config.reconnectDelay! * this.reconnectAttempts);
  }

  /**
   * Start ping loop
   */
  private startPingLoop(): void {
    this.pingIntervalId = window.setInterval(() => {
      if (this.isConnected()) {
        this.lastPingTime = Date.now();
        this.send({
          type: NetworkMessageType.PING,
          data: { timestamp: this.lastPingTime },
          timestamp: this.lastPingTime,
          playerId: this.playerId
        });
      }
    }, this.config.pingInterval!);
  }

  /**
   * Stop ping loop
   */
  private stopPingLoop(): void {
    if (this.pingIntervalId !== null) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
  }

  /**
   * Flush queued messages
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      this.send(message);
    }
  }

  /**
   * Serialize message for transmission
   */
  private serializeMessage(message: NetworkMessage): string {
    if (this.config.compression) {
      // Simple compression - in production use proper compression library
      return JSON.stringify(message);
    }
    return JSON.stringify(message);
  }

  /**
   * Deserialize received message
   */
  private deserializeMessage(data: string): NetworkMessage {
    return JSON.parse(data);
  }

  /**
   * Generate unique player ID
   */
  private generatePlayerId(): string {
    return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
