/**
 * MatchmakingSystem.ts
 * Handles player matchmaking for PVP battles
 */

import { NetworkManager, NetworkMessageType, NetworkMessage } from './NetworkManager';

/**
 * Matchmaking mode
 */
export enum MatchmakingMode {
  RANDOM = 'RANDOM',       // Random opponent
  RANKED = 'RANKED',       // Skill-based matchmaking
  INVITE = 'INVITE',       // Friend invitation
  CUSTOM = 'CUSTOM'        // Custom room
}

/**
 * Player rating/skill level
 */
export interface PlayerRating {
  playerId: string;
  rating: number;
  wins: number;
  losses: number;
  totalGames: number;
}

/**
 * Match request
 */
export interface MatchRequest {
  playerId: string;
  mode: MatchmakingMode;
  rating?: number;
  preferences?: {
    maxLatency?: number;
    region?: string;
  };
  timestamp: number;
}

/**
 * Match result
 */
export interface MatchResult {
  roomId: string;
  opponentId: string;
  opponentRating?: number;
  estimatedLatency: number;
}

/**
 * Matchmaking state
 */
export enum MatchmakingState {
  IDLE = 'IDLE',
  SEARCHING = 'SEARCHING',
  MATCHED = 'MATCHED',
  CANCELLED = 'CANCELLED',
  ERROR = 'ERROR'
}

/**
 * MatchmakingSystem class
 * Manages player matchmaking and room creation
 */
export class MatchmakingSystem {
  private networkManager: NetworkManager;
  private state: MatchmakingState = MatchmakingState.IDLE;
  private currentRequest: MatchRequest | null = null;
  private matchFoundCallback: ((result: MatchResult) => void) | null = null;
  private searchStartTime = 0;
  private searchTimeout = 60000; // 60 seconds

  constructor(networkManager: NetworkManager) {
    this.networkManager = networkManager;
    this.setupMessageHandlers();
  }

  /**
   * Start searching for a match
   */
  public async findMatch(
    mode: MatchmakingMode = MatchmakingMode.RANDOM,
    playerRating?: PlayerRating
  ): Promise<MatchResult> {
    return new Promise((resolve, reject) => {
      if (this.state === MatchmakingState.SEARCHING) {
        reject(new Error('Already searching for a match'));
        return;
      }

      this.state = MatchmakingState.SEARCHING;
      this.searchStartTime = Date.now();

      this.currentRequest = {
        playerId: this.networkManager.getPlayerId(),
        mode,
        rating: playerRating?.rating,
        timestamp: Date.now()
      };

      // Set callback for match found
      this.matchFoundCallback = (result: MatchResult) => {
        this.state = MatchmakingState.MATCHED;
        this.matchFoundCallback = null;
        resolve(result);
      };

      // Send matchmaking request
      this.sendMatchRequest(this.currentRequest);

      // Setup timeout
      setTimeout(() => {
        if (this.state === MatchmakingState.SEARCHING) {
          this.cancelSearch();
          reject(new Error('Matchmaking timeout - no opponent found'));
        }
      }, this.searchTimeout);
    });
  }

  /**
   * Create a custom room and wait for opponent
   */
  public async createCustomRoom(): Promise<string> {
    try {
      const roomId = await this.networkManager.createRoom();
      this.state = MatchmakingState.MATCHED;
      return roomId;
    } catch (error) {
      this.state = MatchmakingState.ERROR;
      throw error;
    }
  }

  /**
   * Join a custom room by ID
   */
  public async joinCustomRoom(roomId: string): Promise<void> {
    try {
      await this.networkManager.joinRoom(roomId);
      this.state = MatchmakingState.MATCHED;
    } catch (error) {
      this.state = MatchmakingState.ERROR;
      throw error;
    }
  }

  /**
   * Invite a friend to battle
   */
  public async inviteFriend(friendId: string): Promise<string> {
    try {
      const roomId = await this.networkManager.createRoom();
      
      // Send invitation message (implement in server)
      this.networkManager.sendChat(`/invite ${friendId} ${roomId}`);
      
      this.state = MatchmakingState.MATCHED;
      return roomId;
    } catch (error) {
      this.state = MatchmakingState.ERROR;
      throw error;
    }
  }

  /**
   * Accept a friend invitation
   */
  public async acceptInvitation(roomId: string): Promise<void> {
    try {
      await this.networkManager.joinRoom(roomId);
      this.state = MatchmakingState.MATCHED;
    } catch (error) {
      this.state = MatchmakingState.ERROR;
      throw error;
    }
  }

