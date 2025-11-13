# API 文档

## EventBar 类详细文档

### 构造函数

```typescript
constructor(maxProgress: number = 100, eventSequence?: GameEventType[])
```

**参数:**
- `maxProgress` - 进度条最大值，默认为 100
- `eventSequence` - 可选的事件序列数组，如果不提供则随机生成 5 个事件

**示例:**
```typescript
// 使用默认配置
const eventBar1 = new EventBar();

// 自定义最大进度
const eventBar2 = new EventBar(200);

// 自定义事件序列
const events = [GameEventType.COMBO_BONUS, GameEventType.SPEED_UP];
const eventBar3 = new EventBar(100, events);
```

---

### 公共方法

#### advanceProgress()

推进进度条，当达到阈值时触发事件。

```typescript
advanceProgress(points: number): GameEventType | null
```

**参数:**
- `points` - 要增加的进度点数（通常对应玩家获得的分数）

**返回值:**
- 如果触发了事件，返回该事件类型
- 如果没有触发事件，返回 `null`

**示例:**
```typescript
const eventBar = new EventBar(100);

// 推进 25 点进度
const event1 = eventBar.advanceProgress(25);
if (event1) {
  console.log(`触发事件: ${event1}`);
}

// 再推进 30 点进度
const event2 = eventBar.advanceProgress(30);
```

---

#### getNextEvent()

获取下一个即将触发的事件。

```typescript
getNextEvent(): GameEventType | null
```

**返回值:**
- 下一个事件类型，如果所有事件都已触发则返回 `null`

**示例:**
```typescript
const nextEvent = eventBar.getNextEvent();
if (nextEvent) {
  console.log(`下一个事件将是: ${nextEvent}`);
} else {
  console.log('所有事件都已触发');
}
```

---

#### getCurrentProgress()

获取当前进度值。

```typescript
getCurrentProgress(): number
```

**示例:**
```typescript
const current = eventBar.getCurrentProgress();
console.log(`当前进度: ${current}`);
```

---

#### getMaxProgress()

获取最大进度值。

```typescript
getMaxProgress(): number
```

---

#### getProgressPercentage()

获取当前进度的百分比。

```typescript
getProgressPercentage(): number
```

**返回值:**
- 0-100 之间的百分比值

**示例:**
```typescript
const percentage = eventBar.getProgressPercentage();
console.log(`进度: ${percentage.toFixed(1)}%`);
```

---

#### getProgressToNextEvent()

获取到下一个事件还需要的进度点数。

```typescript
getProgressToNextEvent(): number
```

**返回值:**
- 所需的进度点数，如果没有更多事件则返回 0

**示例:**
```typescript
const needed = eventBar.getProgressToNextEvent();
console.log(`还需要 ${needed} 点进度触发下一个事件`);
```

---

#### getEventSequence()

获取完整的事件序列（返回副本）。

```typescript
getEventSequence(): GameEventType[]
```

**示例:**
```typescript
const sequence = eventBar.getEventSequence();
console.log('事件序列:', sequence);
```

---

#### getTriggeredEventsCount()

获取已触发的事件数量。

```typescript
getTriggeredEventsCount(): number
```

---

#### getRemainingEventsCount()

获取剩余未触发的事件数量。

```typescript
getRemainingEventsCount(): number
```

---

#### reset()

重置事件条到初始状态。

```typescript
reset(newEventSequence?: GameEventType[]): void
```

**参数:**
- `newEventSequence` - 可选的新事件序列，如果不提供则随机生成

**示例:**
```typescript
// 使用随机新序列重置
eventBar.reset();

// 使用指定序列重置
const newEvents = [GameEventType.FROZEN_COLORS, GameEventType.OBSTACLE_GENERATE];
eventBar.reset(newEvents);
```

---

#### toString()

获取事件条状态的字符串表示。

```typescript
toString(): string
```

**示例:**
```typescript
console.log(eventBar.toString());
// 输出: EventBar: 45/100 (45.0%) | Events: 2/5 | Next: SPEED_UP
```

---

## GameManager 类详细文档

### 构造函数

```typescript
constructor(maxProgress: number = 100, eventSequence?: GameEventType[])
```

**参数:**
- `maxProgress` - 事件条的最大进度值
- `eventSequence` - 可选的事件序列

---

### 游戏控制方法

#### startGame()

开始新游戏，重置所有状态。

```typescript
startGame(): void
```

**示例:**
```typescript
const game = new GameManager();
game.startGame();
```

---

#### pauseGame()

暂停游戏。

```typescript
pauseGame(): void
```

---

#### resumeGame()

恢复暂停的游戏。

```typescript
resumeGame(): void
```

---

#### endGame()

结束游戏，清理活动事件。

```typescript
endGame(): void
```

---

### 分数和进度方法

#### addScore()

增加玩家分数并推进事件条进度，可能触发事件。

```typescript
addScore(points: number): void
```

**参数:**
- `points` - 增加的分数点数

**示例:**
```typescript
// 玩家完成三消，获得 10 分
game.addScore(10);

// 玩家完成连击，获得 25 分
game.addScore(25);
```

---

### 事件处理方法

#### onEventTriggered()

当事件被触发时的处理函数。

```typescript
onEventTriggered(event: GameEventType): void
```

