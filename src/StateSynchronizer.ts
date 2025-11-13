/**
 * StateSynchronizer.ts
 * Efficient state synchronization with delta updates and optimistic locking
 */

import { CandyType } from './GridSystem';
import { GameEventType } from './GameEventType';

/**
 * State snapshot for synchronization
 */
export interface StateSnapshot {
  timestamp: number;
  version: number;
  playerGrid: CandyType[][];
  opponentGrid: CandyType[][];
  playerScore: number;
  opponentScore: number;
  playerMoves: number;
  opponentMoves: number;
  eventProgress: number;
  activeEvents: GameEventType[];
  currentTurn: string;
}

/**
 * Delta update for efficient synchronization
 */
export interface StateDelta {
  version: number;
  baseVersion: number;
  changes: StateChange[];
  timestamp: number;
}

/**
 * Individual state change
 */
export interface StateChange {
  type: StateChangeType;
  path: string;
  value: any;
  oldValue?: any;
}

/**
 * State change types
 */
export enum StateChangeType {
  GRID_UPDATE = 'GRID_UPDATE',
  SCORE_UPDATE = 'SCORE_UPDATE',
  MOVES_UPDATE = 'MOVES_UPDATE',
  EVENT_UPDATE = 'EVENT_UPDATE',
  TURN_UPDATE = 'TURN_UPDATE'
}

/**
 * Synchronization mode
 */
export enum SyncMode {
  FULL = 'FULL',           // Send complete state
  DELTA = 'DELTA',         // Send only changes
  HYBRID = 'HYBRID'        // Mix of both based on delta size
}

/**
 * Synchronization statistics
 */
export interface SyncStats {
  totalSyncs: number;
  fullSyncs: number;
  deltaSyncs: number;
  averageDeltaSize: number;
  averageLatency: number;
  conflictCount: number;
  lastSyncTime: number;
}

/**
 * StateSynchronizer class
 * Manages efficient state synchronization with delta updates
 */
export class StateSynchronizer {
  private currentSnapshot: StateSnapshot | null = null;
  private previousSnapshot: StateSnapshot | null = null;
  private version = 0;
  private syncMode: SyncMode = SyncMode.HYBRID;
  
  // Statistics
  private stats: SyncStats = {
    totalSyncs: 0,
    fullSyncs: 0,
    deltaSyncs: 0,
    averageDeltaSize: 0,
    averageLatency: 0,
    conflictCount: 0,
    lastSyncTime: 0
  };
  
  // Configuration
  private maxDeltaSize = 50; // Switch to full sync if delta > this
  private snapshotInterval = 10; // Create full snapshot every N syncs
  
  constructor(mode: SyncMode = SyncMode.HYBRID) {
    this.syncMode = mode;
  }
  
  /**
   * Create snapshot from current game state
   */
  public createSnapshot(
    playerGrid: CandyType[][],
    opponentGrid: CandyType[][],
    playerScore: number,
    opponentScore: number,
    playerMoves: number,
    opponentMoves: number,
    eventProgress: number,
    activeEvents: GameEventType[],
    currentTurn: string
  ): StateSnapshot {
    this.version++;
    
    const snapshot: StateSnapshot = {
      timestamp: Date.now(),
      version: this.version,
      playerGrid: this.deepClone(playerGrid),
      opponentGrid: this.deepClone(opponentGrid),
      playerScore,
      opponentScore,
      playerMoves,
      opponentMoves,
      eventProgress,
      activeEvents: [...activeEvents],
      currentTurn
    };
    
    this.previousSnapshot = this.currentSnapshot;
    this.currentSnapshot = snapshot;
    
    return snapshot;
  }
  