  /**
   * Cancel current matchmaking search
   */
  public cancelSearch(): void {
    if (this.state === MatchmakingState.SEARCHING) {
      this.state = MatchmakingState.CANCELLED;
      this.currentRequest = null;
      this.matchFoundCallback = null;

      // Notify server
      this.networkManager.sendChat('/cancel_matchmaking');
    }
  }

  /**
   * Get current matchmaking state
   */
  public getState(): MatchmakingState {
    return this.state;
  }

  /**
   * Get search duration in seconds
   */
  public getSearchDuration(): number {
    if (this.state !== MatchmakingState.SEARCHING) {
      return 0;
    }
    return Math.floor((Date.now() - this.searchStartTime) / 1000);
  }

  /**
   * Check if currently searching
   */
  public isSearching(): boolean {
    return this.state === MatchmakingState.SEARCHING;
  }

  /**
   * Reset matchmaking state
   */
  public reset(): void {
    this.state = MatchmakingState.IDLE;
    this.currentRequest = null;
    this.matchFoundCallback = null;
  }

  // Private methods

  /**
   * Setup message handlers
   */
  private setupMessageHandlers(): void {
    // Handle room joined - might be from matchmaking
    this.networkManager.on(NetworkMessageType.ROOM_JOINED, (msg: NetworkMessage) => {
      if (this.state === MatchmakingState.SEARCHING && this.matchFoundCallback) {
        const result: MatchResult = {
          roomId: msg.data.roomId,
          opponentId: msg.data.opponentId || 'unknown',
          estimatedLatency: this.networkManager.getLatency()
        };
        this.matchFoundCallback(result);
      }
    });

    // Handle game start - confirmation that match is ready
    this.networkManager.on(NetworkMessageType.GAME_START, (msg: NetworkMessage) => {
      if (this.state === MatchmakingState.SEARCHING && this.matchFoundCallback) {
        const result: MatchResult = {
          roomId: msg.data.roomId,
          opponentId: msg.data.opponentId,
          opponentRating: msg.data.opponentRating,
          estimatedLatency: this.networkManager.getLatency()
        };
        this.matchFoundCallback(result);
      }
    });
  }

  /**
   * Send match request to server
   */
  private sendMatchRequest(request: MatchRequest): void {
    // Use chat message for matchmaking request (simple protocol)
    // In production, use dedicated message type
    const command = `/matchmaking ${request.mode} ${request.rating || 0}`;
    this.networkManager.sendChat(command);
  }
}

/**
 * Simple ranking system
 */
export class RankingSystem {
  private ratings: Map<string, PlayerRating> = new Map();
  private kFactor = 32; // ELO K-factor

  /**
   * Update player ratings after a match
   */
  public updateRatings(
    winnerId: string,
    loserId: string,
    winnerRating: number,
    loserRating: number
  ): { winnerNewRating: number; loserNewRating: number } {
    // Calculate expected scores
    const expectedWinner = this.getExpectedScore(winnerRating, loserRating);
    const expectedLoser = this.getExpectedScore(loserRating, winnerRating);

    // Calculate new ratings
    const winnerNewRating = Math.round(winnerRating + this.kFactor * (1 - expectedWinner));
    const loserNewRating = Math.round(loserRating + this.kFactor * (0 - expectedLoser));

    return {
      winnerNewRating,
      loserNewRating
    };
  }

  /**
   * Get expected score (ELO formula)
   */
  private getExpectedScore(ratingA: number, ratingB: number): number {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  }

  /**
   * Get player rating
   */
  public getPlayerRating(playerId: string): PlayerRating {
    if (!this.ratings.has(playerId)) {
      this.ratings.set(playerId, {
        playerId,
        rating: 1000, // Default rating
        wins: 0,
        losses: 0,
        totalGames: 0
      });
    }
    return this.ratings.get(playerId)!;
  }

  /**
   * Update player stats
   */
  public updatePlayerStats(playerId: string, won: boolean, newRating: number): void {
    const stats = this.getPlayerRating(playerId);
    stats.rating = newRating;
    stats.totalGames++;
    if (won) {
      stats.wins++;
    } else {
      stats.losses++;
    }
  }

  /**
   * Get leaderboard
   */
  public getLeaderboard(limit = 10): PlayerRating[] {
    return Array.from(this.ratings.values())
      .sort((a, b) => b.rating - a.rating)
      .slice(0, limit);
  }
}
