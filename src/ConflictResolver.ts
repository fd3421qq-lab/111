/**
 * ConflictResolver.ts
 * Handles conflicts in network battles caused by latency and race conditions
 */

import { StateSnapshot, StateDelta } from './StateSynchronizer';
import { Position, CandyType } from './GridSystem';

/**
 * Conflict types
 */
export enum ConflictType {
  VERSION_MISMATCH = 'VERSION_MISMATCH',       // Different versions
  CONCURRENT_MOVES = 'CONCURRENT_MOVES',       // Both players moved at same time
  STATE_DIVERGENCE = 'STATE_DIVERGENCE',       // States have diverged
  GRID_INCONSISTENCY = 'GRID_INCONSISTENCY',   // Grid states don't match
  SCORE_MISMATCH = 'SCORE_MISMATCH'            // Score calculations differ
}

/**
 * Conflict information
 */
export interface Conflict {
  type: ConflictType;
  timestamp: number;
  localVersion: number;
  remoteVersion: number;
  description: string;
  localState?: any;
  remoteState?: any;
}

/**
 * Resolution strategy
 */
export enum ResolutionStrategy {
  SERVER_AUTHORITATIVE = 'SERVER_AUTHORITATIVE',   // Server always wins
  CLIENT_AUTHORITATIVE = 'CLIENT_AUTHORITATIVE',   // Client always wins
  LATEST_TIMESTAMP = 'LATEST_TIMESTAMP',           // Latest change wins
  MERGE = 'MERGE',                                 // Attempt to merge changes
  ROLLBACK = 'ROLLBACK'                            // Rollback to last known good state
}

/**
 * Resolution result
 */
export interface ResolutionResult {
  success: boolean;
  strategy: ResolutionStrategy;
  resolvedState: StateSnapshot;
  rollbackRequired: boolean;
  compensationMoves: CompensationMove[];
  message: string;
}

/**
 * Compensation move to fix state
 */
export interface CompensationMove {
  position: Position;
  oldValue: CandyType;
  newValue: CandyType;
  reason: string;
}

/**
 * Conflict statistics
 */
export interface ConflictStats {
  totalConflicts: number;
  resolvedConflicts: number;
  failedResolutions: number;
  byType: Record<ConflictType, number>;
  byStrategy: Record<ResolutionStrategy, number>;
  averageResolutionTime: number;
}

/**
 * ConflictResolver class
 * Resolves state conflicts in network battles
 */
export class ConflictResolver {
  private strategy: ResolutionStrategy;
  private isServerAuthority: boolean;
  
  // Conflict history
  private conflicts: Conflict[] = [];
  private maxHistorySize = 100;
  
  // Statistics
  private stats: ConflictStats = {
    totalConflicts: 0,
    resolvedConflicts: 0,
    failedResolutions: 0,
    byType: {
      [ConflictType.VERSION_MISMATCH]: 0,
      [ConflictType.CONCURRENT_MOVES]: 0,
      [ConflictType.STATE_DIVERGENCE]: 0,
      [ConflictType.GRID_INCONSISTENCY]: 0,
      [ConflictType.SCORE_MISMATCH]: 0
    },
    byStrategy: {
      [ResolutionStrategy.SERVER_AUTHORITATIVE]: 0,
      [ResolutionStrategy.CLIENT_AUTHORITATIVE]: 0,
      [ResolutionStrategy.LATEST_TIMESTAMP]: 0,
      [ResolutionStrategy.MERGE]: 0,
      [ResolutionStrategy.ROLLBACK]: 0
    },
    averageResolutionTime: 0
  };
  
  constructor(
    strategy: ResolutionStrategy = ResolutionStrategy.SERVER_AUTHORITATIVE,
    isServerAuthority = false
  ) {
    this.strategy = strategy;
    this.isServerAuthority = isServerAuthority;
  }
  
