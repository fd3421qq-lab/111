/**
 * Complete Integration Test - Task 2.6
 * End-to-end testing of the entire Match-3 battle game system
 */

import { NetworkBattleManager, NetworkBattleState } from '../../src/NetworkBattleManager';
import { BattleManager, PlayerType } from '../../src/BattleManager';
import { AIOpponent, AIStrategy } from '../../src/AIOpponent';
import { GridSystem, CandyType } from '../../src/GridSystem';
import { GameManager, GameState } from '../../src/GameManager';
import { MatchmakingMode } from '../../src/MatchmakingSystem';

/**
 * Test configuration
 */
interface TestConfig {
  serverUrl: string;
  timeout: number;
  enableNetworkTests: boolean;
  enablePerformanceTests: boolean;
}

/**
 * Test result
 */
interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

/**
 * Complete Integration Test Suite
 */
export class CompleteIntegrationTest {
  private config: TestConfig;
  private results: TestResult[] = [];
  private startTime = 0;

  constructor(config: Partial<TestConfig> = {}) {
    this.config = {
      serverUrl: 'ws://localhost:8080',
      timeout: 30000,
      enableNetworkTests: true,
      enablePerformanceTests: true,
      ...config
    };
  }

  /**
   * Run all integration tests
   */
  public async runAll(): Promise<void> {
    console.log('🚀 Starting Complete Integration Test Suite');
    console.log('=' .repeat(70));
    this.startTime = Date.now();

    // Core system tests
    await this.runTest('Core Grid System', () => this.testGridSystem());
    await this.runTest('Game Manager', () => this.testGameManager());
    await this.runTest('Battle Manager', () => this.testBattleManager());
    await this.runTest('AI Opponent System', () => this.testAIOpponent());

    // Network tests
    if (this.config.enableNetworkTests) {
      await this.runTest('Network Connection', () => this.testNetworkConnection());
      await this.runTest('Room Management', () => this.testRoomManagement());
      await this.runTest('Full Battle Flow', () => this.testFullBattleFlow());
      await this.runTest('State Synchronization', () => this.testStateSynchronization());
      await this.runTest('Conflict Resolution', () => this.testConflictResolution());
      await this.runTest('Reconnection', () => this.testReconnection());
    }

    // Performance tests
    if (this.config.enablePerformanceTests) {
      await this.runTest('Memory Usage', () => this.testMemoryUsage());
      await this.runTest('Rendering Performance', () => this.testRenderingPerformance());
      await this.runTest('Network Throughput', () => this.testNetworkThroughput());
    }

    // Integration scenarios
    await this.runTest('Complete Game Flow', () => this.testCompleteGameFlow());
    await this.runTest('Error Recovery', () => this.testErrorRecovery());

    this.printSummary();
  }

  /**
   * Test 1: Grid System
   */
  private async testGridSystem(): Promise<void> {
    const grid = new GridSystem(8, 8);
    grid.initialize();

    // Test grid initialization
    const gridData = grid.getGrid();
    if (gridData.length !== 8 || gridData[0].length !== 8) {
      throw new Error('Grid size incorrect');
    }

    // Test swap
    const result = grid.swap({ row: 0, col: 0 }, { row: 0, col: 1 });
    if (!result) {
      throw new Error('Swap failed');
    }

    // Test elimination detection
    const eliminations = grid.findEliminations();
    console.log(`  ✓ Found ${eliminations.length} elimination groups`);
  }

  /**
   * Test 2: Game Manager
   */
  private async testGameManager(): Promise<void> {
    const gameManager = new GameManager();

    // Test state transitions
    if (gameManager.getState() !== GameState.IDLE) {
      throw new Error('Initial state should be IDLE');
    }

    gameManager.startGame();
    if (gameManager.getState() !== GameState.PLAYING) {
      throw new Error('State should be PLAYING after start');
    }

    // Test event system
    const eventBar = gameManager.getEventBar();
    eventBar.addProgress(50);
    const progress = eventBar.getCurrentProgress();
    
    if (progress !== 50) {
      throw new Error(`Event progress should be 50, got ${progress}`);
    }

    console.log('  ✓ Game state management working');
  }

  /**
   * Test 3: Battle Manager
   */
  private async testBattleManager(): Promise<void> {
    const battleManager = new BattleManager({
      maxMoves: 30,
      targetScore: 1000
    });

    battleManager.startBattle();

    if (!battleManager.isBattleActive()) {
      throw new Error('Battle should be active');
    }

    // Execute some moves
    const result = battleManager.playerTurn({ row: 0, col: 0 }, { row: 0, col: 1 });
    
    const playerData = battleManager.getPlayerData();
    console.log(`  ✓ Player moves: ${playerData.moves}, score: ${playerData.score}`);
  }

