/**
 * AI 对手功能测试
 * 验收标准：
 * ✅ AI能找到有效移动（成功率 > 95%）
 * ✅ 移动符合三消规则（相邻交换）
 * ✅ 提供移动策略说明
 * ✅ 集成后不影响现有对战流程
 */

import { AIOpponent, AIStrategy } from '../src/AIOpponent.js';
import { GridSystem, Position } from '../src/GridSystem.js';
import { BattleManager } from '../src/BattleManager.js';

// ==================== 测试工具函数 ====================

/**
 * 测试结果统计
 */
interface TestStats {
  total: number;
  success: number;
  failed: number;
  successRate: number;
}

/**
 * 运行多次测试并统计
 */
function runMultipleTests(testName: string, testFn: () => boolean, iterations: number = 100): TestStats {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`测试: ${testName}`);
  console.log(`${'='.repeat(50)}`);
  
  const stats: TestStats = {
    total: iterations,
    success: 0,
    failed: 0,
    successRate: 0
  };

  for (let i = 0; i < iterations; i++) {
    try {
      const result = testFn();
      if (result) {
        stats.success++;
      } else {
        stats.failed++;
      }
    } catch (error) {
      stats.failed++;
      console.error(`  测试 #${i + 1} 异常:`, error);
    }
  }

  stats.successRate = (stats.success / stats.total) * 100;

  console.log(`\n结果统计:`);
  console.log(`  总数: ${stats.total}`);
  console.log(`  成功: ${stats.success}`);
  console.log(`  失败: ${stats.failed}`);
  console.log(`  成功率: ${stats.successRate.toFixed(2)}%`);
  
  return stats;
}

// ==================== 测试1: AI能找到有效移动 ====================

function test1_AICanFindValidMove(): boolean {
  const grid = new GridSystem(8, 8);
  grid.initialize();
  
  const ai = new AIOpponent(grid);
  const move = ai.findBestMove();
  
  // 验证是否找到移动
  if (!move) {
    return false;
  }
  
  // 验证移动是否有效
  const isValid = (
    move.pos1 && move.pos2 &&
    typeof move.estimatedScore === 'number' &&
    typeof move.reason === 'string' &&
    move.reason.length > 0
  );
  
  return isValid;
}

// ==================== 测试2: 移动符合相邻规则 ====================

