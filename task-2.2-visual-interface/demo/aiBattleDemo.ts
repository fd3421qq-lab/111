/**
 * AI 对战演示
 * 展示完整的 AI 对战流程
 */

import { BattleManager, PlayerType, AIStrategy } from '../src/BattleManager.js';
import { Position } from '../src/GridSystem.js';

/**
 * 模拟玩家寻找有效移动
 */
function findPlayerMove(battle: BattleManager): { pos1: Position; pos2: Position } | null {
  const playerGrid = battle.getPlayerData().grid;
  const gridSize = playerGrid.getSize();
  
  // 遍历网格查找可能的移动
  for (let row = 0; row < gridSize.rows; row++) {
    for (let col = 0; col < gridSize.cols; col++) {
      const pos1: Position = { row, col };
      
      // 尝试右边
      if (col < gridSize.cols - 1) {
        const pos2: Position = { row, col: col + 1 };
        // 预检查是否能产生匹配
        const testResult = battle.playerTurn(pos1, pos2);
        if (testResult.success) {
          return { pos1, pos2 };
        }
      }
      
      // 尝试下边
      if (row < gridSize.rows - 1) {
        const pos2: Position = { row: row + 1, col };
        const testResult = battle.playerTurn(pos1, pos2);
        if (testResult.success) {
          return { pos1, pos2 };
        }
      }
    }
  }
  
  return null;
}

/**
 * 演示 1: 基础 AI 对战
 */
function demo1_BasicAIBattle(): void {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║      演示 1: 基础 AI 对战                     ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  
  const battle = new BattleManager({
    maxMoves: 10,
    targetScore: 500,
    eventProgressMax: 60,
    enableAI: true
  });
  
  battle.startBattle();
  
  console.log('AI 启用状态:', battle.isAIEnabled() ? '✅ 已启用' : '❌ 未启用');
  console.log('AI 当前策略:', battle.getAIStrategy());
  
  let turnCount = 0;
  
  while (battle.isBattleActive() && turnCount < 20) {
    turnCount++;
    console.log(`\n━━━━━━━━━━━━━━━━ 第 ${turnCount} 轮 ━━━━━━━━━━━━━━━━`);
    
    if (battle.getCurrentTurn() === PlayerType.PLAYER) {
      console.log('\n👤 玩家回合');
      const move = findPlayerMove(battle);
      
      if (!move) {
        console.log('❌ 玩家无可用移动');
        break;
      }
      
      const result = battle.playerTurn(move.pos1, move.pos2);
      if (result.success && result.swapResult) {
        console.log(`✅ 玩家移动成功`);
        console.log(`   得分: +${result.swapResult.score}`);
        console.log(`   连击: x${result.swapResult.combo}`);
      }
    } else {
      console.log('\n🤖 AI 回合');
      const result = battle.executeAITurn();
      
      if (result && result.success && result.swapResult) {
        console.log(`✅ AI 移动成功`);
        console.log(`   得分: +${result.swapResult.score}`);
        console.log(`   连击: x${result.swapResult.combo}`);
      } else {
        console.log('❌ AI 移动失败');
        break;
      }
    }
    
    // 显示当前状态
    const playerData = battle.getPlayerData();
    const opponentData = battle.getOpponentData();
    console.log(`\n📊 当前比分:`);
    console.log(`   玩家: ${playerData.score} 分 (${playerData.moves} 步)`);
    console.log(`   AI:   ${opponentData.score} 分 (${opponentData.moves} 步)`);
  }
  
  console.log('\n' + '═'.repeat(50));
  console.log(battle.getBattleSummary());
}

/**
 * 演示 2: 不同 AI 策略对比
 */
function demo2_CompareAIStrategies(): void {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║      演示 2: 不同 AI 策略对比                 ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  
  const strategies = [
    AIStrategy.AGGRESSIVE,
    AIStrategy.BALANCED,
    AIStrategy.CONSERVATIVE
  ];
  
  strategies.forEach(strategy => {
    console.log(`\n▶ 测试策略: ${strategy}`);
    console.log('─'.repeat(50));
    
    const battle = new BattleManager({
      maxMoves: 5,
      targetScore: 300,
      enableAI: true
    });
    
    battle.startBattle();
    battle.setAIStrategy(strategy);
    
    console.log(`策略描述: ${battle.getAIDebugInfo()}`);
    
    // 执行几次 AI 移动
    let aiTurnCount = 0;
    while (battle.isBattleActive() && aiTurnCount < 3) {
      // 跳过玩家回合
      if (battle.getCurrentTurn() === PlayerType.PLAYER) {
        const move = findPlayerMove(battle);
        if (move) {
          battle.playerTurn(move.pos1, move.pos2);
        }
      }
      
      // 执行 AI 回合
      if (battle.getCurrentTurn() === PlayerType.OPPONENT) {
        const result = battle.executeAITurn();
        if (result && result.success && result.swapResult) {
          aiTurnCount++;
          console.log(`  AI 移动 ${aiTurnCount}: 得分 ${result.swapResult.score}, 连击 x${result.swapResult.combo}`);
        }
      }
    }
    
    const opponentData = battle.getOpponentData();
    console.log(`  总得分: ${opponentData.score}`);
  });
}