  /**
   * Generate delta from previous snapshot
   */
  public generateDelta(): StateDelta | null {
    if (!this.currentSnapshot || !this.previousSnapshot) {
      return null;
    }
    
    const changes: StateChange[] = [];
    const current = this.currentSnapshot;
    const previous = this.previousSnapshot;
    
    // Check grid changes
    this.compareGrids(
      previous.playerGrid,
      current.playerGrid,
      'playerGrid',
      changes
    );
    this.compareGrids(
      previous.opponentGrid,
      current.opponentGrid,
      'opponentGrid',
      changes
    );
    
    // Check score changes
    if (previous.playerScore !== current.playerScore) {
      changes.push({
        type: StateChangeType.SCORE_UPDATE,
        path: 'playerScore',
        value: current.playerScore,
        oldValue: previous.playerScore
      });
    }
    
    if (previous.opponentScore !== current.opponentScore) {
      changes.push({
        type: StateChangeType.SCORE_UPDATE,
        path: 'opponentScore',
        value: current.opponentScore,
        oldValue: previous.opponentScore
      });
    }
    
    // Check moves changes
    if (previous.playerMoves !== current.playerMoves) {
      changes.push({
        type: StateChangeType.MOVES_UPDATE,
        path: 'playerMoves',
        value: current.playerMoves,
        oldValue: previous.playerMoves
      });
    }
    
    if (previous.opponentMoves !== current.opponentMoves) {
      changes.push({
        type: StateChangeType.MOVES_UPDATE,
        path: 'opponentMoves',
        value: current.opponentMoves,
        oldValue: previous.opponentMoves
      });
    }
    
    // Check event changes
    if (previous.eventProgress !== current.eventProgress) {
      changes.push({
        type: StateChangeType.EVENT_UPDATE,
        path: 'eventProgress',
        value: current.eventProgress,
        oldValue: previous.eventProgress
      });
    }
    
    if (JSON.stringify(previous.activeEvents) !== JSON.stringify(current.activeEvents)) {
      changes.push({
        type: StateChangeType.EVENT_UPDATE,
        path: 'activeEvents',
        value: current.activeEvents,
        oldValue: previous.activeEvents
      });
    }
    
    // Check turn changes
    if (previous.currentTurn !== current.currentTurn) {
      changes.push({
        type: StateChangeType.TURN_UPDATE,
        path: 'currentTurn',
        value: current.currentTurn,
        oldValue: previous.currentTurn
      });
    }
    
    if (changes.length === 0) {
      return null;
    }
    
    return {
      version: current.version,
      baseVersion: previous.version,
      changes,
      timestamp: Date.now()
    };
  }
  
  /**
   * Apply delta to snapshot
   */
  public applyDelta(snapshot: StateSnapshot, delta: StateDelta): StateSnapshot {
    const updated = this.deepClone(snapshot) as StateSnapshot;
    updated.version = delta.version;
    updated.timestamp = delta.timestamp;
    
    for (const change of delta.changes) {
      switch (change.type) {
        case StateChangeType.GRID_UPDATE:
          this.applyGridChange(updated, change);
          break;
          
        case StateChangeType.SCORE_UPDATE:
          if (change.path === 'playerScore') {
            updated.playerScore = change.value;
          } else if (change.path === 'opponentScore') {
            updated.opponentScore = change.value;
          }
          break;
          
        case StateChangeType.MOVES_UPDATE:
          if (change.path === 'playerMoves') {
            updated.playerMoves = change.value;
          } else if (change.path === 'opponentMoves') {
            updated.opponentMoves = change.value;
          }
          break;
          
        case StateChangeType.EVENT_UPDATE:
          if (change.path === 'eventProgress') {
            updated.eventProgress = change.value;
          } else if (change.path === 'activeEvents') {
            updated.activeEvents = change.value;
          }
          break;
          
        case StateChangeType.TURN_UPDATE:
          updated.currentTurn = change.value;
          break;
      }
    }
    
    return updated;
  }
  
  /**
   * Decide whether to use full sync or delta sync
   */
  public shouldUseDeltaSync(): boolean {
    if (this.syncMode === SyncMode.FULL) {
      return false;
    }
    
    if (this.syncMode === SyncMode.DELTA) {
      return true;
    }
    
    // HYBRID mode logic
    if (!this.previousSnapshot) {
      return false; // First sync must be full
    }
    
    if (this.stats.totalSyncs % this.snapshotInterval === 0) {
      return false; // Periodic full sync
    }
    
    const delta = this.generateDelta();
    if (!delta) {
      return true; // No changes
    }
    
    return delta.changes.length <= this.maxDeltaSize;
  }
  