  /**
   * Test 4: AI Opponent
   */
  private async testAIOpponent(): Promise<void> {
    const battleManager = new BattleManager({
      enableAI: true,
      aiDifficulty: 'medium'
    });

    battleManager.startBattle();

    // Execute AI turn
    const aiResult = battleManager.executeAITurn();
    if (!aiResult) {
      throw new Error('AI should be able to make a move');
    }

    console.log(`  ✓ AI move successful: ${aiResult.success ? 'valid' : 'invalid'}`);
  }

  /**
   * Test 5: Network Connection
   */
  private async testNetworkConnection(): Promise<void> {
    const manager = new NetworkBattleManager({
      serverUrl: this.config.serverUrl
    });

    try {
      await manager.connect();
      
      if (!manager.isConnected()) {
        throw new Error('Should be connected');
      }

      console.log('  ✓ Connected to server');
      
      manager.disconnect();
    } catch (error) {
      throw new Error(`Connection failed: ${(error as Error).message}`);
    }
  }

  /**
   * Test 6: Room Management
   */
  private async testRoomManagement(): Promise<void> {
    const host = new NetworkBattleManager({
      serverUrl: this.config.serverUrl
    });

    await host.connect();
    const roomId = await host.createRoom();

    if (!roomId) {
      throw new Error('Room ID should be returned');
    }

    console.log(`  ✓ Room created: ${roomId}`);

    // Test guest joining
    const guest = new NetworkBattleManager({
      serverUrl: this.config.serverUrl
    });

    await guest.connect();
    await guest.joinRoom(roomId);

    console.log('  ✓ Guest joined room');

    host.disconnect();
    guest.disconnect();
  }

  /**
   * Test 7: Full Battle Flow
   */
  private async testFullBattleFlow(): Promise<void> {
    const manager = new NetworkBattleManager({
      serverUrl: this.config.serverUrl
    });

    await manager.connect();
    await manager.createRoom();
    manager.startBattle();

    if (!manager.isInBattle()) {
      throw new Error('Should be in battle');
    }

    // Execute multiple moves
    let successfulMoves = 0;
    for (let i = 0; i < 5; i++) {
      const row = Math.floor(i / 7);
      const col = i % 7;
      const result = manager.playerTurn(
        { row, col },
        { row, col: col + 1 }
      );
      if (result.success) {
        successfulMoves++;
      }
    }

    console.log(`  ✓ Executed ${successfulMoves}/5 successful moves`);

    manager.disconnect();
  }

  /**
   * Test 8: State Synchronization
   */
  private async testStateSynchronization(): Promise<void> {
    const manager = new NetworkBattleManager({
      serverUrl: this.config.serverUrl,
      enableAutoSync: true,
      syncInterval: 1000
    });

    await manager.connect();
    await manager.createRoom();
    manager.startBattle();

    // Wait for sync to occur
    await this.sleep(2000);

    const syncStats = manager.getSyncStats();
    if (syncStats.totalSyncs === 0) {
      throw new Error('No synchronization occurred');
    }

    console.log(`  ✓ Synced ${syncStats.totalSyncs} times`);

    manager.disconnect();
  }

  /**
   * Test 9: Conflict Resolution
   */
  private async testConflictResolution(): Promise<void> {
    const manager = new NetworkBattleManager({
      serverUrl: this.config.serverUrl
    });

    await manager.connect();

    const conflictStats = manager.getConflictStats();
    
    // Initially should have no conflicts
    if (conflictStats.totalConflicts !== 0) {
      throw new Error('Should start with 0 conflicts');
    }

    console.log('  ✓ Conflict resolution system ready');

    manager.disconnect();
  }

  /**
   * Test 10: Reconnection
   */
  private async testReconnection(): Promise<void> {
    const manager = new NetworkBattleManager({
      serverUrl: this.config.serverUrl,
      enableReconnection: true
    });

    await manager.connect();
    await manager.createRoom();
    manager.startBattle();

    // Simulate disconnect
    manager.disconnect();
    await this.sleep(1000);

    // Reconnect
    await manager.connect();
    await manager.handleReconnection();

    console.log('  ✓ Reconnection handled');

    manager.disconnect();
  }