  /**
   * Detect conflicts between local and remote states
   */
  public detectConflict(
    localState: StateSnapshot,
    remoteState: StateSnapshot
  ): Conflict | null {
    // Version mismatch
    if (Math.abs(localState.version - remoteState.version) > 1) {
      return this.createConflict(
        ConflictType.VERSION_MISMATCH,
        localState.version,
        remoteState.version,
        `Version mismatch: local=${localState.version}, remote=${remoteState.version}`,
        localState,
        remoteState
      );
    }
    
    // Grid inconsistency
    const gridDiff = this.compareGrids(localState.playerGrid, remoteState.opponentGrid);
    if (gridDiff > 5) { // Allow up to 5 cell differences
      return this.createConflict(
        ConflictType.GRID_INCONSISTENCY,
        localState.version,
        remoteState.version,
        `Grid states differ in ${gridDiff} cells`,
        localState,
        remoteState
      );
    }
    
    // Score mismatch (allow small differences due to timing)
    const scoreDiff = Math.abs(
      (localState.playerScore + localState.opponentScore) -
      (remoteState.playerScore + remoteState.opponentScore)
    );
    if (scoreDiff > 100) {
      return this.createConflict(
        ConflictType.SCORE_MISMATCH,
        localState.version,
        remoteState.version,
        `Total scores differ by ${scoreDiff}`,
        localState,
        remoteState
      );
    }
    
    // State divergence (timestamps too far apart)
    const timeDiff = Math.abs(localState.timestamp - remoteState.timestamp);
    if (timeDiff > 10000) { // 10 seconds
      return this.createConflict(
        ConflictType.STATE_DIVERGENCE,
        localState.version,
        remoteState.version,
        `States diverged by ${timeDiff}ms`,
        localState,
        remoteState
      );
    }
    
    return null;
  }
  
  /**
   * Resolve conflict between states
   */
  public resolveConflict(
    conflict: Conflict,
    localState: StateSnapshot,
    remoteState: StateSnapshot
  ): ResolutionResult {
    const startTime = Date.now();
    this.stats.totalConflicts++;
    this.stats.byType[conflict.type]++;
    
    let result: ResolutionResult;
    
    try {
      switch (this.strategy) {
        case ResolutionStrategy.SERVER_AUTHORITATIVE:
          result = this.resolveServerAuthoritative(conflict, localState, remoteState);
          break;
          
        case ResolutionStrategy.CLIENT_AUTHORITATIVE:
          result = this.resolveClientAuthoritative(conflict, localState, remoteState);
          break;
          
        case ResolutionStrategy.LATEST_TIMESTAMP:
          result = this.resolveLatestTimestamp(conflict, localState, remoteState);
          break;
          
        case ResolutionStrategy.MERGE:
          result = this.resolveMerge(conflict, localState, remoteState);
          break;
          
        case ResolutionStrategy.ROLLBACK:
          result = this.resolveRollback(conflict, localState, remoteState);
          break;
          
        default:
          result = this.resolveServerAuthoritative(conflict, localState, remoteState);
      }
      
      if (result.success) {
        this.stats.resolvedConflicts++;
      } else {
        this.stats.failedResolutions++;
      }
      
      this.stats.byStrategy[result.strategy]++;
      
      // Update average resolution time
      const resolutionTime = Date.now() - startTime;
      this.stats.averageResolutionTime = 
        (this.stats.averageResolutionTime * (this.stats.totalConflicts - 1) + resolutionTime) /
        this.stats.totalConflicts;
      
      return result;
      
    } catch (error) {
      this.stats.failedResolutions++;
      const err = error as Error;
      return {
        success: false,
        strategy: this.strategy,
        resolvedState: localState,
        rollbackRequired: true,
        compensationMoves: [],
        message: `Resolution failed: ${err.message}`
      };
    }
  }
  
