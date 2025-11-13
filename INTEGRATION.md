# 第一阶段集成架构文档

## 🎯 集成目标

将事件系统核心框架与三消对战玩法深度整合，实现完整的游戏逻辑流程。

---

## 📐 整体架构

```
┌────────────────────────────────────────────────────────────┐
│                   三消对战游戏系统                          │
└────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴────────────┐
                │                        │
                ▼                        ▼
    ┌─────────────────────┐    ┌──────────────────┐
    │   BattleManager     │    │   GameManager    │
    │   (对战管理器)      │    │   (事件管理器)   │
    └──────────┬──────────┘    └─────────┬────────┘
               │                          │
               │ 包含                     │ 包含
               ▼                          ▼
    ┌─────────────────────┐    ┌──────────────────┐
    │   GridSystem x 2    │    │    EventBar      │
    │  (玩家+对手网格)    │    │   (事件条)       │
    └─────────────────────┘    └──────────────────┘
               │                          │
               │                          │
               └──────────┬───────────────┘
                          │
                          ▼
                   游戏逻辑联动
          (分数推进事件，事件影响网格)
```

---

## 🏗️ 核心模块说明

### 1. GridSystem (三消网格系统)

**职责**: 管理单个玩家的三消棋盘逻辑

**核心功能**:
- ✅ 8x8 网格管理
- ✅ 5 种糖果类型 (红、蓝、绿、黄、紫)
- ✅ 交换验证和匹配检测
- ✅ 重力掉落和填充
- ✅ 连锁反应处理
- ✅ 事件效果接口 (重力反转、颜色冻结、障碍物生成)

**关键方法**:
```typescript
swap(pos1, pos2): SwapResult           // 交换糖果
findAllMatches(): MatchResult[]        // 查找所有匹配
applyGravity(): void                   // 应用重力
freezeColors(types): void              // 冻结颜色（事件效果）
setGravityReversed(reversed): void    // 重力反转（事件效果）
generateObstacles(count): Position[]   // 生成障碍物（事件效果）
```

**文件**: `src/GridSystem.ts` (400+ 行)

---

### 2. BattleManager (对战管理器)

**职责**: 整合事件系统与双人对战逻辑

**核心功能**:
- ✅ 集成 GameManager 事件系统
- ✅ 管理玩家和对手的 GridSystem
- ✅ 回合制对战流程
- ✅ 分数计算与事件推进联动
- ✅ 事件效果到网格的自动应用
- ✅ 对战胜负判定

**关键方法**:
```typescript
startBattle(): void                    // 开始对战
playerTurn(pos1, pos2): TurnResult    // 玩家回合
opponentTurn(pos1, pos2): TurnResult  // 对手回合
getBattleSummary(): string            // 获取对战摘要
```

**事件监听器注册**:
```typescript
// 重力反转事件
gameManager.onEvent(GameEventType.GRAVITY_REVERSE, () => {
  player.grid.setGravityReversed(true);
  opponent.grid.setGravityReversed(true);
});

// 冻结颜色事件
gameManager.onEvent(GameEventType.FROZEN_COLORS, () => {
  const frozenColors = selectRandomColors(1-2);
  player.grid.freezeColors(frozenColors);
  opponent.grid.freezeColors(frozenColors);
});

// 连击加成事件
gameManager.onEvent(GameEventType.COMBO_BONUS, () => {
  // 在计分时分数翻倍
});

// 生成障碍物事件
gameManager.onEvent(GameEventType.OBSTACLE_GENERATE, () => {
  opponent.grid.generateObstacles(2-4);
});
```

**文件**: `src/BattleManager.ts` (400+ 行)

---

## 🔄 数据流详解

### 玩家操作 → 事件触发完整流程

