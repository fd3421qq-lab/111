# 🚀 快速开始指南

## 📋 3分钟快速上手

### 1️⃣ 基本使用（最简单）

```typescript
import { NetworkBattleManager } from './NetworkBattleManager';

// 创建实例
const manager = new NetworkBattleManager({
  serverUrl: 'ws://localhost:8080'
});

// 连接并创建房间
await manager.connect();
const roomId = await manager.createRoom();
console.log('Room created:', roomId);

// 执行移动（自动同步）
const result = manager.playerTurn(
  { row: 0, col: 0 }, 
  { row: 0, col: 1 }
);
```

### 2️⃣ 完整配置（推荐）

```typescript
const manager = new NetworkBattleManager({
  serverUrl: 'ws://localhost:8080',
  
  // 同步配置
  enableAutoSync: true,
  syncInterval: 5000,
  syncMode: SyncMode.HYBRID,
  
  // 冲突解决
  conflictStrategy: ResolutionStrategy.SERVER_AUTHORITATIVE,
  
  // 高级功能
  enableReconnection: true,
  enableMatchmaking: true
});

// 设置事件回调
manager.onStateChange(state => {
  console.log('State changed:', state);
});

manager.onOpponentMove(move => {
  console.log('Opponent moved:', move);
});

manager.onConflict(conflict => {
  console.log('Conflict detected:', conflict.type);
});
```

### 3️⃣ 观战模式

```typescript
// 启用观战
manager.enableSpectatorMode(true);

// 作为观众加入
await manager.joinAsSpectator(roomId);

// 获取观众列表
const spectators = manager.getSpectators();
```

### 4️⃣ 回放功能

```typescript
// 启用回放录制
manager.enableReplayRecording(true);

// 游戏进行中自动录制...

// 导出回放
const replayJSON = manager.exportReplay();
downloadFile('replay.json', replayJSON);

// 清空回放
manager.clearReplay();
```

## 📊 查看统计

```typescript
// 网络统计
const stats = manager.getNetworkStats();
console.log('Latency:', stats.latency, 'ms');
console.log('Conflicts:', stats.conflictCount);

// 同步统计
const syncStats = manager.getSyncStats();
console.log('Delta syncs:', syncStats.deltaSyncs);
console.log('Full syncs:', syncStats.fullSyncs);

// 冲突统计
const conflictStats = manager.getConflictStats();
console.log('By type:', conflictStats.byType);
```

## 🎮 完整工作流

```typescript
// 1. 创建和连接
const manager = new NetworkBattleManager({ serverUrl: WS_URL });
await manager.connect();

// 2. 创建或加入房间
const roomId = await manager.createRoom();
// 或: await manager.joinRoom(roomId);
// 或: await manager.findMatch();

// 3. 等待对手（服务器自动触发startBattle）
manager.onBattleStart(() => {
  console.log('Battle started!');
});

// 4. 执行移动
manager.playerTurn({ row: 0, col: 0 }, { row: 0, col: 1 });

// 5. 处理对手移动
manager.onOpponentMove(move => {
  // 更新UI显示对手的移动
});

// 6. 对战结束
manager.onBattleEnd(winner => {
  console.log('Winner:', winner);
});
```

## 🔧 常用配置

### 竞技模式（服务器权威）
```typescript
{
  conflictStrategy: ResolutionStrategy.SERVER_AUTHORITATIVE,
  syncMode: SyncMode.FULL,
  syncInterval: 3000
}
```

### 休闲模式（客户端优先）
```typescript
{
  conflictStrategy: ResolutionStrategy.CLIENT_AUTHORITATIVE,
  syncMode: SyncMode.DELTA,
  syncInterval: 10000
}
```

### 最佳性能（混合模式）
```typescript
{
  conflictStrategy: ResolutionStrategy.LATEST_TIMESTAMP,
  syncMode: SyncMode.HYBRID,  // 自动选择
  syncInterval: 5000
}
```

## 🐛 故障排除

### 连接失败
```typescript
try {
  await manager.connect();
} catch (error) {
  console.error('Connection failed:', error);
  // 检查服务器是否运行
  // 检查URL是否正确
}
```

### 高延迟
```typescript
const latency = manager.getLatency();
if (latency > 500) {
  // 增加同步间隔
  manager.config.syncInterval = 10000;
  // 或切换到Delta模式
}
```

### 频繁冲突
```typescript
const stats = manager.getConflictStats();
if (stats.conflictCount > 10) {
  // 增加同步频率
  manager.config.syncInterval = 2000;
  // 或切换策略
}
```

## 📚 更多文档

- **完整文档**: 查看 `NETWORK_INTEGRATION.md`
- **API参考**: 查看 TypeScript 类型定义
- **示例代码**: 查看 `networkBattleDemo.html`
- **测试用例**: 查看 `networkBattleTest.ts`

## 💡 最佳实践

1. ✅ 使用HYBRID同步模式（平衡性能）
2. ✅ 使用SERVER_AUTHORITATIVE策略（防作弊）
3. ✅ 启用重连机制
4. ✅ 监控网络延迟
5. ✅ 记录冲突日志
6. ✅ 提供用户反馈

## 🎯 5种冲突策略对比

| 策略 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| SERVER_AUTHORITATIVE | 一致性强 | 有延迟 | 竞技游戏 ⭐ |
| CLIENT_AUTHORITATIVE | 无延迟 | 可能不一致 | 休闲游戏 |
| LATEST_TIMESTAMP | 简单直接 | 依赖时钟 | 快节奏 |
| MERGE | 保留数据 | 可能冲突 | 协作编辑 |
| ROLLBACK | 安全恢复 | 丢失数据 | 紧急恢复 |

## ⚡ 性能提示

- Delta Sync 可减少 **70-90%** 网络流量
- 同步间隔建议 **3-10秒**
- 延迟 < 500ms 体验最佳
- 每10次Delta后执行1次Full Sync

---

**开始构建你的网络对战游戏吧！** 🎮