/**
 * 演示 3: AI 策略自动切换
 */
function demo3_AIStrategyAutoSwitch(): void {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║      演示 3: AI 策略自动切换                  ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  
  const battle = new BattleManager({
    maxMoves: 15,
    targetScore: 600,
    enableAI: true
  });
  
  battle.startBattle();
  
  // 设置 50% 的策略切换概率（演示用）
  battle.setAIStrategyChangeChance(0.5);
  
  console.log('AI 策略切换概率: 50%');
  console.log('观察 AI 在对战中的策略变化...\n');
  
  let turnCount = 0;
  const strategyHistory: string[] = [];
  
  while (battle.isBattleActive() && turnCount < 15) {
    if (battle.getCurrentTurn() === PlayerType.PLAYER) {
      const move = findPlayerMove(battle);
      if (move) {
        battle.playerTurn(move.pos1, move.pos2);
      }
    } else {
      const currentStrategy = battle.getAIStrategy();
      if (currentStrategy) {
        strategyHistory.push(currentStrategy);
      }
      
      const result = battle.executeAITurn();
      if (result && result.success) {
        turnCount++;
        console.log(`回合 ${turnCount}: 使用策略 ${currentStrategy}`);
      }
    }
  }
  
  console.log('\n策略使用统计:');
  const strategyCounts: { [key: string]: number } = {};
  strategyHistory.forEach(s => {
    strategyCounts[s] = (strategyCounts[s] || 0) + 1;
  });
  
  Object.entries(strategyCounts).forEach(([strategy, count]) => {
    console.log(`  ${strategy}: ${count} 次`);
  });
}

/**
 * 演示 4: 完整 AI 对战（玩家 vs AI）
 */
function demo4_FullAIBattle(): void {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║      演示 4: 完整 AI 对战（10回合）           ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  
  const battle = new BattleManager({
    maxMoves: 10,
    targetScore: 800,
    eventProgressMax: 50,
    enableAI: true
  });
  
  battle.startBattle();
  
  console.log('🎮 开始完整对战...\n');
  
  let round = 0;
  
  while (battle.isBattleActive() && round < 20) {
    round++;
    
    if (battle.getCurrentTurn() === PlayerType.PLAYER) {
      const move = findPlayerMove(battle);
      if (!move) {
        console.log('❌ 玩家无可用移动，对战结束');
        break;
      }
      
      const result = battle.playerTurn(move.pos1, move.pos2);
      if (result.success && result.swapResult) {
        console.log(`\n👤 玩家第 ${battle.getPlayerData().moves} 步`);
        console.log(`   移动: (${move.pos1.row},${move.pos1.col}) ↔ (${move.pos2.row},${move.pos2.col})`);
        console.log(`   得分: ${result.swapResult.score}, 连击: x${result.swapResult.combo}`);
      }
    } else {
      const result = battle.executeAITurn();
      if (!result || !result.success) {
        console.log('❌ AI 无可用移动，对战结束');
        break;
      }
    }
    
    // 每3回合显示一次状态
    if (round % 3 === 0) {
      const playerData = battle.getPlayerData();
      const opponentData = battle.getOpponentData();
      console.log(`\n📊 第 ${round} 回合后比分:`);
      console.log(`   玩家: ${playerData.score} 分`);
      console.log(`   AI:   ${opponentData.score} 分`);
    }
  }
  
  console.log('\n' + '═'.repeat(50));
  console.log('🏁 对战结束！');
  console.log(battle.getBattleSummary());
}

// ==================== 运行所有演示 ====================

function runAllDemos(): void {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║      AI 对战系统演示程序                      ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log('\n');
  
  try {
    // 演示 1: 基础 AI 对战
    demo1_BasicAIBattle();
    
    // 演示 2: 不同 AI 策略对比
    demo2_CompareAIStrategies();
    
    // 演示 3: AI 策略自动切换
    demo3_AIStrategyAutoSwitch();
    
    // 演示 4: 完整 AI 对战
    demo4_FullAIBattle();
    
    console.log('\n');
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║      所有演示完成！                            ║');
    console.log('╚════════════════════════════════════════════════╝');
    console.log('\n');
  } catch (error) {
    console.error('演示过程中出现错误:', error);
  }
}

// 运行演示
runAllDemos();
