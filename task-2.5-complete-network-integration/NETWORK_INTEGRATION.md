# Network Integration Documentation

## 概述

本文档描述任务2.5的完整网络对战集成系统，包括状态同步、冲突解决、观战模式和回放功能。

## 架构设计

### 核心组件

```
NetworkBattleManager (继承 BattleManager)
├── NetworkManager          - WebSocket通信
├── MatchmakingSystem      - 匹配系统
├── ReconnectionManager    - 重连管理
├── StateSynchronizer      - 状态同步
└── ConflictResolver       - 冲突解决
```

### 继承设计

NetworkBattleManager通过**继承**BattleManager，可以：
1. 直接访问所有游戏逻辑方法
2. 重写关键方法添加网络同步
3. 保持与原有系统的完全兼容
4. 无需适配器层，性能更优

## 状态同步系统

### StateSynchronizer

#### 功能特性

- **差异同步（Delta Sync）**：只传输变更的数据，大幅减少网络流量
- **完整同步（Full Sync）**：定期发送完整状态快照，确保一致性
- **混合模式（Hybrid）**：根据变更大小智能选择同步方式
- **版本控制**：为每个状态分配版本号，检测过期数据
- **乐观锁定**：允许客户端立即执行操作，后台进行同步

#### 同步模式

```typescript
enum SyncMode {
  FULL = 'FULL',      // 完整同步
  DELTA = 'DELTA',    // 差异同步
  HYBRID = 'HYBRID'   // 混合模式（推荐）
}
```

#### 状态快照结构

```typescript
interface StateSnapshot {
  timestamp: number;
  version: number;
  playerGrid: CandyType[][];
  opponentGrid: CandyType[][];
  playerScore: number;
  opponentScore: number;
  playerMoves: number;
  opponentMoves: number;
  eventProgress: number;
  activeEvents: GameEventType[];
  currentTurn: string;
}
```

#### 差异更新结构

```typescript
interface StateDelta {
  version: number;
  baseVersion: number;
  changes: StateChange[];
  timestamp: number;
}

interface StateChange {
  type: StateChangeType;  // GRID_UPDATE, SCORE_UPDATE, etc.
  path: string;            // 'playerGrid[2][3]', 'playerScore', etc.
  value: any;
  oldValue?: any;
}
```

#### 使用示例

```typescript
const synchronizer = new StateSynchronizer(SyncMode.HYBRID);

// 创建快照
const snapshot = synchronizer.createSnapshot(
  playerGrid,
  opponentGrid,
  playerScore,
  opponentScore,
  playerMoves,
  opponentMoves,
  eventProgress,
  activeEvents,
  currentTurn
);

// 生成差异
const delta = synchronizer.generateDelta();
if (delta) {
  // 发送delta而不是完整状态
  networkManager.send({ type: 'STATE_DELTA', data: delta });
}

// 应用差异
const updatedSnapshot = synchronizer.applyDelta(oldSnapshot, delta);
```

#### 性能优化

- **自动模式切换**：当差异超过阈值（默认50个变更）时，自动切换为完整同步
- **定期完整同步**：每N次（默认10次）增量同步后，执行一次完整同步
- **最小化JSON序列化**：只序列化变更的字段

## 冲突解决系统

### ConflictResolver

#### 冲突类型

```typescript
enum ConflictType {
  VERSION_MISMATCH = 'VERSION_MISMATCH',       // 版本不匹配
  CONCURRENT_MOVES = 'CONCURRENT_MOVES',       // 并发移动
  STATE_DIVERGENCE = 'STATE_DIVERGENCE',       // 状态分歧
  GRID_INCONSISTENCY = 'GRID_INCONSISTENCY',   // 网格不一致
  SCORE_MISMATCH = 'SCORE_MISMATCH'            // 分数不匹配
}
```

#### 解决策略

