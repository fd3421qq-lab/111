/**
 * ReconnectionManager.ts
 * Manages connection recovery and game state restoration
 */

import { NetworkManager, ConnectionState, StateSyncData } from './NetworkManager';

/**
 * Game state snapshot for recovery
 */
export interface GameStateSnapshot {
  timestamp: number;
  roomId: string;
  playerId: string;
  opponentId: string;
  state: StateSyncData;
  moveHistory: any[];
  lastSyncedMove: number;
}

/**
 * Reconnection status
 */
export enum ReconnectionStatus {
  STABLE = 'STABLE',
  UNSTABLE = 'UNSTABLE',
  RECONNECTING = 'RECONNECTING',
  RECOVERING = 'RECOVERING',
  FAILED = 'FAILED'
}

/**
 * ReconnectionManager class
 * Handles disconnection recovery and state synchronization
 */
export class ReconnectionManager {
  private networkManager: NetworkManager;
  private status: ReconnectionStatus = ReconnectionStatus.STABLE;
  private stateSnapshots: GameStateSnapshot[] = [];
  private maxSnapshots = 10;
  private lastSnapshotTime = 0;
  private snapshotInterval = 5000; // 5 seconds
  private reconnectCallback: ((snapshot: GameStateSnapshot | null) => void) | null = null;
  private disconnectTime = 0;
  private maxRecoveryTime = 60000; // 60 seconds

  constructor(networkManager: NetworkManager) {
    this.networkManager = networkManager;
    this.setupMonitoring();
  }

  /**
   * Save current game state snapshot
   */
  public saveSnapshot(snapshot: GameStateSnapshot): void {
    // Don't save if too soon after last snapshot
    const now = Date.now();
    if (now - this.lastSnapshotTime < this.snapshotInterval) {
      return;
    }

    this.stateSnapshots.push(snapshot);
    this.lastSnapshotTime = now;

    // Keep only recent snapshots
    if (this.stateSnapshots.length > this.maxSnapshots) {
      this.stateSnapshots.shift();
    }

    // Save to localStorage for persistence
    this.saveToLocalStorage(snapshot);
  }

  /**
   * Get latest snapshot
   */
  public getLatestSnapshot(): GameStateSnapshot | null {
    if (this.stateSnapshots.length === 0) {
      return this.loadFromLocalStorage();
    }
    return this.stateSnapshots[this.stateSnapshots.length - 1];
  }

  /**
   * Get snapshot by timestamp
   */
  public getSnapshotAt(timestamp: number): GameStateSnapshot | null {
    // Find closest snapshot before timestamp
    let closest: GameStateSnapshot | null = null;
    let minDiff = Infinity;

    for (const snapshot of this.stateSnapshots) {
      const diff = timestamp - snapshot.timestamp;
      if (diff >= 0 && diff < minDiff) {
        minDiff = diff;
        closest = snapshot;
      }
    }

    return closest;
  }

