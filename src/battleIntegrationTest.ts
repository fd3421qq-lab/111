/**
 * 对战系统集成测试
 * 验证 GridSystem + GameManager + BattleManager 的完整集成
 */

import { BattleManager, PlayerType } from './BattleManager.js';
import { Position } from './GridSystem.js';

/**
 * 运行完整的对战集成测试
 */
function runBattleIntegrationTest() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║       三消对战系统 - 集成测试                            ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // 测试1: 基础对战流程
  testBasicBattle();

  // 测试2: 事件触发测试
  testEventTriggers();

  // 测试3: 完整对战模拟
  testFullBattle();

  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║       所有集成测试完成！                                  ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
}

/**
 * 测试1: 基础对战流程
 */
function testBasicBattle() {
  console.log('【测试 1】基础对战流程');
  console.log('─'.repeat(60));

  const battle = new BattleManager({
    maxMoves: 10,
    targetScore: 500,
    eventProgressMax: 100
  });

  // 开始对战
  battle.startBattle();
  console.log('✓ 对战成功启动');

  // 检查初始状态
  console.log(`✓ 当前回合: ${battle.getCurrentTurn()}`);
  console.log(`✓ 对战状态: ${battle.isBattleActive() ? '活跃' : '未活跃'}`);

  // 打印初始网格
  battle.printGrids();

  // 尝试几次操作
  const playerData = battle.getPlayerData();
  const gridSize = playerData.grid.getSize();

  console.log('\n尝试玩家操作...');
  
  // 尝试多次交换直到成功
  let attempts = 0;
  let success = false;
  while (attempts < 20 && !success) {
    const row = Math.floor(Math.random() * gridSize.rows);
    const col = Math.floor(Math.random() * gridSize.cols);
    
    // 尝试向右交换
    if (col < gridSize.cols - 1) {
      const pos1: Position = { row, col };
      const pos2: Position = { row, col: col + 1 };
      const result = battle.playerTurn(pos1, pos2);
      
      if (result.success) {
        console.log(`✓ 交换成功: ${result.message}`);
        success = true;
        break;
      }
    }
    
    attempts++;
  }

  if (!success) {
    console.log('⚠ 尝试20次后未找到有效交换');
  }

  console.log('\n' + battle.getBattleSummary());
  console.log('✅ 测试1完成\n');
}

/**
 * 测试2: 事件触发测试
 */
function testEventTriggers() {
  console.log('【测试 2】事件触发测试');
  console.log('─'.repeat(60));

  const battle = new BattleManager({
    maxMoves: 50,
    targetScore: 2000,
    eventProgressMax: 50  // 降低阈值，更容易触发事件
  });

  battle.startBattle();

  const playerData = battle.getPlayerData();
  const gridSize = playerData.grid.getSize();

  console.log('模拟快速推进事件系统...\n');

  let turnCount = 0;
  let eventsTriggered = 0;
  const maxTurns = 30;

  while (turnCount < maxTurns && battle.isBattleActive()) {
    // 随机尝试交换
    for (let i = 0; i < 10; i++) {
      const row = Math.floor(Math.random() * gridSize.rows);
      const col = Math.floor(Math.random() * gridSize.cols);
      
      // 随机选择方向
      const direction = Math.random() > 0.5 ? 'right' : 'down';
      let pos2: Position;
      
      if (direction === 'right' && col < gridSize.cols - 1) {
        pos2 = { row, col: col + 1 };
      } else if (direction === 'down' && row < gridSize.rows - 1) {
        pos2 = { row: row + 1, col };
      } else {
        continue;
      }

      const pos1: Position = { row, col };
      const result = battle.playerTurn(pos1, pos2);

      if (result.success) {
        turnCount++;
        if (result.eventTriggered) {
          eventsTriggered++;
          console.log(`🎉 第 ${turnCount} 回合触发事件: ${result.eventTriggered}`);
        }
        break;
      }
    }
  }

  console.log(`\n总回合数: ${turnCount}`);
  console.log(`触发事件: ${eventsTriggered} 次`);
  console.log(battle.getBattleSummary());
  console.log('✅ 测试2完成\n');
}

/**
 * 测试3: 完整对战模拟
 */