```
1. 玩家操作
   ↓
   playerTurn(pos1, pos2)
   
2. 网格处理
   ↓
   GridSystem.swap()
   ├─ 验证交换有效性
   ├─ 执行交换
   ├─ 查找匹配
   └─ 处理连锁反应
   
3. 分数计算
   ↓
   基础分数 = 匹配长度 × 10 × 连击倍数
   如果连击加成事件活跃:
     最终分数 = 基础分数 × 2
   
4. 推进事件系统
   ↓
   GameManager.addScore(最终分数)
   ├─ EventBar.advanceProgress(分数)
   ├─ 检查是否达到事件阈值
   └─ 如果达到，触发事件
   
5. 事件效果应用
   ↓
   onEventTriggered(eventType)
   ├─ 调用事件处理方法
   ├─ 触发注册的回调函数
   └─ 应用效果到双方网格
      ├─ 重力反转 → setGravityReversed(true)
      ├─ 冻结颜色 → freezeColors([colors])
      ├─ 生成障碍物 → generateObstacles(count)
      └─ 连击加成 → 在计分时生效
   
6. 切换回合
   ↓
   currentTurn = OPPONENT
```

---

## 📊 事件效果实现细节

### 1. 重力反转 (GRAVITY_REVERSE)

**效果**: 糖果从向下掉落变为向上移动

**实现**:
```typescript
// GridSystem.ts
private applyGravity(): void {
  if (this.gravityReversed) {
    // 向上移动：从上往下写入
    for (let col = 0; col < this.cols; col++) {
      let writeRow = 0;
      for (let readRow = 0; readRow < this.rows; readRow++) {
        if (this.grid[readRow][col] !== EMPTY) {
          grid[writeRow][col] = grid[readRow][col];
          writeRow++;
        }
      }
    }
  } else {
    // 正常向下移动
    // ...
  }
}
```

**持续时间**: 15秒

**影响范围**: 双方网格

---

### 2. 冻结颜色 (FROZEN_COLORS)

**效果**: 1-2种颜色的糖果无法消除

**实现**:
```typescript
// GridSystem.ts
private findAllMatches(): MatchResult[] {
  // 扫描时跳过冻结的颜色
  if (candy === EMPTY || this.frozenTypes.has(candy)) {
    continue;
  }
  // ...
}

// BattleManager.ts
gameManager.onEvent(GameEventType.FROZEN_COLORS, () => {
  const frozenColors = selectRandomColors(1-2);
  player.grid.freezeColors(frozenColors);
  opponent.grid.freezeColors(frozenColors);
});
```

**持续时间**: 15秒

**影响范围**: 双方网格

---

### 3. 连击加成 (COMBO_BONUS)

**效果**: 分数翻倍

**实现**:
```typescript
// BattleManager.ts
let score = swapResult.score;
if (gameManager.isEventActive(GameEventType.COMBO_BONUS)) {
  score *= 2;  // 分数翻倍
}
playerData.score += score;
```

**持续时间**: 15秒

**影响范围**: 双方得分

---

### 4. 生成障碍物 (OBSTACLE_GENERATE)

**效果**: 在对手棋盘生成2-4个障碍物

**实现**:
```typescript
// GridSystem.ts
public generateObstacles(count: number): Position[] {
  const obstacles: Position[] = [];
  for (let i = 0; i < count; i++) {
    const randomPos = getRandomPosition();
    this.grid[randomPos.row][randomPos.col] = CandyType.EMPTY;
    obstacles.push(randomPos);
  }
  return obstacles;
}

// BattleManager.ts
gameManager.onEvent(GameEventType.OBSTACLE_GENERATE, () => {
  const count = Math.floor(Math.random() * 3) + 2; // 2-4个
  opponent.grid.generateObstacles(count);
});
```

**持续时间**: 立即生效，永久存在

**影响范围**: 仅对手网格

---

### 5. 加速 (SPEED_UP)

**效果**: 游戏速度提升（主要影响UI动画）

**实现**: 前端渲染时读取事件状态调整动画速度

**持续时间**: 15秒

**影响范围**: UI动画

---

## 🎮 对战配置

```typescript
interface BattleConfig {
  maxMoves?: number;         // 最大步数（默认30）
  targetScore?: number;      // 目标分数（默认1000）
  eventProgressMax?: number; // 事件进度最大值（默认100）
  gridSize?: { rows, cols }; // 网格尺寸（默认8x8）
}
```

**示例**:
```typescript
const battle = new BattleManager({
  maxMoves: 20,
  targetScore: 800,
  eventProgressMax: 80,
  gridSize: { rows: 8, cols: 8 }
});
```

---

