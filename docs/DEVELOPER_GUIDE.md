# 开发者指南

## 项目架构

### 核心模块
```
src/
├── GridSystem.ts          # 网格系统
├── GameManager.ts         # 游戏管理器
├── BattleManager.ts       # 对战管理器
├── AIOpponent.ts          # AI对手
├── NetworkManager.ts      # 网络管理
├── NetworkBattleManager.ts # 网络对战集成
├── StateSynchronizer.ts   # 状态同步
├── ConflictResolver.ts    # 冲突解决
├── PerformanceOptimizer.ts # 性能优化
└── ErrorHandler.ts        # 错误处理
```

## 开发环境设置

```bash
# 克隆项目
git clone https://github.com/fd3421qq-lab/111.git
cd 111

# 安装依赖
npm install

# 编译
npm run build

# 启动服务器
pm2 start ecosystem.config.cjs

# 运行测试
npm test
```

## API文档

### BattleManager
```typescript
const battle = new BattleManager({
  maxMoves: 30,
  targetScore: 1000,
  enableAI: true
});

battle.startBattle();
const result = battle.playerTurn(pos1, pos2);
```

### NetworkBattleManager
```typescript
const manager = new NetworkBattleManager({
  serverUrl: 'ws://localhost:8080'
});

await manager.connect();
await manager.createRoom();
manager.playerTurn(pos1, pos2);
```

## 贡献指南

1. Fork项目
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 编码规范

- TypeScript严格模式
- ESLint配置
- 详细注释
- 单元测试覆盖

## 测试

```bash
# 单元测试
npm test

# 集成测试
npm run test:integration

# 覆盖率报告
npm run test:coverage
```