  /**
   * Attempt to recover game state after reconnection
   */
  public async recoverGameState(): Promise<GameStateSnapshot | null> {
    return new Promise((resolve, reject) => {
      this.status = ReconnectionStatus.RECOVERING;

      // Check if reconnection is still possible
      const disconnectDuration = Date.now() - this.disconnectTime;
      if (disconnectDuration > this.maxRecoveryTime) {
        this.status = ReconnectionStatus.FAILED;
        reject(new Error('Recovery time exceeded'));
        return;
      }

      // Try to get latest snapshot
      const snapshot = this.getLatestSnapshot();
      if (!snapshot) {
        this.status = ReconnectionStatus.FAILED;
        reject(new Error('No snapshot available for recovery'));
        return;
      }

      // Request state sync from server
      this.requestStateSyncFromServer(snapshot.roomId)
        .then((serverState) => {
          // Merge local and server state
          const recoveredSnapshot = this.mergeStates(snapshot, serverState);
          this.status = ReconnectionStatus.STABLE;
          resolve(recoveredSnapshot);
        })
        .catch((error) => {
          // Fallback to local snapshot
          console.warn('[ReconnectionManager] Server sync failed, using local snapshot:', error);
          this.status = ReconnectionStatus.UNSTABLE;
          resolve(snapshot);
        });

      // Timeout
      setTimeout(() => {
        if (this.status === ReconnectionStatus.RECOVERING) {
          this.status = ReconnectionStatus.FAILED;
          reject(new Error('State recovery timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Handle connection loss
   */
  public handleDisconnect(): void {
    this.disconnectTime = Date.now();
    this.status = ReconnectionStatus.RECONNECTING;
    console.log('[ReconnectionManager] Connection lost, attempting recovery...');
  }

  /**
   * Handle successful reconnection
   */
  public async handleReconnect(): Promise<GameStateSnapshot | null> {
    console.log('[ReconnectionManager] Reconnected, recovering game state...');
    try {
      const snapshot = await this.recoverGameState();
      console.log('[ReconnectionManager] Game state recovered successfully');
      return snapshot;
    } catch (error) {
      console.error('[ReconnectionManager] Failed to recover game state:', error);
      this.status = ReconnectionStatus.FAILED;
      return null;
    }
  }

  /**
   * Set reconnect callback
   */
  public onReconnect(callback: (snapshot: GameStateSnapshot | null) => void): void {
    this.reconnectCallback = callback;
  }

  /**
   * Get current status
   */
  public getStatus(): ReconnectionStatus {
    return this.status;
  }

  /**
   * Check if recovery is possible
   */
  public canRecover(): boolean {
    const disconnectDuration = Date.now() - this.disconnectTime;
    return disconnectDuration < this.maxRecoveryTime && this.stateSnapshots.length > 0;
  }

  /**
   * Clear all snapshots
   */
  public clearSnapshots(): void {
    this.stateSnapshots = [];
    this.clearLocalStorage();
  }

  /**
   * Get connection quality metrics
   */
  public getConnectionQuality(): {
    status: ReconnectionStatus;
    latency: number;
    disconnectDuration: number;
    snapshotCount: number;
  } {
    return {
      status: this.status,
      latency: this.networkManager.getLatency(),
      disconnectDuration: this.disconnectTime > 0 ? Date.now() - this.disconnectTime : 0,
      snapshotCount: this.stateSnapshots.length
    };
  }

  // Private methods

  /**
   * Setup connection monitoring
   */
  private setupMonitoring(): void {
    // Monitor connection state changes
    setInterval(() => {
      const state = this.networkManager.getConnectionState();
      
      if (state === ConnectionState.DISCONNECTED && this.status === ReconnectionStatus.STABLE) {
        this.handleDisconnect();
      } else if (state === ConnectionState.CONNECTED && this.status === ReconnectionStatus.RECONNECTING) {
        this.handleReconnect().then((snapshot) => {
          if (this.reconnectCallback) {
            this.reconnectCallback(snapshot);
          }
        });
      }

      // Update status based on latency
      const latency = this.networkManager.getLatency();
      if (state === ConnectionState.CONNECTED) {
        if (latency > 500) {
          this.status = ReconnectionStatus.UNSTABLE;
        } else if (latency < 200 && this.status === ReconnectionStatus.UNSTABLE) {
          this.status = ReconnectionStatus.STABLE;
        }
      }
    }, 1000);
  }

  /**
   * Request state sync from server
   */
  private async requestStateSyncFromServer(roomId: string): Promise<StateSyncData> {
    return new Promise((resolve, reject) => {
      // In a real implementation, this would request state from server
      // For now, we'll just reject to trigger fallback to local snapshot
      reject(new Error('Server state sync not implemented'));
    });
  }

  /**
   * Merge local and server state
   */
  private mergeStates(
    localSnapshot: GameStateSnapshot,
    serverState: StateSyncData
  ): GameStateSnapshot {
    // Prefer server state for most things
    return {
      ...localSnapshot,
      state: serverState,
      timestamp: Date.now()
    };
  }

  /**
   * Save snapshot to localStorage
   */
  private saveToLocalStorage(snapshot: GameStateSnapshot): void {
    try {
      const key = `game_snapshot_${snapshot.roomId}`;
      localStorage.setItem(key, JSON.stringify(snapshot));
      localStorage.setItem('latest_snapshot_key', key);
    } catch (error) {
      console.error('[ReconnectionManager] Failed to save to localStorage:', error);
    }
  }

  /**
   * Load snapshot from localStorage
   */
  private loadFromLocalStorage(): GameStateSnapshot | null {
    try {
      const key = localStorage.getItem('latest_snapshot_key');
      if (!key) return null;

      const data = localStorage.getItem(key);
      if (!data) return null;

      return JSON.parse(data);
    } catch (error) {
      console.error('[ReconnectionManager] Failed to load from localStorage:', error);
      return null;
    }
  }

  /**
   * Clear localStorage
   */
  private clearLocalStorage(): void {
    try {
      const key = localStorage.getItem('latest_snapshot_key');
      if (key) {
        localStorage.removeItem(key);
      }
      localStorage.removeItem('latest_snapshot_key');
    } catch (error) {
      console.error('[ReconnectionManager] Failed to clear localStorage:', error);
    }
  }

  /**
   * Calculate state difference for conflict resolution
   */
  private calculateStateDiff(state1: StateSyncData, state2: StateSyncData): any {
    const diff: any = {};

    // Compare scores
    if (state1.playerScore !== state2.playerScore) {
      diff.playerScore = { local: state1.playerScore, server: state2.playerScore };
    }
    if (state1.opponentScore !== state2.opponentScore) {
      diff.opponentScore = { local: state1.opponentScore, server: state2.opponentScore };
    }

    // Compare move counts
    if (state1.playerMoves !== state2.playerMoves) {
      diff.playerMoves = { local: state1.playerMoves, server: state2.playerMoves };
    }
    if (state1.opponentMoves !== state2.opponentMoves) {
      diff.opponentMoves = { local: state1.opponentMoves, server: state2.opponentMoves };
    }

    // Compare event progress
    if (state1.eventProgress !== state2.eventProgress) {
      diff.eventProgress = { local: state1.eventProgress, server: state2.eventProgress };
    }

    return diff;
  }
}

/**
 * Network quality monitor
 */
export class NetworkQualityMonitor {
  private latencyHistory: number[] = [];
  private maxHistorySize = 20;
  private packetLoss = 0;
  private jitter = 0;

  /**
   * Record latency measurement
   */
  public recordLatency(latency: number): void {
    this.latencyHistory.push(latency);
    if (this.latencyHistory.length > this.maxHistorySize) {
      this.latencyHistory.shift();
    }
    this.calculateJitter();
  }

  /**
   * Get average latency
   */
  public getAverageLatency(): number {
    if (this.latencyHistory.length === 0) return 0;
    const sum = this.latencyHistory.reduce((a, b) => a + b, 0);
    return sum / this.latencyHistory.length;
  }

  /**
   * Get connection quality rating
   */
  public getQualityRating(): 'excellent' | 'good' | 'fair' | 'poor' {
    const avgLatency = this.getAverageLatency();
    if (avgLatency < 50) return 'excellent';
    if (avgLatency < 100) return 'good';
    if (avgLatency < 200) return 'fair';
    return 'poor';
  }

  /**
   * Calculate jitter (latency variance)
   */
  private calculateJitter(): void {
    if (this.latencyHistory.length < 2) {
      this.jitter = 0;
      return;
    }

    const avg = this.getAverageLatency();
    const variance = this.latencyHistory.reduce((sum, latency) => {
      return sum + Math.pow(latency - avg, 2);
    }, 0) / this.latencyHistory.length;
    
    this.jitter = Math.sqrt(variance);
  }

  /**
   * Get jitter value
   */
  public getJitter(): number {
    return this.jitter;
  }

  /**
   * Get packet loss percentage
   */
  public getPacketLoss(): number {
    return this.packetLoss;
  }
}
