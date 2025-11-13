/**
 * AI 对手演示
 * 展示 BattleManager 的 AI 功能
 */

import { BattleManager, PlayerType } from './BattleManager.js';
import { Position } from './GridSystem.js';

/**
 * 运行 AI 对战演示
 */
function runAIDemo() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║       三消对战系统 - AI 对手演示                         ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // 测试不同难度的 AI
  testAIDifficulty('easy');
  console.log('\n' + '='.repeat(60) + '\n');
  testAIDifficulty('medium');
  console.log('\n' + '='.repeat(60) + '\n');
  testAIDifficulty('hard');
}

/**
 * 测试指定难度的 AI
 */
function testAIDifficulty(difficulty: 'easy' | 'medium' | 'hard') {
  console.log(`【测试 AI 难度: ${difficulty.toUpperCase()}】\n`);

  // 创建带 AI 的对战管理器
  const battle = new BattleManager({
    maxMoves: 10,
    targetScore: 500,
    eventProgressMax: 60,
    enableAI: true,
    aiDifficulty: difficulty
  });

  battle.startBattle();
  console.log(`AI 已启用，难度: ${difficulty}`);
  console.log(battle.getBattleSummary());

  let turnCount = 0;
  const maxTurns = 20;

  while (battle.isBattleActive() && turnCount < maxTurns) {
    const isPlayerTurn = battle.getCurrentTurn() === PlayerType.PLAYER;

    if (isPlayerTurn) {
      // 玩家回合 - 随机尝试移动
      const result = tryPlayerMove(battle);
      if (result.success) {
        turnCount++;
        console.log(`\n✓ 玩家第 ${turnCount} 回合: ${result.message}`);
        if (result.eventTriggered) {
          console.log(`  🎉 触发事件: ${result.eventTriggered}`);
        }
        logScores(battle);
      }
    } else {
      // AI 回合
      const result = battle.executeAITurn();
      if (result && result.success) {
        turnCount++;
        console.log(`\n✓ AI 第 ${turnCount} 回合: ${result.message}`);
        if (result.eventTriggered) {
          console.log(`  🎉 触发事件: ${result.eventTriggered}`);
        }
        logScores(battle);
      } else {
        console.log('\n⚠ AI 未找到有效移动，跳过');
        break;
      }
    }

    // 每5回合显示一次详细状态
    if (turnCount % 5 === 0) {
      console.log('\n' + battle.getBattleSummary());
    }
  }

  // 显示最终结果
  console.log('\n【最终结果】');
  const playerData = battle.getPlayerData();
  const opponentData = battle.getOpponentData();
  console.log(`玩家: ${playerData.score} 分 (${playerData.moves} 步)`);
  console.log(`AI:   ${opponentData.score} 分 (${opponentData.moves} 步)`);

  const eventBar = battle.getGameManager().getEventBar();
  console.log(`事件进度: ${eventBar.getProgressPercentage().toFixed(1)}%`);
  console.log(`触发事件: ${eventBar.getTriggeredEventsCount()}/${eventBar.getEventSequence().length}`);
}

/**
 * 尝试玩家移动
 */
function tryPlayerMove(battle: BattleManager) {
  const gridSize = battle.getPlayerData().grid.getSize();
  
  // 随机尝试多次
  for (let attempt = 0; attempt < 50; attempt++) {
    const row = Math.floor(Math.random() * gridSize.rows);
    const col = Math.floor(Math.random() * gridSize.cols);
    
    // 随机选择方向
    const directions = [];
    if (col < gridSize.cols - 1) directions.push('right');
    if (row < gridSize.rows - 1) directions.push('down');
    
    if (directions.length === 0) continue;
    
    const direction = directions[Math.floor(Math.random() * directions.length)];
    
    const pos1: Position = { row, col };
    const pos2: Position = direction === 'right' 
      ? { row, col: col + 1 }
      : { row: row + 1, col };

    const result = battle.playerTurn(pos1, pos2);
    if (result.success) {
      return result;
    }
  }

  return {
    success: false,
    message: '未找到有效移动'
  };
}

/**
 * 记录分数
 */
function logScores(battle: BattleManager) {
  const playerData = battle.getPlayerData();
  const opponentData = battle.getOpponentData();
  console.log(`  当前分数: 玩家 ${playerData.score} | AI ${opponentData.score}`);
}

// 运行演示
runAIDemo();