**参数:**
- `event` - 被触发的事件类型

**说明:**
- 此方法会自动被 `addScore()` 调用
- 可以重写此方法来自定义事件处理逻辑
- 默认实现会调用对应的事件处理方法和已注册的回调函数

---

#### onEvent()

注册事件监听回调函数。

```typescript
onEvent(event: GameEventType, callback: (event: GameEventType) => void): void
```

**参数:**
- `event` - 要监听的事件类型
- `callback` - 事件触发时的回调函数

**示例:**
```typescript
// 监听连击加成事件
game.onEvent(GameEventType.COMBO_BONUS, (event) => {
  console.log('连击加成开始！');
  // 更新 UI、播放音效等
});

// 监听重力反转事件
game.onEvent(GameEventType.GRAVITY_REVERSE, (event) => {
  console.log('重力反转！');
  // 改变游戏物理引擎设置
});
```

---

#### isEventActive()

检查某个事件是否正在生效中。

```typescript
isEventActive(event: GameEventType): boolean
```

**参数:**
- `event` - 要检查的事件类型

**返回值:**
- 如果事件正在生效返回 `true`，否则返回 `false`

**示例:**
```typescript
if (game.isEventActive(GameEventType.SPEED_UP)) {
  // 当前速度加成生效中，调整游戏速度
  console.log('速度加成生效中！');
}
```

---

### 查询方法

#### getScore()

获取当前分数。

```typescript
getScore(): number
```

---

#### getGameState()

获取当前游戏状态。

```typescript
getGameState(): GameState
```

**返回值:**
- `GameState.IDLE` - 空闲状态
- `GameState.PLAYING` - 游戏进行中
- `GameState.PAUSED` - 暂停
- `GameState.GAME_OVER` - 游戏结束

---

#### getEventBar()

获取事件条实例，可访问所有事件条方法。

```typescript
getEventBar(): EventBar
```

**示例:**
```typescript
const eventBar = game.getEventBar();
const progress = eventBar.getProgressPercentage();
console.log(`事件条进度: ${progress}%`);
```

---

#### getActiveEvents()

获取当前所有活动事件的列表。

```typescript
getActiveEvents(): GameEventType[]
```

**示例:**
```typescript
const activeEvents = game.getActiveEvents();
console.log('当前活动事件:', activeEvents);
```

---

#### getGameSummary()

获取游戏状态的完整摘要字符串。

```typescript
getGameSummary(): string
```

**示例:**
```typescript
console.log(game.getGameSummary());
// 输出: 游戏状态: PLAYING | 分数: 58 | EventBar: 58/100 (58.0%) | ...
```

---

## 枚举类型

### GameEventType

```typescript
enum GameEventType {
  GRAVITY_REVERSE = 'GRAVITY_REVERSE',     // 重力反转
  FROZEN_COLORS = 'FROZEN_COLORS',         // 冻结颜色
  COMBO_BONUS = 'COMBO_BONUS',             // 连击加成
  OBSTACLE_GENERATE = 'OBSTACLE_GENERATE', // 生成障碍物
  SPEED_UP = 'SPEED_UP'                    // 加速
}
```

---

### GameState

```typescript
enum GameState {
  IDLE = 'IDLE',           // 空闲状态
  PLAYING = 'PLAYING',     // 游戏进行中
  PAUSED = 'PAUSED',       // 暂停
  GAME_OVER = 'GAME_OVER'  // 游戏结束
}
```

---

## 接口定义

### EventConfig

```typescript
interface EventConfig {
  type: GameEventType;
  duration?: number;  // 事件持续时间（毫秒）
  intensity?: number; // 事件强度（0-1）
}
```

---

## 完整使用示例

```typescript
import { GameManager, GameEventType } from './src';

// 1. 创建游戏管理器
const game = new GameManager(100);

// 2. 注册事件监听器
game.onEvent(GameEventType.COMBO_BONUS, (event) => {
  console.log('💫 连击加成激活！');
  // 更新 UI、启用连击效果
});

game.onEvent(GameEventType.GRAVITY_REVERSE, (event) => {
  console.log('⬆️ 重力反转！');
  // 改变游戏物理设置
});

game.onEvent(GameEventType.SPEED_UP, (event) => {
  console.log('🚀 进入加速模式！');
  // 提升游戏速度
});

// 3. 开始游戏
game.startGame();

// 4. 游戏循环中更新分数
function onPlayerMatch(matchSize: number) {
  const baseScore = matchSize * 10;
  const comboMultiplier = game.isEventActive(GameEventType.COMBO_BONUS) ? 2 : 1;
  const finalScore = baseScore * comboMultiplier;
  
  game.addScore(finalScore);
  
  // 显示进度
  const eventBar = game.getEventBar();
  console.log(`进度: ${eventBar.getProgressPercentage().toFixed(1)}%`);
  console.log(`下一事件: ${eventBar.getNextEvent() || '无'}`);
}

// 5. 检查游戏状态
function updateGameSpeed() {
  if (game.isEventActive(GameEventType.SPEED_UP)) {
    return 1.5; // 速度提升 50%
  }
  return 1.0; // 正常速度
}

// 6. 游戏结束
function onGameOver() {
  game.endGame();
  console.log(`最终分数: ${game.getScore()}`);
  console.log(game.getGameSummary());
}
```
