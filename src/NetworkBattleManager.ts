/**
 * NetworkBattleManager.ts
 * Integrates network system with BattleManager for complete PVP experience
 */

import { BattleManager, PlayerType, TurnResult } from './BattleManager';
import { NetworkManager, NetworkMessageType, NetworkMessage, MoveData, StateSyncData } from './NetworkManager';
import { MatchmakingSystem, MatchmakingMode } from './MatchmakingSystem';
import { ReconnectionManager, GameStateSnapshot } from './ReconnectionManager';
import { Position, CandyType } from './GridSystem';
import { GameEventType } from './GameEventType';

/**
 * Network battle configuration
 */
export interface NetworkBattleConfig {
  serverUrl: string;
  enableAutoSync?: boolean;
  syncInterval?: number;
  enableReconnection?: boolean;
  enableMatchmaking?: boolean;
}

/**
 * Network battle state
 */
export enum NetworkBattleState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  IN_LOBBY = 'IN_LOBBY',
  IN_ROOM = 'IN_ROOM',
  IN_BATTLE = 'IN_BATTLE',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR'
}

/**
 * Player role in network battle
 */
export enum NetworkPlayerRole {
  HOST = 'HOST',         // Room creator
  GUEST = 'GUEST',       // Room joiner
  UNKNOWN = 'UNKNOWN'
}

/**
 * NetworkBattleManager class
 * Manages complete PVP battle experience with network synchronization
 */
export class NetworkBattleManager {
  private battleManager: BattleManager;
  private networkManager: NetworkManager;
  private matchmakingSystem: MatchmakingSystem;
  private reconnectionManager: ReconnectionManager;
  
  private config: NetworkBattleConfig;
  private state: NetworkBattleState = NetworkBattleState.DISCONNECTED;
  private playerRole: NetworkPlayerRole = NetworkPlayerRole.UNKNOWN;
  private opponentId: string | null = null;
  private roomId: string | null = null;
  
  private syncIntervalId: number | null = null;
  private localMoveCount = 0;
  private remoteMoveCount = 0;
  
  // Event handlers
  private onStateChangeCallback: ((state: NetworkBattleState) => void) | null = null;
  private onOpponentMoveCallback: ((move: MoveData) => void) | null = null;
  private onBattleStartCallback: (() => void) | null = null;
  private onBattleEndCallback: ((winner: PlayerType) => void) | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;

  constructor(config: NetworkBattleConfig) {
    this.config = {
      enableAutoSync: true,
      syncInterval: 5000, // 5 seconds
      enableReconnection: true,
      enableMatchmaking: true,
      ...config
    };

    // Initialize network components
    this.networkManager = new NetworkManager({ 
      serverUrl: this.config.serverUrl 
    });
    
    this.matchmakingSystem = new MatchmakingSystem(this.networkManager);
    this.reconnectionManager = new ReconnectionManager(this.networkManager);

    // Initialize battle manager (without AI)
    this.battleManager = new BattleManager({
      enableAI: false
    });

    this.setupNetworkHandlers();
    this.setupReconnectionHandlers();
  }

  /**
   * Connect to server
   */
  public async connect(): Promise<void> {
    try {
      this.setState(NetworkBattleState.CONNECTING);
      await this.networkManager.connect();
      this.setState(NetworkBattleState.CONNECTED);
    } catch (error) {
      this.setState(NetworkBattleState.ERROR);
      const err = error as Error;
      this.handleError(new Error(`Failed to connect: ${err.message}`));
      throw error;
    }
  }

  /**
   * Disconnect from server
   */
  public disconnect(): void {
    this.stopAutoSync();
    this.networkManager.disconnect();
    this.setState(NetworkBattleState.DISCONNECTED);
  }

  /**
   * Create a new battle room
   */
  public async createRoom(): Promise<string> {
    try {
      this.ensureConnected();
      const roomId = await this.networkManager.createRoom();
      this.roomId = roomId;
      this.playerRole = NetworkPlayerRole.HOST;
      this.setState(NetworkBattleState.IN_ROOM);
      return roomId;
    } catch (error) {
      const err = error as Error;
      this.handleError(new Error(`Failed to create room: ${err.message}`));
      throw error;
    }
  }

  /**
   * Join an existing battle room
   */
  public async joinRoom(roomId: string): Promise<void> {
    try {
      this.ensureConnected();
      await this.networkManager.joinRoom(roomId);
      this.roomId = roomId;
      this.playerRole = NetworkPlayerRole.GUEST;
      this.setState(NetworkBattleState.IN_ROOM);
    } catch (error) {
      const err = error as Error;
      this.handleError(new Error(`Failed to join room: ${err.message}`));
      throw error;
    }
  }

  /**
   * Leave current room
   */
  public leaveRoom(): void {
    if (this.roomId) {
      this.stopAutoSync();
      this.networkManager.leaveRoom();
      this.roomId = null;
      this.opponentId = null;
      this.playerRole = NetworkPlayerRole.UNKNOWN;
      this.setState(NetworkBattleState.CONNECTED);
    }
  }