```typescript
enum ResolutionStrategy {
  SERVER_AUTHORITATIVE = 'SERVER_AUTHORITATIVE',   // 服务器权威（推荐）
  CLIENT_AUTHORITATIVE = 'CLIENT_AUTHORITATIVE',   // 客户端权威
  LATEST_TIMESTAMP = 'LATEST_TIMESTAMP',           // 最新时间戳
  MERGE = 'MERGE',                                 // 尝试合并
  ROLLBACK = 'ROLLBACK'                            // 回滚
}
```

#### 冲突检测

```typescript
const conflict = conflictResolver.detectConflict(localState, remoteState);

if (conflict) {
  console.log('Conflict detected:', conflict.type);
  console.log('Description:', conflict.description);
  console.log('Local version:', conflict.localVersion);
  console.log('Remote version:', conflict.remoteVersion);
}
```

#### 冲突解决

```typescript
const resolution = conflictResolver.resolveConflict(
  conflict,
  localState,
  remoteState
);

if (resolution.success) {
  // 应用解决后的状态
  applyResolvedState(resolution.resolvedState);
  
  // 如果需要回滚
  if (resolution.rollbackRequired) {
    rollbackLocalChanges();
  }
  
  // 执行补偿操作
  for (const move of resolution.compensationMoves) {
    applyCompensationMove(move);
  }
} else {
  console.error('Failed to resolve conflict:', resolution.message);
}
```

#### 策略说明

##### 1. SERVER_AUTHORITATIVE（服务器权威）
- **优点**：确保所有客户端状态一致，防止作弊
- **缺点**：需要服务器验证，增加延迟
- **适用**：竞技游戏、排名赛

##### 2. CLIENT_AUTHORITATIVE（客户端权威）
- **优点**：即时响应，无延迟
- **缺点**：可能导致不一致，容易作弊
- **适用**：休闲游戏、单人模式

##### 3. LATEST_TIMESTAMP（最新时间戳）
- **优点**：简单直接，易于理解
- **缺点**：可能丢失旧数据，依赖时钟同步
- **适用**：快节奏游戏

##### 4. MERGE（尝试合并）
- **优点**：保留双方变更，最大化数据保留
- **缺点**：可能产生不可预测的状态
- **适用**：协作游戏、编辑器

##### 5. ROLLBACK（回滚）
- **优点**：回到已知良好状态，避免错误传播
- **缺点**：丢失最近变更，用户体验差
- **适用**：紧急恢复、错误处理

## 网络延迟补偿

### 延迟测量

```typescript
// 通过ping-pong机制测量延迟
const latency = networkManager.getLatency();
console.log(`Current latency: ${latency}ms`);
```

### 补偿策略

#### 1. 预测性移动
```typescript
// 客户端立即显示移动结果
const result = battleManager.playerTurn(pos1, pos2);
renderMove(result);

// 后台发送给服务器验证
networkManager.sendMove({ pos1, pos2 });
```

#### 2. 插值渲染
```typescript
// 平滑对手移动动画
function interpolateOpponentMove(oldPos, newPos, timestamp) {
  const delay = networkManager.getLatency();
  const progress = Math.min(1, (Date.now() - timestamp) / delay);
  return lerp(oldPos, newPos, progress);
}
```

#### 3. 时间窗口同步
```typescript
// 允许一定时间窗口内的操作重排序
const TIME_WINDOW = 100; // ms
if (Math.abs(localTime - remoteTime) < TIME_WINDOW) {
  // 认为是"同时"发生，进行冲突解决
}
```

## 观战模式

### 启用观战

```typescript
// 允许其他玩家观战
manager.enableSpectatorMode(true);

// 以观众身份加入
await manager.joinAsSpectator(roomId);
```

### 观众管理

```typescript
// 获取观众列表
const spectators = manager.getSpectators();
spectators.forEach(s => {
  console.log(`${s.name} joined at ${new Date(s.joinedAt)}`);
});

// 监听观众加入
manager.onSpectatorJoin(spectator => {
  console.log(`New spectator: ${spectator.name}`);
});
```

### 观战限制

- 观众**只能查看**，不能执行游戏操作
- 观众接收**完整状态同步**，但不发送操作
- 观众列表对所有参与者可见

