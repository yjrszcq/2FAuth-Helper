# 2FAuth 代理服务器

中文 | [English](./README_EN.md)

___

这是一个为 2FAuth 浏览器扩展设计的代理服务器。由于 2FAuth 使用基于 Session 的身份验证和 CSRF 保护，浏览器扩展无法直接与其通信，因此需要通过本代理服务器中转请求。

## 功能特点

- 代理浏览器扩展与 2FAuth 服务器之间的所有请求
- 自动处理 Session 认证和 CSRF Token
- Session 失效时自动重新登录
- 使用独立的代理 Token 进行身份验证
- Token 持久化存储，容器重启后仍然有效
- 支持 Docker 部署

## 快速开始

### 方式一：Docker Run（推荐）

```bash
docker run -d \
  --name 2fauth-proxy \
  -p 3000:3000 \
  -e TWOFAUTH_URL=https://your-2fauth-server.com \
  -e TWOFAUTH_EMAIL=your-email@example.com \
  -e TWOFAUTH_PASSWORD=your-password \
  -v ./data:/app/data \
  szcq/2fauth-proxy:latest
```

### 方式二：Docker Compose

#### 1. 配置环境变量

编辑 `docker-compose.yml` 文件，配置以下环境变量：

```yaml
environment:
  # 2FAuth 服务器地址（必填）
  - TWOFAUTH_URL=https://your-2fauth-server.com
  # 2FAuth 登录邮箱（必填）
  - TWOFAUTH_EMAIL=your-email@example.com
  # 2FAuth 登录密码（必填）
  - TWOFAUTH_PASSWORD=your-password
  # 代理服务器端口（可选，默认 3000）
  - PROXY_PORT=3000
  # Token 存储文件路径（可选）
  - TOKEN_FILE=/app/data/token.json
```

#### 2. 启动服务

```bash
# 启动容器
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 生成访问 Token

```bash
docker exec 2fauth-proxy npm run generate-token
```

该命令会：
1. 验证 2FAuth 服务器的登录凭据是否正确
2. 如果验证成功，生成一个新的代理 Token
3. 新 Token 会使之前的 Token 失效

**注意**：请妥善保管生成的 Token，它是浏览器扩展连接代理服务器的唯一凭证。

### 配置浏览器扩展

1. 在浏览器扩展中输入代理服务器地址（如 `http://localhost:3000`）
2. 输入上一步生成的 Token
3. 点击登录即可使用

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查（无需认证） |
| `/api/v1/user` | GET | 获取用户信息 |
| `/api/v1/twofaccounts` | GET | 获取所有 2FA 账户 |
| `/api/v1/twofaccounts/:id` | GET | 获取单个账户 |
| `/api/v1/twofaccounts/:id/otp` | GET | 获取账户的 OTP |
| `/api/v1/twofaccounts` | POST | 创建新账户 |
| `/api/v1/twofaccounts/otp` | POST | 通过 URI 生成 OTP |
| `/api/v1/twofaccounts/preview` | POST | 预览账户信息 |
| `/api/v1/twofaccounts/migration` | POST | 导入账户 |
| `/api/v1/qrcode/decode` | POST | 解码二维码 |
| `/api/v1/groups` | GET | 获取分组列表 |
| `/api/v1/icons/default` | POST | 获取默认图标 |
| `/storage/icons/:filename` | GET | 获取图标文件 |

所有 API 端点（除 `/health` 外）都需要在请求头中携带 Token：

```
Authorization: Bearer <your-token>
```

## 安全说明

- 代理 Token 存储在容器的 `/app/data/token.json` 文件中
- 建议将 `./data` 目录映射到宿主机以持久化 Token
- 2FAuth 的登录凭据仅存储在环境变量中，不会被记录到日志
- 所有日志输出都会自动过滤敏感信息（密码、Token 等）

## 故障排除

### Token 无效

如果提示 Token 无效，请重新生成：

```bash
docker exec 2fauth-proxy npm run generate-token
```

### 无法连接 2FAuth 服务器

1. 检查 `TWOFAUTH_URL` 是否正确
2. 确保代理服务器能够访问 2FAuth 服务器
3. 检查 2FAuth 的登录凭据是否正确

### 查看日志

```bash
docker-compose logs -f 2fauth-proxy
```

## 本地开发

```bash
# 安装依赖
npm install

# 设置环境变量
export TWOFAUTH_URL=https://your-2fauth-server.com
export TWOFAUTH_EMAIL=your-email@example.com
export TWOFAUTH_PASSWORD=your-password
export TOKEN_FILE=./data/token.json

# 启动服务
npm start

# 生成 Token
npm run generate-token
```