  /**
   * Prepare sync data (full or delta)
   */
  public prepareSyncData(): StateSnapshot | StateDelta | null {
    if (!this.currentSnapshot) {
      return null;
    }
    
    const useDelta = this.shouldUseDeltaSync();
    
    if (useDelta) {
      this.stats.deltaSyncs++;
      const delta = this.generateDelta();
      if (delta) {
        this.stats.averageDeltaSize = 
          (this.stats.averageDeltaSize * (this.stats.deltaSyncs - 1) + delta.changes.length) / 
          this.stats.deltaSyncs;
      }
      return delta;
    } else {
      this.stats.fullSyncs++;
      return this.currentSnapshot;
    }
  }
  
  /**
   * Validate snapshot version
   */
  public validateVersion(remoteVersion: number): boolean {
    if (!this.currentSnapshot) {
      return true; // Accept any version if no local snapshot
    }
    
    return remoteVersion >= this.currentSnapshot.version - 5; // Allow 5 version difference
  }
  
  /**
   * Detect version conflict
   */
  public detectConflict(remoteVersion: number, baseVersion: number): boolean {
    if (!this.currentSnapshot) {
      return false;
    }
    
    // Conflict if remote is based on older version than current
    return baseVersion < this.currentSnapshot.version;
  }
  
  /**
   * Get current snapshot
   */
  public getCurrentSnapshot(): StateSnapshot | null {
    return this.currentSnapshot;
  }
  
  /**
   * Get synchronization statistics
   */
  public getStats(): SyncStats {
    return { ...this.stats };
  }
  
  /**
   * Update statistics
   */
  public updateStats(latency: number, hasConflict: boolean): void {
    this.stats.totalSyncs++;
    this.stats.averageLatency = 
      (this.stats.averageLatency * (this.stats.totalSyncs - 1) + latency) / 
      this.stats.totalSyncs;
    
    if (hasConflict) {
      this.stats.conflictCount++;
    }
    
    this.stats.lastSyncTime = Date.now();
  }
  
  /**
   * Reset synchronizer
   */
  public reset(): void {
    this.currentSnapshot = null;
    this.previousSnapshot = null;
    this.version = 0;
    this.stats = {
      totalSyncs: 0,
      fullSyncs: 0,
      deltaSyncs: 0,
      averageDeltaSize: 0,
      averageLatency: 0,
      conflictCount: 0,
      lastSyncTime: 0
    };
  }
  
  // Private helper methods
  
  /**
   * Compare grids and generate changes
   */
  private compareGrids(
    oldGrid: CandyType[][],
    newGrid: CandyType[][],
    path: string,
    changes: StateChange[]
  ): void {
    for (let row = 0; row < oldGrid.length; row++) {
      for (let col = 0; col < oldGrid[row].length; col++) {
        if (oldGrid[row][col] !== newGrid[row][col]) {
          changes.push({
            type: StateChangeType.GRID_UPDATE,
            path: `${path}[${row}][${col}]`,
            value: newGrid[row][col],
            oldValue: oldGrid[row][col]
          });
        }
      }
    }
  }
  
  /**
   * Apply grid change to snapshot
   */
  private applyGridChange(snapshot: StateSnapshot, change: StateChange): void {
    const match = change.path.match(/^(playerGrid|opponentGrid)\[(\d+)\]\[(\d+)\]$/);
    if (!match) return;
    
    const [, gridName, rowStr, colStr] = match;
    const row = parseInt(rowStr, 10);
    const col = parseInt(colStr, 10);
    
    if (gridName === 'playerGrid') {
      snapshot.playerGrid[row][col] = change.value;
    } else if (gridName === 'opponentGrid') {
      snapshot.opponentGrid[row][col] = change.value;
    }
  }
  
  /**
   * Deep clone object
   */
  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}
