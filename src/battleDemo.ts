/**
 * 对战系统演示
 * 简化版本，展示核心功能
 */

import { BattleManager, PlayerType } from './BattleManager.js';
import { Position } from './GridSystem.js';

/**
 * 运行对战演示
 */
function runBattleDemo() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║       三消对战系统 - 功能演示                            ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // 创建对战管理器
  const battle = new BattleManager({
    maxMoves: 15,
    targetScore: 600,
    eventProgressMax: 60
  });

  // 开始对战
  battle.startBattle();

  // 显示初始状态
  console.log(battle.getBattleSummary());
  battle.printGrids();

  // 模拟几个回合
  console.log('\n【开始模拟对战】\n');

  const gridSize = battle.getPlayerData().grid.getSize();
  let turnCount = 0;
  const maxTurns = 10;

  while (battle.isBattleActive() && turnCount < maxTurns) {
    const isPlayerTurn = battle.getCurrentTurn() === PlayerType.PLAYER;
    
    console.log(`\n--- 第 ${turnCount + 1} 回合 (${isPlayerTurn ? '玩家' : '对手'}) ---`);

    // 随机尝试几次
    let success = false;
    for (let attempt = 0; attempt < 50 && !success; attempt++) {
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

      const result = isPlayerTurn 
        ? battle.playerTurn(pos1, pos2)
        : battle.opponentTurn(pos1, pos2);

      if (result.success) {
        success = true;
        turnCount++;
        
        if (result.eventTriggered) {
          console.log(`🎉 触发事件: ${result.eventTriggered}`);
        }
        
        // 显示当前分数
        const playerData = battle.getPlayerData();
        const opponentData = battle.getOpponentData();
        console.log(`玩家: ${playerData.score} 分 | 对手: ${opponentData.score} 分`);
      }
    }

    if (!success) {
      console.log('⚠ 未找到有效移动，跳过');
      break;
    }
  }

  // 显示最终状态
  console.log('\n【最终状态】');
  console.log(battle.getBattleSummary());

  // 显示事件统计
  const gameManager = battle.getGameManager();
  const eventBar = gameManager.getEventBar();
  console.log('\n【事件系统】');
  console.log(`事件序列: ${eventBar.getEventSequence().join(' → ')}`);
  console.log(`已触发: ${eventBar.getTriggeredEventsCount()}/${eventBar.getEventSequence().length}`);
  console.log(`当前活动事件: ${gameManager.getActiveEvents().join(', ') || '无'}`);

  console.log('\n✅ 演示完成！');
}

// 运行演示
runBattleDemo();
