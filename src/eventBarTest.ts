import { EventBar } from './EventBar.js';
import { GameEventType } from './GameEventType.js';

/**
 * EventBar 类单元测试和功能演示
 */
function testEventBar() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║              EventBar 类功能测试与演示                         ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // 测试 1: 默认构造函数
  console.log('【测试 1】默认构造函数（随机事件序列）');
  console.log('─'.repeat(65));
  const eventBar1 = new EventBar();
  console.log(`✓ 创建成功`);
  console.log(`  最大进度: ${eventBar1.getMaxProgress()}`);
  console.log(`  当前进度: ${eventBar1.getCurrentProgress()}`);
  console.log(`  事件数量: ${eventBar1.getEventSequence().length}`);
  console.log(`  事件序列: ${eventBar1.getEventSequence().join(', ')}`);
  console.log(`  ${eventBar1.toString()}\n`);

  // 测试 2: 自定义事件序列
  console.log('【测试 2】自定义事件序列');
  console.log('─'.repeat(65));
  const customEvents: GameEventType[] = [
    GameEventType.COMBO_BONUS,
    GameEventType.GRAVITY_REVERSE,
    GameEventType.SPEED_UP
  ];
  const eventBar2 = new EventBar(150, customEvents);
  console.log(`✓ 创建成功`);
  console.log(`  最大进度: ${eventBar2.getMaxProgress()}`);
  console.log(`  事件序列: ${eventBar2.getEventSequence().join(' → ')}`);
  console.log(`  每事件所需进度: ${150 / 3} 分\n`);

  // 测试 3: 推进进度和触发事件
  console.log('【测试 3】推进进度并触发事件');
  console.log('─'.repeat(65));
  const eventBar3 = new EventBar(100, [
    GameEventType.FROZEN_COLORS,
    GameEventType.OBSTACLE_GENERATE,
    GameEventType.SPEED_UP,
    GameEventType.COMBO_BONUS
  ]);

  console.log('初始状态:', eventBar3.toString());
  console.log('');

  const progressSteps = [15, 25, 30, 20, 15];
  progressSteps.forEach((points, index) => {
    console.log(`步骤 ${index + 1}: 增加 ${points} 点进度`);
    const triggered = eventBar3.advanceProgress(points);
    
    if (triggered) {
      console.log(`  🎉 触发事件: ${triggered}`);
    } else {
      console.log(`  ⏳ 未触发事件`);
    }
    
    console.log(`  当前状态: ${eventBar3.toString()}`);
    console.log(`  进度百分比: ${eventBar3.getProgressPercentage().toFixed(1)}%`);
    console.log(`  距下一事件: ${eventBar3.getProgressToNextEvent().toFixed(1)} 分`);
    console.log('');
  });

  // 测试 4: 查询方法
  console.log('【测试 4】查询方法测试');
  console.log('─'.repeat(65));
  console.log(`当前进度: ${eventBar3.getCurrentProgress()}/${eventBar3.getMaxProgress()}`);
  console.log(`进度百分比: ${eventBar3.getProgressPercentage().toFixed(1)}%`);
  console.log(`已触发事件数: ${eventBar3.getTriggeredEventsCount()}`);
  console.log(`剩余事件数: ${eventBar3.getRemainingEventsCount()}`);
  console.log(`下一个事件: ${eventBar3.getNextEvent() || '无（所有事件已触发）'}`);
  console.log(`到下一事件还需: ${eventBar3.getProgressToNextEvent().toFixed(1)} 分\n`);

  // 测试 5: 进度超出最大值的处理
  console.log('【测试 5】进度超出最大值的处理');
  console.log('─'.repeat(65));
  const eventBar4 = new EventBar(100, [GameEventType.COMBO_BONUS]);
  console.log(`初始: ${eventBar4.toString()}`);
  
  eventBar4.advanceProgress(150); // 故意超出最大值
  console.log(`增加 150 分后: ${eventBar4.toString()}`);
  console.log(`✓ 进度已限制在最大值: ${eventBar4.getCurrentProgress()}\n`);

  // 测试 6: 重置功能
  console.log('【测试 6】重置功能');
  console.log('─'.repeat(65));
  const eventBar5 = new EventBar(100, [
    GameEventType.GRAVITY_REVERSE,
    GameEventType.FROZEN_COLORS
  ]);
  
  console.log('初始状态:');
  console.log(`  ${eventBar5.toString()}`);
  
  eventBar5.advanceProgress(60);
  console.log('\n增加 60 分后:');
  console.log(`  ${eventBar5.toString()}`);
  
  eventBar5.reset();
  console.log('\n重置后（使用随机序列）:');
  console.log(`  ${eventBar5.toString()}`);
  console.log(`  新事件序列: ${eventBar5.getEventSequence().join(', ')}`);
  
  const newEvents = [GameEventType.SPEED_UP, GameEventType.COMBO_BONUS];
  eventBar5.reset(newEvents);
  console.log('\n重置后（使用指定序列）:');
  console.log(`  ${eventBar5.toString()}`);
  console.log(`  新事件序列: ${eventBar5.getEventSequence().join(', ')}\n`);

  // 测试 7: 边界条件 - 空事件序列
  console.log('【测试 7】边界条件测试');
  console.log('─'.repeat(65));
  
  // 单个事件
  const eventBar6 = new EventBar(100, [GameEventType.COMBO_BONUS]);
  console.log('单个事件序列:');
  console.log(`  事件数量: ${eventBar6.getEventSequence().length}`);
  console.log(`  触发阈值: ${100 / 1} 分`);
  eventBar6.advanceProgress(100);
  console.log(`  触发后剩余: ${eventBar6.getRemainingEventsCount()} 个\n`);

  // 测试 8: 完整游戏流程模拟
  console.log('【测试 8】完整游戏流程模拟');
  console.log('─'.repeat(65));
  const gameEvents = [
    GameEventType.COMBO_BONUS,
    GameEventType.GRAVITY_REVERSE,
    GameEventType.FROZEN_COLORS,
    GameEventType.OBSTACLE_GENERATE,
    GameEventType.SPEED_UP
  ];
  const eventBar7 = new EventBar(100, gameEvents);
  
  console.log('模拟一局完整游戏:\n');
  console.log('事件序列:');
  gameEvents.forEach((event, index) => {
    const threshold = ((index + 1) * (100 / gameEvents.length)).toFixed(1);
    console.log(`  ${index + 1}. ${event} (${threshold} 分触发)`);
  });
  console.log('');
  
  let totalScore = 0;
  const scores = [8, 12, 18, 15, 22, 10, 20, 15];
  
  scores.forEach((score, index) => {
    totalScore += score;
    const beforeState = {
      progress: eventBar7.getCurrentProgress(),
      triggered: eventBar7.getTriggeredEventsCount()
    };
    
    const event = eventBar7.advanceProgress(score);
    
    if (event) {
      console.log(`回合 ${index + 1}: +${score}分 (累计${totalScore}) → 🎉 触发 ${event}`);
    } else {
      const needed = eventBar7.getProgressToNextEvent();
      console.log(`回合 ${index + 1}: +${score}分 (累计${totalScore}) → 距下一事件还需 ${needed.toFixed(1)} 分`);
    }
  });
  
  console.log('');
  console.log('游戏结束:');
  console.log(`  最终分数: ${totalScore}`);
  console.log(`  最终进度: ${eventBar7.getCurrentProgress()}/${eventBar7.getMaxProgress()}`);
  console.log(`  触发事件: ${eventBar7.getTriggeredEventsCount()}/${eventBar7.getEventSequence().length}`);
  console.log(`  剩余事件: ${eventBar7.getRemainingEventsCount()}`);

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                     所有测试完成！                              ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
}

// 运行测试
testEventBar();
