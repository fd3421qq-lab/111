import { GameManager } from './GameManager.js';
import { GameEventType } from './GameEventType.js';

/**
 * 可视化演示 - 展示事件条的渐进过程
 */
function visualDemo() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║           三消对战游戏 - 事件系统可视化演示                        ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  // 创建特定的事件序列用于演示
  const demoEvents: GameEventType[] = [
    GameEventType.COMBO_BONUS,
    GameEventType.GRAVITY_REVERSE,
    GameEventType.FROZEN_COLORS,
    GameEventType.OBSTACLE_GENERATE,
    GameEventType.SPEED_UP
  ];

  const game = new GameManager(100, demoEvents);
  game.startGame();

  console.log('');
  drawProgressBar(game, '游戏开始');
  console.log('\n');

  // 模拟游戏进程
  const actions = [
    { name: '三消消除', score: 10, emoji: '🟦🟦🟦' },
    { name: '四消消除', score: 15, emoji: '🟨🟨🟨🟨' },
    { name: '五消消除', score: 20, emoji: '🟥🟥🟥🟥🟥' },
    { name: 'L型消除', score: 18, emoji: '🟩🟩🟩' },
    { name: '连击x2', score: 12, emoji: '⚡⚡' },
    { name: 'T型消除', score: 22, emoji: '🟪🟪🟪🟪' },
    { name: '连击x3', score: 15, emoji: '⚡⚡⚡' },
  ];

  actions.forEach((action, index) => {
    console.log(`\n┌─ 第 ${index + 1} 回合 ─────────────────────────────────────────┐`);
    console.log(`│ 玩家操作: ${action.emoji} ${action.name} (+${action.score}分)`);
    console.log(`└──────────────────────────────────────────────────────┘`);
    
    game.addScore(action.score);
    console.log('');
    drawProgressBar(game, `累计分数: ${game.getScore()}`);
    
    // 显示活动事件
    const activeEvents = game.getActiveEvents();
    if (activeEvents.length > 0) {
      console.log('\n📍 当前生效事件:');
      activeEvents.forEach(event => {
        console.log(`   ${getEventEmoji(event)} ${event}`);
      });
    }
    
    console.log('');
  });

  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║                         游戏状态总结                                ║');
  console.log('╠════════════════════════════════════════════════════════════════════╣');
  console.log(`║ 最终分数: ${String(game.getScore()).padEnd(54)} ║`);
  console.log(`║ 触发事件: ${game.getEventBar().getTriggeredEventsCount()}/${game.getEventBar().getEventSequence().length} 个`.padEnd(70) + '║');
  console.log(`║ 剩余事件: ${game.getEventBar().getRemainingEventsCount()} 个`.padEnd(70) + '║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');

  // 显示事件时间线
  console.log('📊 事件触发时间线:\n');
  const eventSequence = game.getEventBar().getEventSequence();
  const triggeredCount = game.getEventBar().getTriggeredEventsCount();
  
  eventSequence.forEach((event, index) => {
    const isTriggered = index < triggeredCount;
    const status = isTriggered ? '✅' : '⏳';
    const bar = isTriggered ? '█████' : '░░░░░';
    const threshold = ((index + 1) * 20).toFixed(0);
    
    console.log(`${status} ${getEventEmoji(event)} ${event.padEnd(20)} [${bar}] 需要 ${threshold} 分`);
  });
  
  console.log('\n');
}

/**
 * 绘制进度条可视化
 */
function drawProgressBar(game: GameManager, label: string): void {
  const eventBar = game.getEventBar();
  const percentage = eventBar.getProgressPercentage();
  const current = eventBar.getCurrentProgress();
  const max = eventBar.getMaxProgress();
  
  const barWidth = 50;
  const filledWidth = Math.floor((percentage / 100) * barWidth);
  const emptyWidth = barWidth - filledWidth;
  
  const filled = '█'.repeat(filledWidth);
  const empty = '░'.repeat(emptyWidth);
  
  console.log(`📊 ${label}`);
  console.log(`┌${'─'.repeat(barWidth + 2)}┐`);
  console.log(`│${filled}${empty}│ ${percentage.toFixed(1)}%`);
  console.log(`└${'─'.repeat(barWidth + 2)}┘`);
  console.log(`   ${current}/${max} 分`);
  
  const nextEvent = eventBar.getNextEvent();
  if (nextEvent) {
    const needed = eventBar.getProgressToNextEvent();
    console.log(`   ⏭️  下一事件: ${getEventEmoji(nextEvent)} ${nextEvent} (还需 ${needed.toFixed(1)} 分)`);
  } else {
    console.log(`   🎉 所有事件已触发完毕！`);
  }
}

/**
 * 获取事件对应的表情符号
 */
function getEventEmoji(event: GameEventType): string {
  switch (event) {
    case GameEventType.GRAVITY_REVERSE:
      return '⬆️';
    case GameEventType.FROZEN_COLORS:
      return '❄️';
    case GameEventType.COMBO_BONUS:
      return '⚡';
    case GameEventType.OBSTACLE_GENERATE:
      return '🚧';
    case GameEventType.SPEED_UP:
      return '🚀';
    default:
      return '❓';
  }
}

// 运行可视化演示
visualDemo();
