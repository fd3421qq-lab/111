/**
 * NetworkBattleManager.ts - Task 2.5
 * Complete network integration by extending BattleManager
 * Includes state synchronization, conflict resolution, and advanced features
 */

import { BattleManager, BattleConfig, PlayerType, TurnResult, PlayerData } from './BattleManager';
import { NetworkManager, NetworkMessageType, NetworkMessage, MoveData, StateSyncData } from './NetworkManager';
import { MatchmakingSystem, MatchmakingMode } from './MatchmakingSystem';
import { ReconnectionManager, GameStateSnapshot } from './ReconnectionManager';
import { StateSynchronizer, StateSnapshot, SyncMode } from './StateSynchronizer';
import { ConflictResolver, ResolutionStrategy, Conflict } from './ConflictResolver';
import { Position, CandyType } from './GridSystem';
import { GameEventType } from './GameEventType';

/**
 * Network battle configuration
 */
export interface NetworkBattleConfig extends BattleConfig {
  serverUrl: string;
  enableAutoSync?: boolean;
  syncInterval?: number;
  enableReconnection?: boolean;
  enableMatchmaking?: boolean;
  syncMode?: SyncMode;
  conflictStrategy?: ResolutionStrategy;
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
  HOST = 'HOST',
  GUEST = 'GUEST',
  SPECTATOR = 'SPECTATOR',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Network statistics
 */
export interface NetworkStats {
  latency: number;
  packetsSent: number;
  packetsReceived: number;
  syncCount: number;
  conflictCount: number;
  reconnections: number;
  uptime: number;
}

/**
 * Spectator data
 */
export interface SpectatorData {
  id: string;
  name: string;
  joinedAt: number;
}

/**
 * Replay frame
 */
export interface ReplayFrame {
  timestamp: number;
  playerId: string;
  move: MoveData;
  state: StateSnapshot;
}

/**
 * NetworkBattleManager class - Task 2.5
 * Extends BattleManager to add network synchronization capabilities
 */
export class NetworkBattleManager extends BattleManager {
  private networkManager: NetworkManager;
  private matchmakingSystem: MatchmakingSystem;
  private reconnectionManager: ReconnectionManager;
  private stateSynchronizer: StateSynchronizer;
  private conflictResolver: ConflictResolver;
  
  private networkConfig: NetworkBattleConfig;
  private networkState: NetworkBattleState = NetworkBattleState.DISCONNECTED;
  private playerRole: NetworkPlayerRole = NetworkPlayerRole.UNKNOWN;
  private opponentId: string | null = null;
  private roomId: string | null = null;
  
  private syncIntervalId: NodeJS.Timeout | null = null;
  private localMoveCount = 0;
  private remoteMoveCount = 0;
  
  // Spectator support
  private spectators: Map<string, SpectatorData> = new Map();
  private enableSpectating = false;
  
  // Replay support
  private replayFrames: ReplayFrame[] = [];
  private enableReplay = false;
  private maxReplayFrames = 1000;
  
  // Statistics
  private stats: NetworkStats = {
    latency: 0,
    packetsSent: 0,
    packetsReceived: 0,
    syncCount: 0,
    conflictCount: 0,
    reconnections: 0,
    uptime: 0
  };
  private startTime = 0;
  
  // Event handlers
  private onStateChangeCallback: ((state: NetworkBattleState) => void) | null = null;
  private onOpponentMoveCallback: ((move: MoveData) => void) | null = null;
  private onBattleStartCallback: (() => void) | null = null;
  private onBattleEndCallback: ((winner: PlayerType) => void) | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;
  private onConflictCallback: ((conflict: Conflict) => void) | null = null;
  private onSpectatorJoinCallback: ((spectator: SpectatorData) => void) | null = null;

  constructor(config: NetworkBattleConfig) {
    // Initialize parent BattleManager (disable AI for network play)
    super({
      ...config,
      enableAI: false
    });
    
    this.networkConfig = {
      enableAutoSync: true,
      syncInterval: 5000,
      enableReconnection: true,
      enableMatchmaking: true,
      syncMode: SyncMode.HYBRID,
      conflictStrategy: ResolutionStrategy.SERVER_AUTHORITATIVE,
      ...config
    };

    // Initialize network components
    this.networkManager = new NetworkManager({
      serverUrl: this.networkConfig.serverUrl
    });
    
    this.matchmakingSystem = new MatchmakingSystem(this.networkManager);
    this.reconnectionManager = new ReconnectionManager(this.networkManager);
    this.stateSynchronizer = new StateSynchronizer(this.networkConfig.syncMode);
    this.conflictResolver = new ConflictResolver(
      this.networkConfig.conflictStrategy,
      false // Client side
    );

    this.setupNetworkHandlers();
    this.setupReconnectionHandlers();
  }