function testFullBattle() {
  console.log('【测试 3】完整对战模拟');
  console.log('─'.repeat(60));

  const battle = new BattleManager({
    maxMoves: 20,
    targetScore: 800,
    eventProgressMax: 80
  });

  battle.startBattle();

  const playerData = battle.getPlayerData();
  const opponentData = battle.getOpponentData();
  const gridSize = playerData.grid.getSize();

  console.log('模拟玩家 vs 对手对战...\n');

  let turnCount = 0;
  const maxTurns = 40; // 双方各20步
  let consecutiveFailures = 0;
  const maxFailures = 5;

  while (battle.isBattleActive() && turnCount < maxTurns && consecutiveFailures < maxFailures) {
    const isPlayerTurn = battle.getCurrentTurn() === PlayerType.PLAYER;
    const currentPlayer = isPlayerTurn ? playerData : opponentData;
    const currentGrid = currentPlayer.grid;

    // 智能寻找有效移动
    let foundMove = false;
    let attempts = 0;
    const maxAttempts = gridSize.rows * gridSize.cols * 2;
    
    // 尝试系统搜索有效移动
    for (let row = 0; row < gridSize.rows && !foundMove && attempts < maxAttempts; row++) {
      for (let col = 0; col < gridSize.cols && !foundMove && attempts < maxAttempts; col++) {
        attempts++;
        const pos1: Position = { row, col };
        
        // 尝试右边
        if (col < gridSize.cols - 1) {
          const pos2: Position = { row, col: col + 1 };
          const result = isPlayerTurn 
            ? battle.playerTurn(pos1, pos2)
            : battle.opponentTurn(pos1, pos2);
          
          if (result.success) {
            foundMove = true;
            turnCount++;
            
            // 显示重要信息
            if (result.eventTriggered) {
              console.log(`  → 事件触发: ${result.eventTriggered}`);
            }
            
            // 每5回合显示一次状态
            if (turnCount % 5 === 0) {
              const player = battle.getPlayerData();
              const opponent = battle.getOpponentData();
              console.log(`\n[第 ${turnCount} 回合]`);
              console.log(`  玩家: ${player.score} 分`);
              console.log(`  对手: ${opponent.score} 分`);
              
              const eventBar = battle.getGameManager().getEventBar();
              console.log(`  事件进度: ${eventBar.getProgressPercentage().toFixed(1)}%`);
            }
            
            break;
          }
        }
        
        // 尝试下边
        if (row < gridSize.rows - 1 && !foundMove) {
          const pos2: Position = { row: row + 1, col };
          const result = isPlayerTurn 
            ? battle.playerTurn(pos1, pos2)
            : battle.opponentTurn(pos1, pos2);
          
          if (result.success) {
            foundMove = true;
            turnCount++;
            
            if (result.eventTriggered) {
              console.log(`  → 事件触发: ${result.eventTriggered}`);
            }
            
            if (turnCount % 5 === 0) {
              const player = battle.getPlayerData();
              const opponent = battle.getOpponentData();
              console.log(`\n[第 ${turnCount} 回合]`);
              console.log(`  玩家: ${player.score} 分`);
              console.log(`  对手: ${opponent.score} 分`);
              
              const eventBar = battle.getGameManager().getEventBar();
              console.log(`  事件进度: ${eventBar.getProgressPercentage().toFixed(1)}%`);
            }
            
            break;
          }
        }
      }
    }

    if (!foundMove) {
      console.log(`\n⚠ ${isPlayerTurn ? '玩家' : '对手'} 无可用移动`);
      consecutiveFailures++;
    } else {
      consecutiveFailures = 0;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(battle.getBattleSummary());
  
  // 显示事件统计
  const gameManager = battle.getGameManager();
  const eventBar = gameManager.getEventBar();
  console.log('\n【事件系统统计】');
  console.log(`触发事件数: ${eventBar.getTriggeredEventsCount()}/${eventBar.getEventSequence().length}`);
  console.log(`活动事件: ${gameManager.getActiveEvents().join(', ') || '无'}`);
  
  console.log('\n✅ 测试3完成\n');
}

// 运行测试
runBattleIntegrationTest();