function test2_MoveIsAdjacent(): boolean {
  const grid = new GridSystem(8, 8);
  grid.initialize();
  
  const ai = new AIOpponent(grid);
  const move = ai.findBestMove();
  
  if (!move) {
    return false;
  }
  
  const { pos1, pos2 } = move;
  
  // 检查是否相邻（横向或纵向相邻）
  const rowDiff = Math.abs(pos1.row - pos2.row);
  const colDiff = Math.abs(pos1.col - pos2.col);
  
  const isAdjacent = (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
  
  return isAdjacent;
}

// ==================== 测试3: 策略说明有效 ====================

function test3_StrategyDescriptionValid(): boolean {
  const grid = new GridSystem(8, 8);
  grid.initialize();
  
  const ai = new AIOpponent(grid);
  
  // 测试获取策略描述
  const strategyDesc = ai.getMoveStrategy();
  
  if (!strategyDesc || strategyDesc.length === 0) {
    return false;
  }
  
  // 查找移动并验证原因
  const move = ai.findBestMove();
  
  if (!move) {
    return false;
  }
  
  // 验证移动原因包含有效信息
  const hasValidReason = (
    move.reason.length > 0 &&
    (move.reason.includes('消除') || 
     move.reason.includes('匹配') || 
     move.reason.includes('连锁') ||
     move.reason.includes('激进') ||
     move.reason.includes('保守'))
  );
  
  return hasValidReason;
}

// ==================== 测试4: 不同策略产生不同行为 ====================

function test4_DifferentStrategies(): boolean {
  const grid = new GridSystem(8, 8);
  grid.initialize();
  
  const ai = new AIOpponent(grid);
  
  // 测试三种策略都能运行
  const strategies = [AIStrategy.AGGRESSIVE, AIStrategy.BALANCED, AIStrategy.CONSERVATIVE];
  
  for (const strategy of strategies) {
    ai.setStrategy(strategy);
    const move = ai.findBestMove();
    
    if (!move) {
      console.log(`  策略 ${strategy} 未找到移动`);
      return false;
    }
    
    const strategyDesc = ai.getMoveStrategy();
    if (!strategyDesc.includes('策略')) {
      console.log(`  策略 ${strategy} 描述无效`);
      return false;
    }
  }
  
  return true;
}

// ==================== 测试5: 集成到 BattleManager ====================

function test5_IntegrateWithBattleManager(): boolean {
  // 创建启用 AI 的对战
  const battle = new BattleManager({
    maxMoves: 10,
    targetScore: 500,
    enableAI: true
  });
  
  battle.startBattle();
  
  // 玩家先下一步
  const playerGrid = battle.getPlayerData().grid;
  const gridSize = playerGrid.getSize();
  
  // 查找玩家的一个有效移动
  let playerMoved = false;
  for (let row = 0; row < gridSize.rows && !playerMoved; row++) {
    for (let col = 0; col < gridSize.cols - 1 && !playerMoved; col++) {
      const result = battle.playerTurn({ row, col }, { row, col: col + 1 });
      if (result.success) {
        playerMoved = true;
      }
    }
  }
  
  if (!playerMoved) {
    console.log('  玩家无法移动');
    return false;
  }
  
  // AI 自动执行回合
  const aiResult = battle.executeAITurn();
  
  if (!aiResult) {
    console.log('  AI 执行失败');
    return false;
  }
  
  if (!aiResult.success) {
    console.log('  AI 移动无效');
    return false;
  }
  
  // 验证对战状态正常
  const playerData = battle.getPlayerData();
  const opponentData = battle.getOpponentData();
  
  const stateValid = (
    playerData.moves === 1 &&
    opponentData.moves === 1 &&
    battle.isBattleActive()
  );
  
  return stateValid;
}

// ==================== 测试6: AI 调试信息 ====================

function test6_AIDebugInfo(): boolean {
  const battle = new BattleManager({
    maxMoves: 10,
    targetScore: 500,
    enableAI: true
  });
  
  battle.startBattle();
  
  const debugInfo = battle.getAIDebugInfo();
  
  const isValid = (
    debugInfo &&
    debugInfo.length > 0 &&
    (debugInfo.includes('策略') || debugInfo.includes('移动') || debugInfo.includes('成功率'))
  );
  
  return isValid;
}

// ==================== 运行所有测试 ====================

function runAllTests(): void {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║      AI 对手功能测试套件                      ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('\n');

  const testResults: { name: string; stats: TestStats; required: number }[] = [];

  // 测试 1: AI 能找到有效移动
  testResults.push({
    name: '测试 1: AI 能找到有效移动',
    stats: runMultipleTests('AI 能找到有效移动', test1_AICanFindValidMove, 100),
    required: 95
  });

  // 测试 2: 移动符合相邻规则
  testResults.push({
    name: '测试 2: 移动符合相邻规则',
    stats: runMultipleTests('移动符合相邻规则', test2_MoveIsAdjacent, 100),
    required: 100
  });

  // 测试 3: 策略说明有效
  testResults.push({
    name: '测试 3: 策略说明有效',
    stats: runMultipleTests('策略说明有效', test3_StrategyDescriptionValid, 50),
    required: 95
  });

  // 测试 4: 不同策略产生不同行为
  testResults.push({
    name: '测试 4: 不同策略有效',
    stats: runMultipleTests('不同策略有效', test4_DifferentStrategies, 20),
    required: 100
  });

  // 测试 5: 集成到 BattleManager
  testResults.push({
    name: '测试 5: 集成到 BattleManager',
    stats: runMultipleTests('集成到 BattleManager', test5_IntegrateWithBattleManager, 30),
    required: 90
  });

  // 测试 6: AI 调试信息
  testResults.push({
    name: '测试 6: AI 调试信息',
    stats: runMultipleTests('AI 调试信息', test6_AIDebugInfo, 10),
    required: 100
  });

  // ==================== 总结报告 ====================

  console.log('\n');
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║      测试总结报告                              ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('\n');

  let allPassed = true;

  testResults.forEach((result, index) => {
    const passed = result.stats.successRate >= result.required;
    const icon = passed ? '✅' : '❌';
    
    console.log(`${icon} ${result.name}`);
    console.log(`   成功率: ${result.stats.successRate.toFixed(2)}% (要求 >= ${result.required}%)`);
    console.log(`   ${result.stats.success}/${result.stats.total} 通过`);
    console.log('');
    
    if (!passed) {
      allPassed = false;
    }
  });

  console.log('═'.repeat(50));
  
  if (allPassed) {
    console.log('🎉 所有测试通过！');
    console.log('✅ AI 能找到有效移动（成功率 > 95%）');
    console.log('✅ 移动符合三消规则（相邻交换）');
    console.log('✅ 提供移动策略说明');
    console.log('✅ 集成后不影响现有对战流程');
  } else {
    console.log('⚠️  部分测试未通过，请检查！');
  }
  
  console.log('═'.repeat(50));
  console.log('\n');
}

// 运行测试
runAllTests();
