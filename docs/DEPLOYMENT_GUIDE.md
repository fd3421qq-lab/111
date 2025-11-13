# 部署指南

## 前提条件

- Node.js >= 14
- npm >= 7
- Wrangler CLI
- Cloudflare账户

## 快速部署

```bash
# 1. 构建项目
npm run build

# 2. 部署到Cloudflare Pages
npm run deploy

# 或使用部署脚本
node scripts/deploy.js
```

## 详细步骤

### 1. 配置Cloudflare

```bash
# 登录Cloudflare
npx wrangler login

# 创建Pages项目
npx wrangler pages project create candy-match3-battle

# 配置环境变量
npx wrangler pages secret put API_KEY
```

### 2. 配置生产环境

编辑 `config/production.json`:
```json
{
  "environment": "production",
  "server": {
    "websocket": {
      "port": 8080
    }
  }
}
```

### 3. 构建和部署

```bash
# 完整构建
node scripts/build.js

# 部署
node scripts/deploy.js deploy
```

### 4. 验证部署

访问：https://your-project.pages.dev

### 回滚部署

```bash
node scripts/deploy.js rollback <deployment-id>
```

## 环境变量

- `NODE_ENV`: production
- `API_URL`: API服务地址
- `WS_URL`: WebSocket服务地址

## 监控和日志

- Cloudflare Analytics
- 错误日志自动上报
- 性能监控仪表板

## 故障排除

### 部署失败
- 检查Wrangler认证
- 验证构建输出
- 查看部署日志

### 服务不可用
- 检查DNS配置
- 验证SSL证书
- 查看服务器状态