  /**
   * Find random opponent
   */
  public async findMatch(mode: MatchmakingMode = MatchmakingMode.RANDOM): Promise<void> {
    try {
      this.ensureConnected();
      const result = await this.matchmakingSystem.findMatch(mode);
      this.roomId = result.roomId;
      this.opponentId = result.opponentId;
      this.playerRole = NetworkPlayerRole.GUEST; // Matched players are guests
      this.setState(NetworkBattleState.IN_ROOM);
    } catch (error) {
      const err = error as Error;
      this.handleError(new Error(`Matchmaking failed: ${err.message}`));
      throw error;
    }
  }

  /**
   * Start battle (called when both players ready)
   */
  public startBattle(): void {
    if (this.state !== NetworkBattleState.IN_ROOM) {
      throw new Error('Cannot start battle: not in room');
    }

    this.setState(NetworkBattleState.IN_BATTLE);
    this.localMoveCount = 0;
    this.remoteMoveCount = 0;

    if (this.config.enableAutoSync) {
      this.startAutoSync();
    }

    if (this.onBattleStartCallback) {
      this.onBattleStartCallback();
    }
  }

  /**
   * Execute player move and sync with opponent
   */
  public async executeMove(pos1: Position, pos2: Position): Promise<TurnResult> {
    if (this.state !== NetworkBattleState.IN_BATTLE) {
      throw new Error('Cannot execute move: not in battle');
    }

    // Execute move locally
    const result = this.battleManager.playerTurn(pos1, pos2);

    // Send move to opponent
    if (result.success) {
      this.localMoveCount++;
      this.networkManager.sendMove({
        pos1,
        pos2,
        moveNumber: this.localMoveCount
      });

      // Save snapshot for reconnection
      this.saveGameSnapshot();
    }

    return result;
  }

  /**
   * Get current battle manager
   */
  public getBattleManager(): BattleManager {
    return this.battleManager;
  }

  /**
   * Get network manager
   */
  public getNetworkManager(): NetworkManager {
    return this.networkManager;
  }

  /**
   * Get current state
   */
  public getState(): NetworkBattleState {
    return this.state;
  }

  /**
   * Get player role
   */
  public getPlayerRole(): NetworkPlayerRole {
    return this.playerRole;
  }

  /**
   * Get opponent ID
   */
  public getOpponentId(): string | null {
    return this.opponentId;
  }

  /**
   * Get room ID
   */
  public getRoomId(): string | null {
    return this.roomId;
  }

  /**
   * Get network latency
   */
  public getLatency(): number {
    return this.networkManager.getLatency();
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.networkManager.isConnected();
  }

  /**
   * Check if in battle
   */
  public isInBattle(): boolean {
    return this.state === NetworkBattleState.IN_BATTLE;
  }

  // Event handlers setup

  /**
   * Register state change callback
   */
  public onStateChange(callback: (state: NetworkBattleState) => void): void {
    this.onStateChangeCallback = callback;
  }

  /**
   * Register opponent move callback
   */
  public onOpponentMove(callback: (move: MoveData) => void): void {
    this.onOpponentMoveCallback = callback;
  }

  /**
   * Register battle start callback
   */
  public onBattleStart(callback: () => void): void {
    this.onBattleStartCallback = callback;
  }

  /**
   * Register battle end callback
   */
  public onBattleEnd(callback: (winner: PlayerType) => void): void {
    this.onBattleEndCallback = callback;
  }

  /**
   * Register error callback
   */
  public onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  // Private methods

  /**
   * Setup network message handlers
   */
  private setupNetworkHandlers(): void {
    // Handle opponent moves
    this.networkManager.on(NetworkMessageType.MOVE, (msg: NetworkMessage) => {
      this.handleOpponentMove(msg);
    });

    // Handle state sync
    this.networkManager.on(NetworkMessageType.STATE_SYNC, (msg: NetworkMessage) => {
      this.handleStateSync(msg);
    });

    // Handle game start
    this.networkManager.on(NetworkMessageType.GAME_START, (msg: NetworkMessage) => {
      this.opponentId = msg.data.opponentId;
      this.startBattle();
    });

    // Handle game end
    this.networkManager.on(NetworkMessageType.GAME_END, (msg: NetworkMessage) => {
      this.handleGameEnd(msg);
    });

    // Handle room joined
    this.networkManager.on(NetworkMessageType.ROOM_JOINED, (msg: NetworkMessage) => {
      if (msg.data.opponentId) {
        this.opponentId = msg.data.opponentId;
        // Auto-start battle when opponent joins
        setTimeout(() => this.startBattle(), 1000);
      }
    });

    // Handle player disconnect
    this.networkManager.on(NetworkMessageType.DISCONNECT, (msg: NetworkMessage) => {
      if (msg.playerId === this.opponentId) {
        this.handleError(new Error('Opponent disconnected'));
      }
    });
  }

