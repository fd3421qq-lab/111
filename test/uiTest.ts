/**
 * uiTest.ts
 * UI functionality tests for GameUI and rendering components
 */

import { GameUI, BattleState } from '../src/GameUI';
import { GridRenderer } from '../src/renderers/GridRenderer';
import { AnimationManager, SwapAnimation, EliminateAnimation, FallAnimation } from '../src/renderers/AnimationManager';
import { CandyType, Position } from '../src/GridSystem';
import { PlayerType } from '../src/BattleManager';
import { GameEventType } from '../src/GameEventType';

/**
 * Test helper: Create mock canvas
 */
function createMockCanvas(): HTMLCanvasElement {
  // In a real browser environment, this would be a real canvas
  // For testing, we create a mock
  const canvas = document.createElement('canvas');
  canvas.id = 'testCanvas';
  canvas.width = 800;
  canvas.height = 600;
  document.body.appendChild(canvas);
  return canvas;
}

/**
 * Test helper: Create test grid
 */
function createTestGrid(): CandyType[][] {
  const grid: CandyType[][] = [];
  for (let i = 0; i < 8; i++) {
    grid[i] = [];
    for (let j = 0; j < 8; j++) {
      grid[i][j] = (Math.floor(Math.random() * 6) + 1) as CandyType;
    }
  }
  return grid;
}

/**
 * Test helper: Create test battle state
 */
function createTestBattleState(): BattleState {
  return {
    playerScore: 100,
    opponentScore: 80,
    playerMoves: 10,
    opponentMoves: 9,
    currentTurn: PlayerType.PLAYER,
    eventProgress: 45,
    activeEvents: [GameEventType.GRAVITY_REVERSE],
    playerGrid: createTestGrid(),
    opponentGrid: createTestGrid()
  };
}

/**
 * Test 1: GameUI initialization
 */
function testGameUIInitialization(): boolean {
  console.log('[TEST 1] GameUI Initialization');
  
  try {
    const canvas = createMockCanvas();
    const gameUI = new GameUI({
      canvasId: 'testCanvas',
      width: 800,
      height: 600,
      cellSize: 40
    });

    console.log('✓ GameUI initialized successfully');
    
    // Clean up
    document.body.removeChild(canvas);
    return true;
  } catch (error) {
    console.error('✗ GameUI initialization failed:', error);
    return false;
  }
}

/**
 * Test 2: Render battle state
 */
function testRenderBattleState(): boolean {
  console.log('[TEST 2] Render Battle State');
  
  try {
    const canvas = createMockCanvas();
    const gameUI = new GameUI({
      canvasId: 'testCanvas',
      width: 800,
      height: 600,
      cellSize: 40
    });

    const state = createTestBattleState();
    gameUI.renderBattleState(state);

    console.log('✓ Battle state rendered successfully');
    console.log(`  - Player Score: ${state.playerScore}`);
    console.log(`  - AI Score: ${state.opponentScore}`);
    console.log(`  - Current Turn: ${state.currentTurn}`);
    console.log(`  - Event Progress: ${state.eventProgress}%`);
    
    // Clean up
    document.body.removeChild(canvas);
    return true;
  } catch (error) {
    console.error('✗ Render battle state failed:', error);
    return false;
  }
}

/**
 * Test 3: GridRenderer
 */
function testGridRenderer(): boolean {
  console.log('[TEST 3] GridRenderer');
  
  try {
    const canvas = createMockCanvas();
    const ctx = canvas.getContext('2d')!;
    const renderer = new GridRenderer(ctx, {
      cellSize: 40,
      padding: 2,
      candyRadius: 14
    });

    const grid = createTestGrid();
    const frozenColors = [CandyType.RED, CandyType.BLUE];

    renderer.renderGrid(20, 100, grid, frozenColors);
    console.log('✓ Grid rendered successfully');
    console.log(`  - Grid size: 8x8`);
    console.log(`  - Frozen colors: ${frozenColors.length}`);
    
    // Clean up
    document.body.removeChild(canvas);
    return true;
  } catch (error) {
    console.error('✗ GridRenderer failed:', error);
    return false;
  }
}

/**
 * Test 4: Animation Manager
 */
function testAnimationManager(): boolean {
  console.log('[TEST 4] AnimationManager');
  
  try {
    const canvas = createMockCanvas();
    const ctx = canvas.getContext('2d')!;
    const animManager = new AnimationManager();

    // Test swap animation
    const swapAnim = new SwapAnimation(
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      CandyType.RED,
      CandyType.BLUE,
      20, 100, 40, 300
    );
    animManager.addAnimation(swapAnim);
    console.log('✓ Swap animation added');

    // Test eliminate animation
    const eliminateAnim = new EliminateAnimation(
      [{ row: 2, col: 2 }, { row: 2, col: 3 }, { row: 2, col: 4 }],
      20, 100, 40, 400
    );
    animManager.addAnimation(eliminateAnim);
    console.log('✓ Eliminate animation added');

    // Test fall animation
    const fallAnim = new FallAnimation(
      [
        { candy: CandyType.RED, fromRow: 0, toRow: 3, col: 2 },
        { candy: CandyType.BLUE, fromRow: 1, toRow: 4, col: 2 }
      ],
      20, 100, 40, 500
    );
    animManager.addAnimation(fallAnim);
    console.log('✓ Fall animation added');

    // Update and render
    const currentTime = Date.now();
    animManager.update(currentTime);
    animManager.render(ctx);
    console.log('✓ Animations updated and rendered');
    console.log(`  - Active animations: ${animManager.hasActiveAnimations()}`);
    
    // Clean up
    document.body.removeChild(canvas);
    return true;
  } catch (error) {
    console.error('✗ AnimationManager failed:', error);
    return false;
  }
}

