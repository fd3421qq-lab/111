# 三消对战游戏 - 事件系统核心框架

一个使用 TypeScript 编写的三消对战游戏事件系统核心框架，提供灵活的事件管理和游戏状态控制功能。

## 项目概览

- **项目名称**: match3-event-system
- **技术栈**: TypeScript + Node.js
- **目标**: 为三消对战游戏提供完整的事件触发、管理和状态控制系统
- **版本**: 1.0.0

## 核心功能

### ✅ 已完成功能

1. **事件类型定义** (`GameEventType`)
   - ⬆️ `GRAVITY_REVERSE` - 重力反转
   - ❄️ `FROZEN_COLORS` - 冻结颜色
   - ⚡ `COMBO_BONUS` - 连击加成
   - 🚧 `OBSTACLE_GENERATE` - 生成障碍物
   - 🚀 `SPEED_UP` - 加速

2. **事件条类** (`EventBar`)
   - 进度管理：追踪当前进度和最大进度值
   - 事件序列：支持自定义或随机生成事件序列
   - 进度推进：根据分数推进进度，自动触发事件
   - 查询功能：获取下一个事件、进度百分比、剩余事件数等
   - 重置功能：重置进度条和事件序列

3. **游戏管理器** (`GameManager`)
   - 游戏状态管理：IDLE、PLAYING、PAUSED、GAME_OVER
   - 分数系统：追踪玩家分数并与事件系统联动
   - 事件处理：统一处理各类事件触发逻辑
   - 活动事件追踪：记录当前生效的事件及持续时间
   - 事件回调：支持注册自定义事件监听器

4. **完整的 TypeScript 类型支持**
   - 类型安全的事件系统
   - 详细的接口和枚举定义
   - 完整的类型注解和文档注释

## 数据架构

### 核心类结构

```typescript
// 事件类型枚举
enum GameEventType {
  GRAVITY_REVERSE,
  FROZEN_COLORS,
  COMBO_BONUS,
  OBSTACLE_GENERATE,
  SPEED_UP
}

// 事件条类
class EventBar {
  - currentProgress: number
  - maxProgress: number
  - eventSequence: GameEventType[]
  + advanceProgress(points): GameEventType | null
  + getNextEvent(): GameEventType | null
  + reset(): void
}

// 游戏管理器类
class GameManager {
  - eventBar: EventBar
  - gameState: GameState
  - score: number
  - activeEvents: Map<GameEventType, ActiveEvent>
  + startGame(): void
  + addScore(points): void
  + onEventTriggered(event): void
  + isEventActive(event): boolean
}
```

### 数据流

1. 玩家完成消除 → 获得分数
2. 分数增加 → 推进事件条进度
3. 进度达到阈值 → 触发对应事件
4. 事件触发 → 改变游戏状态
5. 事件生效 → 持续一段时间后自动结束

## 使用指南

### 安装依赖

```bash
npm install
```

### 构建项目

```bash
npm run build
```

### 运行演示

```bash
npm run demo
```

### 基本使用示例

```typescript
import { GameManager, GameEventType } from './src';

// 创建自定义事件序列
const events: GameEventType[] = [
  GameEventType.COMBO_BONUS,
  GameEventType.GRAVITY_REVERSE,
  GameEventType.SPEED_UP
];

// 初始化游戏管理器
const game = new GameManager(100, events);

// 注册事件监听器
game.onEvent(GameEventType.COMBO_BONUS, (event) => {
  console.log('连击加成触发！');
});

// 开始游戏
game.startGame();

// 玩家得分，推进进度
game.addScore(25);  // 可能触发事件

// 检查事件是否活动
if (game.isEventActive(GameEventType.COMBO_BONUS)) {
  console.log('连击加成正在生效中！');
}
```

### API 接口摘要

#### EventBar 类