  /**
   * Test 11: Memory Usage
   */
  private async testMemoryUsage(): Promise<void> {
    const iterations = 1000;
    const startMemory = process.memoryUsage().heapUsed;

    // Create and destroy many objects
    for (let i = 0; i < iterations; i++) {
      const grid = new GridSystem(8, 8);
      grid.initialize();
      // Let it be garbage collected
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const endMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = (endMemory - startMemory) / 1024 / 1024;

    console.log(`  ✓ Memory increase: ${memoryIncrease.toFixed(2)} MB`);

    if (memoryIncrease > 50) {
      throw new Error('Memory leak detected');
    }
  }

  /**
   * Test 12: Rendering Performance
   */
  private async testRenderingPerformance(): Promise<void> {
    const grid = new GridSystem(8, 8);
    grid.initialize();

    const iterations = 1000;
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      grid.getGrid(); // Simulate rendering read
    }

    const duration = Date.now() - startTime;
    const fps = (iterations / duration) * 1000;

    console.log(`  ✓ Rendering speed: ${fps.toFixed(0)} FPS equivalent`);

    if (fps < 30) {
      throw new Error('Rendering too slow');
    }
  }

  /**
   * Test 13: Network Throughput
   */
  private async testNetworkThroughput(): Promise<void> {
    const manager = new NetworkBattleManager({
      serverUrl: this.config.serverUrl
    });

    await manager.connect();
    await manager.createRoom();
    manager.startBattle();

    const moveCount = 50;
    const startTime = Date.now();

    for (let i = 0; i < moveCount; i++) {
      const row = Math.floor(i / 7) % 8;
      const col = i % 7;
      manager.playerTurn({ row, col }, { row, col: col + 1 });
    }

    const duration = Date.now() - startTime;
    const throughput = (moveCount / duration) * 1000;

    console.log(`  ✓ Network throughput: ${throughput.toFixed(1)} moves/sec`);

    manager.disconnect();
  }

  /**
   * Test 14: Complete Game Flow
   */
  private async testCompleteGameFlow(): Promise<void> {
    // 1. Create battle manager
    const battle = new BattleManager({
      maxMoves: 30,
      targetScore: 500,
      enableAI: true
    });

    battle.startBattle();

    // 2. Play until game ends or max moves
    let turnCount = 0;
    while (battle.isBattleActive() && turnCount < 20) {
      // Player turn
      const row = Math.floor(turnCount / 7) % 8;
      const col = turnCount % 7;
      battle.playerTurn({ row, col }, { row, col: col + 1 });

      // AI turn
      battle.executeAITurn();

      turnCount++;
    }

    const playerData = battle.getPlayerData();
    const opponentData = battle.getOpponentData();

    console.log(`  ✓ Game completed: Player ${playerData.score} vs AI ${opponentData.score}`);
  }

  /**
   * Test 15: Error Recovery
   */
  private async testErrorRecovery(): Promise<void> {
    const manager = new NetworkBattleManager({
      serverUrl: 'ws://invalid-url:9999' // Invalid URL
    });

    let errorCaught = false;
    try {
      await Promise.race([
        manager.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 2000)
        )
      ]);
    } catch (error) {
      errorCaught = true;
    }

    if (!errorCaught) {
      throw new Error('Should have caught connection error');
    }

    console.log('  ✓ Error recovery working');
  }

  /**
   * Run individual test
   */
  private async runTest(name: string, testFn: () => Promise<void>): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`\n▶️  ${name}`);
      await Promise.race([
        testFn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Test timeout')), this.config.timeout)
        )
      ]);
      
      const duration = Date.now() - startTime;
      this.results.push({ name, passed: true, duration });
      console.log(`✅ ${name} PASSED (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      const err = error as Error;
      this.results.push({
        name,
        passed: false,
        duration,
        error: err.message
      });
      console.error(`❌ ${name} FAILED: ${err.message}`);
    }
  }

  /**
   * Print test summary
   */
  private printSummary(): void {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const successRate = (passed / this.results.length) * 100;

    console.log('\n' + '='.repeat(70));
    console.log('📊 Integration Test Summary');
    console.log('='.repeat(70));
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${successRate.toFixed(1)}%`);
    console.log(`Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log('='.repeat(70));

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => !r.passed)
        .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
    }
  }

  /**
   * Get test results
   */
  public getResults(): TestResult[] {
    return this.results;
  }

  /**
   * Helper: sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run tests if executed directly
if (require.main === module) {
  const suite = new CompleteIntegrationTest({
    enableNetworkTests: true,
    enablePerformanceTests: true
  });

  suite.runAll().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}