  /**
   * Server-authoritative resolution
   */
  private resolveServerAuthoritative(
    conflict: Conflict,
    localState: StateSnapshot,
    remoteState: StateSnapshot
  ): ResolutionResult {
    const resolvedState = this.isServerAuthority ? localState : remoteState;
    
    return {
      success: true,
      strategy: ResolutionStrategy.SERVER_AUTHORITATIVE,
      resolvedState: this.deepClone(resolvedState),
      rollbackRequired: !this.isServerAuthority,
      compensationMoves: this.generateCompensationMoves(localState, resolvedState),
      message: `Resolved using server authority`
    };
  }
  
  /**
   * Client-authoritative resolution
   */
  private resolveClientAuthoritative(
    conflict: Conflict,
    localState: StateSnapshot,
    remoteState: StateSnapshot
  ): ResolutionResult {
    return {
      success: true,
      strategy: ResolutionStrategy.CLIENT_AUTHORITATIVE,
      resolvedState: this.deepClone(localState),
      rollbackRequired: false,
      compensationMoves: [],
      message: `Resolved using client authority`
    };
  }
  
  /**
   * Latest timestamp resolution
   */
  private resolveLatestTimestamp(
    conflict: Conflict,
    localState: StateSnapshot,
    remoteState: StateSnapshot
  ): ResolutionResult {
    const useLocal = localState.timestamp >= remoteState.timestamp;
    const resolvedState = useLocal ? localState : remoteState;
    
    return {
      success: true,
      strategy: ResolutionStrategy.LATEST_TIMESTAMP,
      resolvedState: this.deepClone(resolvedState),
      rollbackRequired: !useLocal,
      compensationMoves: useLocal ? [] : this.generateCompensationMoves(localState, resolvedState),
      message: `Resolved using ${useLocal ? 'local' : 'remote'} state (latest timestamp)`
    };
  }
  
  /**
   * Merge resolution (best effort)
   */
  private resolveMerge(
    conflict: Conflict,
    localState: StateSnapshot,
    remoteState: StateSnapshot
  ): ResolutionResult {
    const merged = this.deepClone(localState) as StateSnapshot;
    
    // Merge strategy: use higher values for scores, latest for others
    merged.playerScore = Math.max(localState.playerScore, remoteState.playerScore);
    merged.opponentScore = Math.max(localState.opponentScore, remoteState.opponentScore);
    merged.playerMoves = Math.max(localState.playerMoves, remoteState.playerMoves);
    merged.opponentMoves = Math.max(localState.opponentMoves, remoteState.opponentMoves);
    merged.eventProgress = Math.max(localState.eventProgress, remoteState.eventProgress);
    
    // Use latest timestamp
    if (remoteState.timestamp > localState.timestamp) {
      merged.timestamp = remoteState.timestamp;
      merged.currentTurn = remoteState.currentTurn;
      merged.activeEvents = [...remoteState.activeEvents];
    }
    
    // Grid merge: use non-empty cells
    merged.playerGrid = this.mergeGrids(localState.playerGrid, remoteState.opponentGrid);
    merged.opponentGrid = this.mergeGrids(localState.opponentGrid, remoteState.playerGrid);
    
    // Use higher version
    merged.version = Math.max(localState.version, remoteState.version) + 1;
    
    return {
      success: true,
      strategy: ResolutionStrategy.MERGE,
      resolvedState: merged,
      rollbackRequired: false,
      compensationMoves: this.generateCompensationMoves(localState, merged),
      message: `Resolved by merging both states`
    };
  }
  
  /**
   * Rollback resolution
   */
  private resolveRollback(
    conflict: Conflict,
    localState: StateSnapshot,
    remoteState: StateSnapshot
  ): ResolutionResult {
    // Use the state with lower version (earlier state)
    const olderState = localState.version < remoteState.version ? localState : remoteState;
    
    return {
      success: true,
      strategy: ResolutionStrategy.ROLLBACK,
      resolvedState: this.deepClone(olderState),
      rollbackRequired: true,
      compensationMoves: [],
      message: `Rolled back to version ${olderState.version}`
    };
  }
  
