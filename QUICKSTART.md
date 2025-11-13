# 快速开始指南

## 🚀 5 分钟上手

### 第一步：安装依赖
```bash
npm install
```

### 第二步：构建项目
```bash
npm run build
```

### 第三步：运行演示
```bash
# 选项 1: 可视化演示（推荐，有进度条）
npm run demo:visual

# 选项 2: 基础演示
npm run demo

# 选项 3: 运行测试
npm test
```

---

## 📖 最小可用示例

### 示例 1: 创建最简单的事件系统

```typescript
import { EventBar, GameEventType } from './src';

// 创建事件条
const eventBar = new EventBar(100, [
  GameEventType.COMBO_BONUS,
  GameEventType.SPEED_UP
]);

// 推进进度
const event = eventBar.advanceProgress(50);
if (event) {
  console.log(`触发事件: ${event}`);
}
```

### 示例 2: 使用游戏管理器

```typescript
import { GameManager, GameEventType } from './src';

// 创建游戏
const game = new GameManager();

// 注册事件监听
game.onEvent(GameEventType.COMBO_BONUS, () => {
  console.log('连击加成！');
});

// 开始游戏
game.startGame();

// 玩家得分
game.addScore(25);
```

### 示例 3: 完整游戏循环

```typescript
import { GameManager, GameEventType } from './src';

class MatchThreeGame {
  private game: GameManager;

  constructor() {
    // 初始化游戏管理器
    this.game = new GameManager(100, [
      GameEventType.COMBO_BONUS,
      GameEventType.GRAVITY_REVERSE,
      GameEventType.SPEED_UP
    ]);

    // 注册事件处理
    this.game.onEvent(GameEventType.COMBO_BONUS, () => {
      this.enableComboBonus();
    });

    this.game.onEvent(GameEventType.GRAVITY_REVERSE, () => {
      this.reverseGravity();
    });

    this.game.onEvent(GameEventType.SPEED_UP, () => {
      this.increaseSpeed();
    });
  }

  start() {
    this.game.startGame();
  }

  // 玩家完成消除
  onMatch(matchSize: number) {
    const baseScore = matchSize * 10;
    
    // 如果有连击加成，分数翻倍
    const multiplier = this.game.isEventActive(GameEventType.COMBO_BONUS) ? 2 : 1;
    const finalScore = baseScore * multiplier;
    
    this.game.addScore(finalScore);
  }

  // 获取当前游戏速度
  getSpeed(): number {
    return this.game.isEventActive(GameEventType.SPEED_UP) ? 1.5 : 1.0;
  }

  // 事件处理方法
  private enableComboBonus() {
    console.log('⚡ 连击加成激活！');
  }

  private reverseGravity() {
    console.log('⬆️ 重力反转！');
  }

  private increaseSpeed() {
    console.log('🚀 速度提升！');
  }
}

// 使用
const myGame = new MatchThreeGame();
myGame.start();
myGame.onMatch(3);  // 三消
myGame.onMatch(4);  // 四消
```

---

## 🎯 核心类速查

### EventBar 类

| 方法 | 说明 | 示例 |
|-----|------|------|
| `new EventBar()` | 创建事件条 | `new EventBar(100, events)` |
| `advanceProgress(n)` | 推进进度 | `eventBar.advanceProgress(25)` |
| `getNextEvent()` | 获取下一事件 | `eventBar.getNextEvent()` |
| `getCurrentProgress()` | 当前进度 | `eventBar.getCurrentProgress()` |
| `getProgressPercentage()` | 进度百分比 | `eventBar.getProgressPercentage()` |
| `reset()` | 重置 | `eventBar.reset()` |

### GameManager 类

| 方法 | 说明 | 示例 |
|-----|------|------|
| `new GameManager()` | 创建管理器 | `new GameManager(100, events)` |
| `startGame()` | 开始游戏 | `game.startGame()` |
| `addScore(n)` | 增加分数 | `game.addScore(25)` |
| `onEvent(type, cb)` | 注册监听 | `game.onEvent(type, callback)` |
| `isEventActive(type)` | 检查事件 | `game.isEventActive(type)` |
| `getEventBar()` | 获取事件条 | `game.getEventBar()` |

---

## 🎮 事件类型

```typescript
enum GameEventType {
  GRAVITY_REVERSE,    // ⬆️ 重力反转
  FROZEN_COLORS,      // ❄️ 冻结颜色
  COMBO_BONUS,        // ⚡ 连击加成
  OBSTACLE_GENERATE,  // 🚧 生成障碍物
  SPEED_UP           // 🚀 加速
}
```

---

## 📂 项目文件

```
src/
├── GameEventType.ts   # 事件类型定义 ← 从这里开始
├── EventBar.ts        # 事件条类 ← 核心
├── GameManager.ts     # 游戏管理器 ← 入口
├── index.ts           # 导出模块
├── demo.ts            # 基础演示
├── visualDemo.ts      # 可视化演示
└── eventBarTest.ts    # 测试文件
```

---

## 💡 常见问题

### Q: 如何自定义事件序列？
```typescript
const events = [
  GameEventType.COMBO_BONUS,
  GameEventType.SPEED_UP
];
const game = new GameManager(100, events);
```

### Q: 如何知道下一个事件是什么？
```typescript
const nextEvent = game.getEventBar().getNextEvent();
console.log(`下一个事件: ${nextEvent}`);
```

### Q: 如何检查某个事件是否正在生效？
```typescript
if (game.isEventActive(GameEventType.COMBO_BONUS)) {
  // 应用连击加成效果
}
```

### Q: 如何重新开始游戏？
```typescript
game.startGame();  // 自动重置所有状态
```

---

## 🔗 更多资源

- 📘 [完整 API 文档](./API.md)
- 📖 [项目说明](./README.md)
- 📊 [项目总结](./SUMMARY.md)

---

## 🎓 学习路径

1. **初学者**: 
   - 运行 `npm run demo:visual` 查看可视化演示
   - 阅读 `src/demo.ts` 了解基本用法

2. **进阶用户**:
   - 阅读 `API.md` 了解所有 API
   - 查看 `src/eventBarTest.ts` 学习高级用法

3. **集成开发**:
   - 参考 `src/GameManager.ts` 了解架构设计
   - 扩展事件处理方法实现游戏逻辑

---

## ⚡ 快速命令

```bash
npm run build          # 构建项目
npm run demo          # 运行基础演示
npm run demo:visual   # 运行可视化演示（推荐）
npm test              # 运行测试
npm run watch         # 监听文件变化自动编译
npm run clean         # 清理构建输出
```

---

**提示**: 建议从 `npm run demo:visual` 开始，它能最直观地展示事件系统的工作原理！