## 回放系统

### 启用回放录制

```typescript
manager.enableReplayRecording(true);
```

### 回放数据结构

```typescript
interface ReplayFrame {
  timestamp: number;
  playerId: string;
  move: MoveData;
  state: StateSnapshot;
}
```

### 导出回放

```typescript
// 获取所有帧
const frames = manager.getReplayFrames();

// 导出JSON
const replayData = manager.exportReplay();
// 返回格式:
{
  version: '1.0',
  roomId: string,
  players: { player: string, opponent: string },
  frames: ReplayFrame[],
  startTime: number,
  endTime: number
}
```

### 播放回放

```typescript
// 加载回放数据
const replay = JSON.parse(replayData);

// 逐帧播放
for (const frame of replay.frames) {
  await sleep(frame.timestamp - previousTimestamp);
  applyState(frame.state);
  renderMove(frame.move);
}
```

### 回放控制

```typescript
// 清空当前回放
manager.clearReplay();

// 检查回放大小
const frameCount = manager.getReplayFrames().length;
console.log(`Recorded ${frameCount} frames`);
```

## 断线重连

### 自动重连

```typescript
// 启用重连
const manager = new NetworkBattleManager({
  serverUrl: WS_URL,
  enableReconnection: true
});

// 监听断线
manager.onError(error => {
  if (error.message.includes('disconnect')) {
    // 自动尝试重连
    manager.handleReconnection();
  }
});
```

### 状态恢复

```typescript
// 重连后自动恢复游戏状态
await manager.handleReconnection();

// 检查是否成功恢复
if (manager.isInBattle()) {
  console.log('Game state recovered successfully');
} else {
  console.log('Could not recover, returning to lobby');
}
```

### 快照保存

游戏状态自动保存到LocalStorage：
- 每次移动后保存快照
- 包含完整游戏状态
- 包含移动历史记录
- 保存最后同步的移动编号

## 网络统计

### 获取统计数据

```typescript
const networkStats = manager.getNetworkStats();
console.log('Latency:', networkStats.latency, 'ms');
console.log('Sync count:', networkStats.syncCount);
console.log('Conflicts:', networkStats.conflictCount);
console.log('Reconnections:', networkStats.reconnections);

const syncStats = manager.getSyncStats();
console.log('Total syncs:', syncStats.totalSyncs);
console.log('Full syncs:', syncStats.fullSyncs);
console.log('Delta syncs:', syncStats.deltaSyncs);

const conflictStats = manager.getConflictStats();
console.log('By type:', conflictStats.byType);
console.log('By strategy:', conflictStats.byStrategy);
```

## 性能优化

### 1. 减少网络流量

```typescript
// 使用差异同步
new StateSynchronizer(SyncMode.HYBRID);

// 调整同步间隔（毫秒）
{
  enableAutoSync: true,
  syncInterval: 5000  // 每5秒同步一次
}
```

### 2. 批量发送

```typescript
// 累积多个小变更，一次发送
const pendingChanges = [];
pendingChanges.push(change1, change2, change3);
networkManager.sendBatch(pendingChanges);
```

### 3. 压缩数据

```typescript
// 使用二进制格式（未来优化）
const binaryData = serializeToBinary(state);
networkManager.sendBinary(binaryData);
```

## 安全考虑

### 1. 输入验证

```typescript
// 服务器端验证所有客户端输入
function validateMove(move: MoveData): boolean {
  if (move.pos1.row < 0 || move.pos1.row >= 8) return false;
  if (move.pos1.col < 0 || move.pos1.col >= 8) return false;
  // ... 更多验证
  return true;
}
```

### 2. 防作弊

```typescript
// 使用服务器权威策略
new NetworkBattleManager({
  conflictStrategy: ResolutionStrategy.SERVER_AUTHORITATIVE
});

// 服务器验证移动合法性
// 服务器计算真实分数
// 检测异常行为模式
```

### 3. 限流

