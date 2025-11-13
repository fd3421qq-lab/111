import { GameManager } from './GameManager.js';
import { GameEventType } from './GameEventType.js';

/**
 * 演示事件系统的使用
 */
function runDemo() {
  console.log('========================================');
  console.log('三消对战游戏 - 事件系统演示');
  console.log('========================================\n');

  // 创建自定义事件序列
  const customEvents: GameEventType[] = [
    GameEventType.COMBO_BONUS,
    GameEventType.GRAVITY_REVERSE,
    GameEventType.FROZEN_COLORS,
    GameEventType.OBSTACLE_GENERATE,
    GameEventType.SPEED_UP
  ];

  // 初始化游戏管理器（进度条最大值100，自定义事件序列）
  const gameManager = new GameManager(100, customEvents);

  // 注册事件监听器
  gameManager.onEvent(GameEventType.COMBO_BONUS, (event) => {
    console.log(`[回调] ${event} 触发！现在可以获得连击加成了！`);
  });

  gameManager.onEvent(GameEventType.GRAVITY_REVERSE, (event) => {
    console.log(`[回调] ${event} 触发！游戏变得更有挑战性了！`);
  });

  // 开始游戏
  gameManager.startGame();
  console.log('\n');

  // 模拟游戏过程：玩家得分，触发事件
  console.log('--- 开始模拟游戏过程 ---\n');

  // 第一轮：三消得分10分
  console.log('玩家完成一次三消，获得10分');
  gameManager.addScore(10);
  console.log('');

  // 第二轮：四消得分15分
  console.log('玩家完成一次四消，获得15分');
  gameManager.addScore(15);
  console.log('');

  // 第三轮：连击得分8分
  console.log('玩家完成连击，获得8分');
  gameManager.addScore(8);
  console.log('');

  // 第四轮：大型连击得分25分
  console.log('玩家完成大型连击，获得25分');
  gameManager.addScore(25);
  console.log('');

  // 第五轮：继续得分20分
  console.log('玩家继续消除，获得20分');
  gameManager.addScore(20);
  console.log('');

  // 第六轮：获得30分
  console.log('玩家完成完美消除，获得30分');
  gameManager.addScore(30);
  console.log('');

  // 显示当前游戏状态
  console.log('\n--- 当前游戏状态 ---');
  console.log(gameManager.getGameSummary());
  console.log('');

  // 显示事件条详细信息
  const eventBar = gameManager.getEventBar();
  console.log('--- 事件条详细信息 ---');
  console.log(`当前进度: ${eventBar.getCurrentProgress()}/${eventBar.getMaxProgress()}`);
  console.log(`进度百分比: ${eventBar.getProgressPercentage().toFixed(1)}%`);
  console.log(`已触发事件: ${eventBar.getTriggeredEventsCount()}/${eventBar.getEventSequence().length}`);
  console.log(`下一个事件: ${eventBar.getNextEvent() || '无'}`);
  console.log(`到下一个事件还需: ${eventBar.getProgressToNextEvent().toFixed(1)}分`);
  console.log(`剩余事件: ${eventBar.getRemainingEventsCount()}个`);
  console.log('');

  // 显示所有事件序列
  console.log('--- 完整事件序列 ---');
  const allEvents = eventBar.getEventSequence();
  allEvents.forEach((event, index) => {
    const status = index < eventBar.getTriggeredEventsCount() ? '✅ 已触发' : '⏳ 待触发';
    console.log(`${index + 1}. ${event} ${status}`);
  });
  console.log('');

  // 检查特定事件是否活动
  console.log('--- 活动事件检查 ---');
  console.log(`连击加成是否活动: ${gameManager.isEventActive(GameEventType.COMBO_BONUS) ? '是' : '否'}`);
  console.log(`重力反转是否活动: ${gameManager.isEventActive(GameEventType.GRAVITY_REVERSE) ? '是' : '否'}`);
  console.log('');

  console.log('========================================');
  console.log('演示结束');
  console.log('========================================');
}

// 运行演示
runDemo();