  /**
   * Generate compensation moves to fix state
   */
  private generateCompensationMoves(
    currentState: StateSnapshot,
    targetState: StateSnapshot
  ): CompensationMove[] {
    const moves: CompensationMove[] = [];
    
    // Check player grid differences
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (currentState.playerGrid[row][col] !== targetState.playerGrid[row][col]) {
          moves.push({
            position: { row, col },
            oldValue: currentState.playerGrid[row][col],
            newValue: targetState.playerGrid[row][col],
            reason: 'Grid synchronization'
          });
        }
      }
    }
    
    return moves;
  }
  
  /**
   * Compare two grids and count differences
   */
  private compareGrids(grid1: CandyType[][], grid2: CandyType[][]): number {
    let differences = 0;
    
    for (let row = 0; row < Math.min(grid1.length, grid2.length); row++) {
      for (let col = 0; col < Math.min(grid1[row].length, grid2[row].length); col++) {
        if (grid1[row][col] !== grid2[row][col]) {
          differences++;
        }
      }
    }
    
    return differences;
  }
  
  /**
   * Merge two grids (prefer non-empty cells)
   */
  private mergeGrids(grid1: CandyType[][], grid2: CandyType[][]): CandyType[][] {
    const merged: CandyType[][] = [];
    
    for (let row = 0; row < Math.max(grid1.length, grid2.length); row++) {
      merged[row] = [];
      for (let col = 0; col < 8; col++) {
        const cell1 = grid1[row]?.[col] ?? CandyType.EMPTY;
        const cell2 = grid2[row]?.[col] ?? CandyType.EMPTY;
        
        // Prefer non-empty cell
        merged[row][col] = cell1 !== CandyType.EMPTY ? cell1 : cell2;
      }
    }
    
    return merged;
  }
  
  /**
   * Create conflict record
   */
  private createConflict(
    type: ConflictType,
    localVersion: number,
    remoteVersion: number,
    description: string,
    localState?: any,
    remoteState?: any
  ): Conflict {
    const conflict: Conflict = {
      type,
      timestamp: Date.now(),
      localVersion,
      remoteVersion,
      description,
      localState,
      remoteState
    };
    
    this.conflicts.push(conflict);
    
    // Keep history limited
    if (this.conflicts.length > this.maxHistorySize) {
      this.conflicts.shift();
    }
    
    return conflict;
  }
  
  /**
   * Get conflict history
   */
  public getConflictHistory(): Conflict[] {
    return [...this.conflicts];
  }
  
  /**
   * Get conflict statistics
   */
  public getStats(): ConflictStats {
    return { ...this.stats };
  }
  
  /**
   * Set resolution strategy
   */
  public setStrategy(strategy: ResolutionStrategy): void {
    this.strategy = strategy;
  }
  
  /**
   * Get current strategy
   */
  public getStrategy(): ResolutionStrategy {
    return this.strategy;
  }
  
  /**
   * Reset resolver
   */
  public reset(): void {
    this.conflicts = [];
    this.stats = {
      totalConflicts: 0,
      resolvedConflicts: 0,
      failedResolutions: 0,
      byType: {
        [ConflictType.VERSION_MISMATCH]: 0,
        [ConflictType.CONCURRENT_MOVES]: 0,
        [ConflictType.STATE_DIVERGENCE]: 0,
        [ConflictType.GRID_INCONSISTENCY]: 0,
        [ConflictType.SCORE_MISMATCH]: 0
      },
      byStrategy: {
        [ResolutionStrategy.SERVER_AUTHORITATIVE]: 0,
        [ResolutionStrategy.CLIENT_AUTHORITATIVE]: 0,
        [ResolutionStrategy.LATEST_TIMESTAMP]: 0,
        [ResolutionStrategy.MERGE]: 0,
        [ResolutionStrategy.ROLLBACK]: 0
      },
      averageResolutionTime: 0
    };
  }
  
  /**
   * Deep clone object
   */
  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}