```typescript
// 限制客户端请求频率
const rateLimiter = new RateLimiter({
  maxRequests: 100,
  timeWindow: 60000  // 每分钟最多100个请求
});
```

## 错误处理

### 连接错误

```typescript
manager.onError(error => {
  if (error.message.includes('connection')) {
    // 显示重连提示
    showReconnectDialog();
    // 尝试重连
    manager.handleReconnection();
  }
});
```

### 同步错误

```typescript
try {
  manager.syncGameState(state);
} catch (error) {
  console.error('Sync failed:', error);
  // 回退到完整同步
  manager.forceFull Sync();
}
```

### 冲突无法解决

```typescript
const resolution = conflictResolver.resolveConflict(...);
if (!resolution.success) {
  // 请求服务器仲裁
  const serverState = await requestServerState();
  applyServerState(serverState);
}
```

## 测试

### 运行测试

```bash
# 编译测试
npm run build

# 运行测试（确保服务器运行）
pm2 start server/battleServer.cjs
node dist/test/networkBattleTest.js
```

### 测试覆盖

- ✅ 连接测试
- ✅ 房间创建/加入
- ✅ 匹配系统
- ✅ 对战流程
- ✅ 移动执行
- ✅ 状态同步
- ✅ 冲突检测
- ✅ 冲突解决
- ✅ 断线重连
- ✅ 观战功能
- ✅ 回放系统
- ✅ 网络统计
- ✅ 性能测试

## 最佳实践

### 1. 选择合适的同步模式

```typescript
// 慢节奏游戏 - 减少带宽
SyncMode.DELTA

// 快节奏游戏 - 确保一致性
SyncMode.FULL

// 通用场景 - 平衡性能和带宽
SyncMode.HYBRID  // 推荐
```

### 2. 选择合适的冲突策略

```typescript
// 竞技游戏
ResolutionStrategy.SERVER_AUTHORITATIVE

// 休闲游戏
ResolutionStrategy.LATEST_TIMESTAMP

// 协作游戏
ResolutionStrategy.MERGE
```

### 3. 监控网络质量

```typescript
setInterval(() => {
  const latency = manager.getLatency();
  if (latency > 500) {
    showLagWarning();
  }
}, 5000);
```

### 4. 提供用户反馈

```typescript
manager.onStateChange(state => {
  switch (state) {
    case NetworkBattleState.CONNECTING:
      showSpinner('连接中...');
      break;
    case NetworkBattleState.RECONNECTING:
      showSpinner('重连中...');
      break;
    case NetworkBattleState.IN_BATTLE:
      hideSpinner();
      break;
  }
});
```

## 故障排除

### 问题：高延迟

**症状**：延迟>500ms，操作响应慢

**解决**：
1. 检查网络连接质量
2. 增加同步间隔
3. 使用差异同步减少数据量
4. 优化服务器性能

### 问题：频繁冲突

**症状**：冲突次数过多

**解决**：
1. 调整冲突检测阈值
2. 增加同步频率
3. 使用合并策略而非回滚
4. 检查时钟同步

### 问题：重连失败

**症状**：无法恢复游戏状态

**解决**：
1. 检查LocalStorage权限
2. 确保快照正确保存
3. 增加快照保存频率
4. 实现服务器端状态备份

## 未来优化

### 1. P2P模式
直接建立客户端间连接，减少服务器负载

### 2. 二进制协议
使用Protocol Buffers或MessagePack减少数据大小

### 3. 预测性同步
基于AI预测对手行为，提前渲染

### 4. 动态调整
根据网络质量自动调整同步策略

## 参考资料

- [WebSocket协议](https://tools.ietf.org/html/rfc6455)
- [游戏网络同步](https://gafferongames.com/post/what_every_programmer_needs_to_know_about_game_networking/)
- [冲突解决算法](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type)

## 版本历史

- **v1.0** (Task 2.5) - 初始版本，包含完整网络集成
  - StateSynchronizer - 差异同步
  - ConflictResolver - 冲突解决
  - 观战模式
  - 回放系统
  - 完整统计