| 方法 | 参数 | 返回值 | 说明 |
|-----|------|--------|------|
| `advanceProgress` | `points: number` | `GameEventType \| null` | 推进进度并可能触发事件 |
| `getNextEvent` | - | `GameEventType \| null` | 获取下一个待触发事件 |
| `getCurrentProgress` | - | `number` | 获取当前进度值 |
| `getProgressPercentage` | - | `number` | 获取进度百分比 |
| `getProgressToNextEvent` | - | `number` | 获取到下一事件所需进度 |
| `reset` | `newSequence?` | `void` | 重置事件条 |

#### GameManager 类

| 方法 | 参数 | 返回值 | 说明 |
|-----|------|--------|------|
| `startGame` | - | `void` | 开始游戏 |
| `addScore` | `points: number` | `void` | 增加分数并推进进度 |
| `onEventTriggered` | `event: GameEventType` | `void` | 处理事件触发 |
| `isEventActive` | `event: GameEventType` | `boolean` | 检查事件是否活动 |
| `onEvent` | `event, callback` | `void` | 注册事件监听器 |

## 项目结构

```
webapp/
├── src/
│   ├── GameEventType.ts   # 事件类型定义
│   ├── EventBar.ts        # 事件条类（核心）
│   ├── GameManager.ts     # 游戏管理器类
│   ├── demo.ts            # 使用演示
│   └── index.ts           # 导出入口
├── dist/                  # 编译输出目录
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

## 未实现功能

### 游戏逻辑实现

以下事件的具体游戏逻辑需要根据实际游戏引擎实现：

1. **重力反转** - 改变方块移动方向的实际物理逻辑
2. **冻结颜色** - 标记和阻止特定颜色方块消除的视觉效果
3. **连击加成** - 分数倍增计算和显示
4. **生成障碍物** - 在游戏棋盘上实际生成障碍方块
5. **加速效果** - 调整方块下落速度的动画系统

### 游戏界面

- 可视化的事件条 UI
- 游戏棋盘和方块渲染
- 分数和状态显示
- 特效和动画系统

## 推荐开发步骤

### 下一步开发建议

1. **集成游戏引擎**
   - 选择游戏引擎（如 Phaser、PixiJS、Three.js）
   - 将事件系统与游戏引擎桥接

2. **实现具体事件逻辑**
   - 在 `GameManager` 的事件处理方法中补充实际逻辑
   - 连接事件系统与游戏对象

3. **添加 UI 系统**
   - 设计事件条可视化组件
   - 实现事件触发的视觉反馈
   - 添加分数和状态显示

4. **扩展事件系统**
   - 添加更多事件类型
   - 实现事件优先级系统
   - 支持事件组合和链式触发

5. **多人对战功能**
   - 实现网络同步
   - 添加对战匹配系统
   - 实现玩家间的事件互相影响

## 开发规范

- **TypeScript**: 使用严格模式，完整的类型注解
- **代码风格**: 统一的命名和格式规范
- **注释**: 详细的文档注释和行内注释
- **模块化**: 清晰的职责分离和模块设计

## 演示输出示例

运行 `npm run demo` 会看到类似以下输出：

```
========================================
三消对战游戏 - 事件系统演示
========================================

游戏开始！
EventBar: 0/100 (0.0%) | Events: 0/5 | Next: COMBO_BONUS

--- 开始模拟游戏过程 ---

玩家完成一次三消,获得10分
分数: 10 | EventBar: 10/100 (10.0%) | Events: 0/5

🎉 事件触发: COMBO_BONUS
⚡ 连击加成：连击分数翻倍！
[回调] COMBO_BONUS 触发！现在可以获得连击加成了！
```

## 部署状态

- **平台**: 本地开发环境
- **状态**: ✅ 核心框架完成
- **最后更新**: 2025-11-13

## 许可证

MIT License

---

**注意**: 这是一个核心框架实现，需要配合具体的游戏引擎和 UI 框架才能构建完整的游戏应用。