## 🧪 测试验证

### 运行演示

```bash
# 构建项目
npm run build

# 运行对战演示
npm run demo:battle

# 运行完整测试
npm test
```

### 测试覆盖

1. ✅ **GridSystem 测试**
   - 网格初始化
   - 交换和匹配检测
   - 重力掉落和连锁反应
   - 事件效果（重力反转、颜色冻结）

2. ✅ **BattleManager 测试**
   - 对战启动和流程
   - 双人回合制
   - 分数计算和事件推进
   - 事件触发和效果应用

3. ✅ **集成测试**
   - 完整对战流程
   - 事件系统与网格系统协同
   - 多次事件触发

---

## 📈 性能特点

### GridSystem
- **交换检测**: O(1)
- **匹配查找**: O(n×m) - n×m 为网格尺寸
- **重力掉落**: O(n×m)
- **连锁处理**: O(k×n×m) - k 为连锁次数

### BattleManager
- **回合处理**: O(1)
- **事件触发**: O(1)
- **状态查询**: O(1)

### 优化建议
- ✅ 使用 Set 存储冻结颜色（O(1) 查找）
- ✅ 使用 Map 存储活动事件（O(1) 查找）
- ✅ 避免不必要的网格复制
- ✅ 事件定时器自动清理

---

## 🔌 扩展接口

### 为 Phaser/Cocos 集成预留的接口

```typescript
// 1. 网格状态查询
GridSystem.getGrid(): CandyType[][]
GridSystem.getCandyAt(pos): CandyType
GridSystem.getSize(): { rows, cols }

// 2. 事件状态查询
BattleManager.getGameManager(): GameManager
GameManager.isEventActive(event): boolean
GameManager.getActiveEvents(): GameEventType[]

// 3. 回合控制
BattleManager.playerTurn(pos1, pos2): TurnResult
BattleManager.getCurrentTurn(): PlayerType
BattleManager.isBattleActive(): boolean

// 4. 数据绑定
BattleManager.getPlayerData(): PlayerData
BattleManager.getOpponentData(): PlayerData
```

**UI 集成示例**:
```typescript
// 在 Phaser 中
class GameScene extends Phaser.Scene {
  private battle: BattleManager;
  
  create() {
    this.battle = new BattleManager();
    this.battle.startBattle();
    
    // 注册事件监听
    this.battle.getGameManager().onEvent(
      GameEventType.GRAVITY_REVERSE,
      () => this.playGravityReverseAnimation()
    );
    
    // 渲染网格
    this.renderGrid(this.battle.getPlayerData().grid);
  }
  
  handleSwap(pos1, pos2) {
    const result = this.battle.playerTurn(pos1, pos2);
    if (result.success) {
      this.playMatchAnimation(result.swapResult.matches);
    }
  }
}
```

---

## 📝 下一步计划

### 第二阶段：UI 集成

1. **Phaser 场景搭建**
   - 网格渲染
   - 糖果动画
   - 特效系统

2. **交互逻辑**
   - 触摸/点击检测
   - 滑动交换
   - 提示系统

3. **视觉反馈**
   - 匹配动画
   - 连击特效
   - 事件触发效果

### 第三阶段：网络对战

1. **通信协议**
   - WebSocket 连接
   - 回合同步
   - 状态广播

2. **匹配系统**
   - 房间管理
   - 玩家匹配
   - 断线重连

3. **微信小程序适配**
   - 云函数后端
   - 数据存储
   - 排行榜系统

---

## ✅ 当前完成情况

### 代码文件
- ✅ `src/GridSystem.ts` (400+ 行)
- ✅ `src/BattleManager.ts` (400+ 行)
- ✅ `src/battleDemo.ts` (演示程序)
- ✅ `src/battleIntegrationTest.ts` (集成测试)

### 测试验证
- ✅ 网格系统功能测试
- ✅ 对战管理器测试
- ✅ 事件触发测试
- ✅ 完整对战流程演示

### 文档
- ✅ 核心 API 文档
- ✅ 架构设计文档
- ✅ 本集成文档

---

**项目状态**: ✅ 第一阶段集成完成  
**最后更新**: 2025-11-13  
**版本**: 1.1.0