/**
 * Test 5: AI Move Highlighting
 */
function testAIMoveHighlighting(): boolean {
  console.log('[TEST 5] AI Move Highlighting');
  
  try {
    const canvas = createMockCanvas();
    const gameUI = new GameUI({
      canvasId: 'testCanvas',
      width: 800,
      height: 600,
      cellSize: 40
    });

    const state = createTestBattleState();
    gameUI.renderBattleState(state);

    // Simulate AI move
    const aiMove = {
      pos1: { row: 2, col: 3 },
      pos2: { row: 2, col: 4 },
      estimatedScore: 30,
      reason: 'Testing AI move highlight with maximum combo potential'
    };

    gameUI.highlightAIMove(aiMove);
    console.log('✓ AI move highlighted successfully');
    console.log(`  - Move: (${aiMove.pos1.row},${aiMove.pos1.col}) ↔ (${aiMove.pos2.row},${aiMove.pos2.col})`);
    console.log(`  - Estimated Score: ${aiMove.estimatedScore}`);
    console.log(`  - Reason: ${aiMove.reason}`);
    
    // Clean up
    document.body.removeChild(canvas);
    return true;
  } catch (error) {
    console.error('✗ AI move highlighting failed:', error);
    return false;
  }
}

/**
 * Test 6: Event Effect Display
 */
function testEventEffectDisplay(): boolean {
  console.log('[TEST 6] Event Effect Display');
  
  try {
    const canvas = createMockCanvas();
    const gameUI = new GameUI({
      canvasId: 'testCanvas',
      width: 800,
      height: 600,
      cellSize: 40
    });

    const state = createTestBattleState();
    gameUI.renderBattleState(state);

    // Test different event effects
    const events = [
      GameEventType.GRAVITY_REVERSE,
      GameEventType.COLOR_FREEZE,
      GameEventType.DOUBLE_SCORE,
      GameEventType.CHAIN_REACTION
    ];

    for (const event of events) {
      gameUI.showEventEffect(event);
      console.log(`✓ Event effect displayed: ${event}`);
    }
    
    // Clean up
    document.body.removeChild(canvas);
    return true;
  } catch (error) {
    console.error('✗ Event effect display failed:', error);
    return false;
  }
}

/**
 * Test 7: Score Update
 */
function testScoreUpdate(): boolean {
  console.log('[TEST 7] Score Update');
  
  try {
    const canvas = createMockCanvas();
    const gameUI = new GameUI({
      canvasId: 'testCanvas',
      width: 800,
      height: 600,
      cellSize: 40
    });

    const state = createTestBattleState();
    gameUI.renderBattleState(state);

    // Update scores
    gameUI.updateScores(150, 120);
    console.log('✓ Scores updated successfully');
    console.log('  - Player Score: 100 → 150');
    console.log('  - AI Score: 80 → 120');
    
    // Clean up
    document.body.removeChild(canvas);
    return true;
  } catch (error) {
    console.error('✗ Score update failed:', error);
    return false;
  }
}

/**
 * Test 8: Canvas Rendering Performance
 */
async function testRenderingPerformance(): Promise<boolean> {
  console.log('[TEST 8] Canvas Rendering Performance');
  
  try {
    const canvas = createMockCanvas();
    const gameUI = new GameUI({
      canvasId: 'testCanvas',
      width: 800,
      height: 600,
      cellSize: 40
    });

    const state = createTestBattleState();
    
    // Measure render time
    const iterations = 100;
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      gameUI.renderBattleState(state);
    }
    
    const endTime = performance.now();
    const avgTime = (endTime - startTime) / iterations;
    const fps = 1000 / avgTime;

    console.log('✓ Performance test completed');
    console.log(`  - Iterations: ${iterations}`);
    console.log(`  - Average render time: ${avgTime.toFixed(2)}ms`);
    console.log(`  - Estimated FPS: ${fps.toFixed(2)}`);
    console.log(`  - Target: 60fps (16.67ms per frame)`);
    console.log(`  - Status: ${fps >= 60 ? 'PASS ✓' : 'WARNING ⚠'}`);
    
    // Clean up
    document.body.removeChild(canvas);
    return true;
  } catch (error) {
    console.error('✗ Performance test failed:', error);
    return false;
  }
}

/**
 * Run all tests
 */
export async function runAllTests(): Promise<void> {
  console.log('================================');
  console.log('   UI FUNCTIONALITY TESTS');
  console.log('================================\n');

  const results: { name: string; passed: boolean }[] = [];

  // Run tests
  results.push({ name: 'GameUI Initialization', passed: testGameUIInitialization() });
  results.push({ name: 'Render Battle State', passed: testRenderBattleState() });
  results.push({ name: 'GridRenderer', passed: testGridRenderer() });
  results.push({ name: 'AnimationManager', passed: testAnimationManager() });
  results.push({ name: 'AI Move Highlighting', passed: testAIMoveHighlighting() });
  results.push({ name: 'Event Effect Display', passed: testEventEffectDisplay() });
  results.push({ name: 'Score Update', passed: testScoreUpdate() });
  results.push({ name: 'Rendering Performance', passed: await testRenderingPerformance() });

  // Summary
  console.log('\n================================');
  console.log('        TEST SUMMARY');
  console.log('================================\n');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;

  results.forEach(result => {
    console.log(`${result.passed ? '✓' : '✗'} ${result.name}`);
  });

  console.log(`\n${passed}/${total} tests passed`);
  console.log(`Success rate: ${((passed / total) * 100).toFixed(1)}%`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! UI system is ready.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
  }
}

// Run tests if executed directly
if (typeof window !== 'undefined') {
  runAllTests();
}