  /**
   * Setup reconnection handlers
   */
  private setupReconnectionHandlers(): void {
    if (!this.config.enableReconnection) return;

    this.reconnectionManager.onReconnect((snapshot) => {
      if (snapshot) {
        this.restoreGameState(snapshot);
      }
    });
  }

  /**
   * Handle opponent move
   */
  private handleOpponentMove(msg: NetworkMessage): void {
    if (this.state !== NetworkBattleState.IN_BATTLE) return;

    const move = msg.data.move as MoveData;
    this.remoteMoveCount++;

    // Execute opponent's move in battle manager
    // Note: In real implementation, need to switch to opponent's turn
    // For now, we'll just trigger the callback
    if (this.onOpponentMoveCallback) {
      this.onOpponentMoveCallback(move);
    }

    // Save snapshot
    this.saveGameSnapshot();
  }

  /**
   * Handle state sync
   */
  private handleStateSync(msg: NetworkMessage): void {
    const state = msg.data.state as StateSyncData;
    
    // Update local state based on sync data
    // This would require BattleManager to have state restoration methods
    console.log('[NetworkBattleManager] State sync received:', state);
  }

  /**
   * Handle game end
   */
  private handleGameEnd(msg: NetworkMessage): void {
    this.stopAutoSync();
    this.setState(NetworkBattleState.IN_ROOM);
    
    if (this.onBattleEndCallback) {
      const winner = msg.data.winner as PlayerType;
      this.onBattleEndCallback(winner);
    }
  }

  /**
   * Start auto state sync
   */
  private startAutoSync(): void {
    if (this.syncIntervalId) return;

    this.syncIntervalId = window.setInterval(() => {
      if (this.isInBattle()) {
        this.syncGameState();
      }
    }, this.config.syncInterval!);
  }

  /**
   * Stop auto state sync
   */
  private stopAutoSync(): void {
    if (this.syncIntervalId !== null) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
  }

  /**
   * Sync game state to opponent
   */
  private syncGameState(): void {
    const playerData = this.battleManager.getPlayerData();
    const opponentData = this.battleManager.getOpponentData();
    const eventBar = this.battleManager.getGameManager().getEventBar();

    const state: StateSyncData = {
      playerGrid: playerData.grid.getGrid(),
      opponentGrid: opponentData.grid.getGrid(),
      playerScore: playerData.score,
      opponentScore: opponentData.score,
      playerMoves: playerData.moves,
      opponentMoves: opponentData.moves,
      eventProgress: eventBar.getCurrentProgress(),
      activeEvents: [], // TODO: Track active events in GameManager
      currentTurn: this.battleManager.getCurrentTurn().toString()
    };

    this.networkManager.sendStateSync(state);
  }

  /**
   * Save game snapshot for reconnection
   */
  private saveGameSnapshot(): void {
    if (!this.config.enableReconnection || !this.roomId) return;

    const playerData = this.battleManager.getPlayerData();
    const opponentData = this.battleManager.getOpponentData();
    const eventBar = this.battleManager.getGameManager().getEventBar();

    const snapshot: GameStateSnapshot = {
      timestamp: Date.now(),
      roomId: this.roomId,
      playerId: this.networkManager.getPlayerId(),
      opponentId: this.opponentId || 'unknown',
      state: {
        playerGrid: playerData.grid.getGrid(),
        opponentGrid: opponentData.grid.getGrid(),
        playerScore: playerData.score,
        opponentScore: opponentData.score,
        playerMoves: playerData.moves,
        opponentMoves: opponentData.moves,
        eventProgress: eventBar.getCurrentProgress(),
        activeEvents: [], // TODO: Track active events in GameManager
        currentTurn: this.battleManager.getCurrentTurn().toString()
      },
      moveHistory: [], // TODO: Track move history
      lastSyncedMove: this.localMoveCount
    };

    this.reconnectionManager.saveSnapshot(snapshot);
  }

  /**
   * Restore game state from snapshot
   */
  private restoreGameState(snapshot: GameStateSnapshot): void {
    console.log('[NetworkBattleManager] Restoring game state from snapshot');
    
    this.roomId = snapshot.roomId;
    this.opponentId = snapshot.opponentId;
    this.localMoveCount = snapshot.lastSyncedMove;

    // Restore state in battle manager
    // This would require BattleManager to have restoration methods
    
    this.setState(NetworkBattleState.IN_BATTLE);
  }

  /**
   * Set state and notify callback
   */
  private setState(state: NetworkBattleState): void {
    this.state = state;
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(state);
    }
  }

  /**
   * Handle error
   */
  private handleError(error: Error): void {
    console.error('[NetworkBattleManager] Error:', error);
    if (this.onErrorCallback) {
      this.onErrorCallback(error);
    }
  }

  /**
   * Ensure connected to server
   */
  private ensureConnected(): void {
    if (!this.isConnected()) {
      throw new Error('Not connected to server');
    }
  }
}