  // ==================== Network Connection Methods ====================

  /**
   * Connect to server
   */
  public async connect(): Promise<void> {
    try {
      this.setState(NetworkBattleState.CONNECTING);
      await this.networkManager.connect();
      this.setState(NetworkBattleState.CONNECTED);
      this.startTime = Date.now();
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
   * Join room as spectator
   */
  public async joinAsSpectator(roomId: string): Promise<void> {
    try {
      this.ensureConnected();
      await this.networkManager.joinRoom(roomId);
      this.roomId = roomId;
      this.playerRole = NetworkPlayerRole.SPECTATOR;
      this.setState(NetworkBattleState.IN_ROOM);
    } catch (error) {
      const err = error as Error;
      this.handleError(new Error(`Failed to join as spectator: ${err.message}`));
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
      this.spectators.clear();
      this.setState(NetworkBattleState.CONNECTED);
    }
  }

  /**
   * Find match using matchmaking
   */
  public async findMatch(mode: MatchmakingMode = MatchmakingMode.RANDOM): Promise<void> {
    try {
      this.ensureConnected();
      const result = await this.matchmakingSystem.findMatch(mode);
      this.roomId = result.roomId;
      this.opponentId = result.opponentId;
      this.playerRole = NetworkPlayerRole.GUEST;
      this.setState(NetworkBattleState.IN_ROOM);
    } catch (error) {
      const err = error as Error;
      this.handleError(new Error(`Matchmaking failed: ${err.message}`));
      throw error;
    }
  }

  // ==================== Battle Execution Methods ====================

  /**
   * Override: Start battle with network synchronization
   */
  public override startBattle(): void {
    super.startBattle();
    
    this.setState(NetworkBattleState.IN_BATTLE);
    this.localMoveCount = 0;
    this.remoteMoveCount = 0;
    this.replayFrames = [];

    if (this.networkConfig.enableAutoSync) {
      this.startAutoSync();
    }

    if (this.onBattleStartCallback) {
      this.onBattleStartCallback();
    }
  }

  /**
   * Override: Execute player turn with network sync
   */
  public override playerTurn(pos1: Position, pos2: Position): TurnResult {
    if (this.playerRole === NetworkPlayerRole.SPECTATOR) {
      return {
        success: false,
        message: 'Spectators cannot make moves'
      };
    }
    
    // Execute move locally
    const result = super.playerTurn(pos1, pos2);

    // Send move to opponent if successful
    if (result.success) {
      this.localMoveCount++;
      this.stats.packetsSent++;
      
      const move: MoveData = {
        pos1,
        pos2,
        moveNumber: this.localMoveCount
      };
      
      this.networkManager.sendMove(move);
      this.saveGameSnapshot();
      
      // Record for replay
      if (this.enableReplay) {
        this.recordReplayFrame(move);
      }
    }

    return result;
  }

  /**
   * Handle network move from opponent
   */
  public async handleNetworkMove(move: MoveData): Promise<boolean> {
    try {
      if (this.networkState !== NetworkBattleState.IN_BATTLE) {
        return false;
      }

      this.remoteMoveCount++;
      this.stats.packetsReceived++;

      // Execute opponent's move
      const result = super.opponentTurn(move.pos1, move.pos2);

      // Record for replay
      if (this.enableReplay && result.success) {
        this.recordReplayFrame(move);
      }

      // Trigger callback
      if (this.onOpponentMoveCallback) {
        this.onOpponentMoveCallback(move);
      }

      // Save snapshot
      this.saveGameSnapshot();

      return result.success;
    } catch (error) {
      const err = error as Error;
      this.handleError(new Error(`Failed to handle network move: ${err.message}`));
      return false;
    }
  }

  /**
   * Sync game state with opponent
   */
  public syncGameState(state: StateSyncData): void {
    try {
      const playerData = this.getPlayerData();
      const opponentData = this.getOpponentData();
      const eventBar = this.getGameManager().getEventBar();

      // Create snapshot
      const snapshot = this.stateSynchronizer.createSnapshot(
        playerData.grid.getGrid(),
        opponentData.grid.getGrid(),
        playerData.score,
        opponentData.score,
        playerData.moves,
        opponentData.moves,
        eventBar.getCurrentProgress(),
        [], // Active events
        this.getCurrentTurn().toString()
      );

      // Prepare sync data
      const syncData = this.stateSynchronizer.prepareSyncData();
      if (syncData) {
        this.networkManager.sendStateSync(state);
        this.stats.syncCount++;
      }
    } catch (error) {
      const err = error as Error;
      console.error('[NetworkBattleManager] State sync error:', err.message);
    }
  }

  /**
   * Handle reconnection
   */
  public async handleReconnection(): Promise<void> {
    try {
      this.setState(NetworkBattleState.RECONNECTING);
      this.stats.reconnections++;

      // Attempt to recover state
      const snapshot = await this.reconnectionManager.recoverGameState();
      
      if (snapshot) {
        this.restoreGameState(snapshot);
        this.setState(NetworkBattleState.IN_BATTLE);
      } else {
        // Could not recover, go to lobby
        this.setState(NetworkBattleState.IN_LOBBY);
      }
    } catch (error) {
      const err = error as Error;
      this.handleError(new Error(`Reconnection failed: ${err.message}`));
      this.setState(NetworkBattleState.ERROR);
    }
  }

  // ==================== Spectator & Replay Methods ====================

  /**
   * Enable spectating mode
   */
  public enableSpectatorMode(enable: boolean): void {
    this.enableSpectating = enable;
  }

  /**
   * Get spectators list
   */
  public getSpectators(): SpectatorData[] {
    return Array.from(this.spectators.values());
  }

  /**
   * Enable replay recording
   */
  public enableReplayRecording(enable: boolean): void {
    this.enableReplay = enable;
  }

  /**
   * Get replay frames
   */
  public getReplayFrames(): ReplayFrame[] {
    return [...this.replayFrames];
  }

  /**
   * Clear replay frames
   */
  public clearReplay(): void {
    this.replayFrames = [];
  }

  /**
   * Export replay data
   */
  public exportReplay(): string {
    return JSON.stringify({
      version: '1.0',
      roomId: this.roomId,
      players: {
        player: this.getPlayerData().id,
        opponent: this.opponentId
      },
      frames: this.replayFrames,
      startTime: this.startTime,
      endTime: Date.now()
    }, null, 2);
  }

  // ==================== Statistics Methods ====================

  /**
   * Get network statistics
   */
  public getNetworkStats(): NetworkStats {
    this.stats.latency = this.networkManager.getLatency();
    this.stats.uptime = this.startTime > 0 ? Date.now() - this.startTime : 0;
    return { ...this.stats };
  }

  /**
   * Get synchronization statistics
   */
  public getSyncStats() {
    return this.stateSynchronizer.getStats();
  }

  /**
   * Get conflict statistics
   */
  public getConflictStats() {
    return this.conflictResolver.getStats();
  }

  // ==================== Getters ====================

  public getNetworkState(): NetworkBattleState {
    return this.networkState;
  }

  public getPlayerRole(): NetworkPlayerRole {
    return this.playerRole;
  }

  public getOpponentId(): string | null {
    return this.opponentId;
  }

  public getRoomId(): string | null {
    return this.roomId;
  }

  public getLatency(): number {
    return this.networkManager.getLatency();
  }

  public isConnected(): boolean {
    return this.networkManager.isConnected();
  }

  public isInBattle(): boolean {
    return this.networkState === NetworkBattleState.IN_BATTLE;
  }

  public getNetworkManager(): NetworkManager {
    return this.networkManager;
  }

  // ==================== Event Handlers ====================

  public onStateChange(callback: (state: NetworkBattleState) => void): void {
    this.onStateChangeCallback = callback;
  }

  public onOpponentMove(callback: (move: MoveData) => void): void {
    this.onOpponentMoveCallback = callback;
  }

  public onBattleStart(callback: () => void): void {
    this.onBattleStartCallback = callback;
  }

  public onBattleEnd(callback: (winner: PlayerType) => void): void {
    this.onBattleEndCallback = callback;
  }

  public onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  public onConflict(callback: (conflict: Conflict) => void): void {
    this.onConflictCallback = callback;
  }

  public onSpectatorJoin(callback: (spectator: SpectatorData) => void): void {
    this.onSpectatorJoinCallback = callback;
  }

  // ==================== Private Methods ====================

  /**
   * Setup network message handlers
   */
  private setupNetworkHandlers(): void {
    this.networkManager.on(NetworkMessageType.MOVE, (msg: NetworkMessage) => {
      this.handleOpponentMove(msg);
    });

    this.networkManager.on(NetworkMessageType.STATE_SYNC, (msg: NetworkMessage) => {
      this.handleStateSync(msg);
    });

    this.networkManager.on(NetworkMessageType.GAME_START, (msg: NetworkMessage) => {
      this.opponentId = msg.data.opponentId;
      this.startBattle();
    });

    this.networkManager.on(NetworkMessageType.GAME_END, (msg: NetworkMessage) => {
      this.handleGameEnd(msg);
    });

    this.networkManager.on(NetworkMessageType.ROOM_JOINED, (msg: NetworkMessage) => {
      if (msg.data.opponentId) {
        this.opponentId = msg.data.opponentId;
        setTimeout(() => this.startBattle(), 1000);
      }
    });

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
    if (!this.networkConfig.enableReconnection) return;

    this.reconnectionManager.onReconnect((snapshot) => {
      if (snapshot) {
        this.restoreGameState(snapshot);
      }
    });
  }

  /**
   * Handle opponent move message
   */
  private handleOpponentMove(msg: NetworkMessage): void {
    if (this.networkState !== NetworkBattleState.IN_BATTLE) return;

    const move = msg.data.move as MoveData;
    this.handleNetworkMove(move);
  }

  /**
   * Handle state sync message
   */
  private handleStateSync(msg: NetworkMessage): void {
    const remoteState = msg.data.state as StateSnapshot;
    const localSnapshot = this.stateSynchronizer.getCurrentSnapshot();

    if (!localSnapshot) {
      console.log('[NetworkBattleManager] No local snapshot, accepting remote state');
      return;
    }

    // Detect conflicts
    const conflict = this.conflictResolver.detectConflict(localSnapshot, remoteState);
    
    if (conflict) {
      this.stats.conflictCount++;
      
      if (this.onConflictCallback) {
        this.onConflictCallback(conflict);
      }

      // Resolve conflict
      const resolution = this.conflictResolver.resolveConflict(
        conflict,
        localSnapshot,
        remoteState
      );

      if (resolution.success) {
        console.log('[NetworkBattleManager] Conflict resolved:', resolution.message);
        
        if (resolution.rollbackRequired) {
          // Apply resolved state
          this.applyResolvedState(resolution.resolvedState);
        }
      } else {
        console.error('[NetworkBattleManager] Failed to resolve conflict:', resolution.message);
      }
    }
  }

  /**
   * Handle game end message
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

    this.syncIntervalId = setInterval(() => {
      if (this.isInBattle()) {
        const playerData = this.getPlayerData();
        const opponentData = this.getOpponentData();
        const eventBar = this.getGameManager().getEventBar();

        const state: StateSyncData = {
          playerGrid: playerData.grid.getGrid(),
          opponentGrid: opponentData.grid.getGrid(),
          playerScore: playerData.score,
          opponentScore: opponentData.score,
          playerMoves: playerData.moves,
          opponentMoves: opponentData.moves,
          eventProgress: eventBar.getCurrentProgress(),
          activeEvents: [],
          currentTurn: this.getCurrentTurn().toString()
        };

        this.syncGameState(state);
      }
    }, this.networkConfig.syncInterval!);
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
   * Save game snapshot
   */
  private saveGameSnapshot(): void {
    if (!this.networkConfig.enableReconnection || !this.roomId) return;

    const playerData = this.getPlayerData();
    const opponentData = this.getOpponentData();
    const eventBar = this.getGameManager().getEventBar();

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
        activeEvents: [],
        currentTurn: this.getCurrentTurn().toString()
      },
      moveHistory: [],
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

    // TODO: Implement state restoration in BattleManager
    // This would require adding restoration methods to parent class
    
    this.setState(NetworkBattleState.IN_BATTLE);
  }

  /**
   * Apply resolved state after conflict
   */
  private applyResolvedState(state: StateSnapshot): void {
    console.log('[NetworkBattleManager] Applying resolved state');
    
    // TODO: Implement state application
    // This would update all game state based on resolved snapshot
  }

  /**
   * Record replay frame
   */
  private recordReplayFrame(move: MoveData): void {
    if (!this.enableReplay) return;

    const playerData = this.getPlayerData();
    const opponentData = this.getOpponentData();
    const eventBar = this.getGameManager().getEventBar();

    const frame: ReplayFrame = {
      timestamp: Date.now(),
      playerId: this.networkManager.getPlayerId(),
      move,
      state: {
        timestamp: Date.now(),
        version: this.localMoveCount + this.remoteMoveCount,
        playerGrid: playerData.grid.getGrid(),
        opponentGrid: opponentData.grid.getGrid(),
        playerScore: playerData.score,
        opponentScore: opponentData.score,
        playerMoves: playerData.moves,
        opponentMoves: opponentData.moves,
        eventProgress: eventBar.getCurrentProgress(),
        activeEvents: [],
        currentTurn: this.getCurrentTurn().toString()
      }
    };

    this.replayFrames.push(frame);

    // Limit replay size
    if (this.replayFrames.length > this.maxReplayFrames) {
      this.replayFrames.shift();
    }
  }

  /**
   * Handle spectator join
   */
  private handleSpectatorJoin(spectatorId: string, name: string): void {
    if (!this.enableSpectating) return;

    const spectator: SpectatorData = {
      id: spectatorId,
      name,
      joinedAt: Date.now()
    };

    this.spectators.set(spectatorId, spectator);

    if (this.onSpectatorJoinCallback) {
      this.onSpectatorJoinCallback(spectator);
    }
  }

  /**
   * Set network state
   */
  private setState(state: NetworkBattleState): void {
    this.networkState = state;
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
