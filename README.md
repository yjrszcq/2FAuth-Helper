# 2FAuth Helper

中文 | [English](./README_EN.md)

___

一个用于 [2FAuth](https://github.com/Bubka/2FAuth) 的浏览器扩展解决方案，让你可以在浏览器中便捷地查看和管理两步验证码。

## 项目架构

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  浏览器扩展      │────▶│   代理服务器      │────▶│  2FAuth 服务器   │
│  (Browser Ext)  │◀────│   (Proxy)       │◀────│  (Self-hosted)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

本项目包含两个组件：

| 组件 | 说明 | 文档 |
|------|------|------|
| **代理服务器** | 处理 2FAuth 的 Session 认证和请求转发 | [📖 详细文档](./2fauth-proxy/README.md) |
| **浏览器扩展** | 在浏览器中查看和管理 2FA 验证码 | [📖 详细文档](./2fauth-helper/README.md) |

## 功能特点

- 查看所有 2FA 账户和验证码
- 支持 TOTP、HOTP、Steam 验证码
- 多种方式添加账户（扫码、上传、手动输入、导入）
- 支持从 Google Authenticator、Aegis、2FAS 等应用导入
- 明亮/黑暗主题切换
- 中文/英文界面支持
- 一键复制验证码

## 快速开始

### 1. 部署代理服务器

```bash
docker run -d \
  --name 2fauth-proxy \
  -p 3000:3000 \
  -e TWOFAUTH_URL=https://your-2fauth-server.com \
  -e TWOFAUTH_EMAIL=your-email@example.com \
  -e TWOFAUTH_PASSWORD=your-password \
  -v ./data:/app/data \
  szcq/2fauth-proxy:latest

# 生成访问 Token
docker exec 2fauth-proxy npm run generate-token
```

### 2. 安装浏览器扩展

**Chrome / Edge / Brave：**
1. 打开扩展管理页面（`chrome://extensions/`）
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `2fauth-helper` 文件夹

**Firefox：**
1. 打开 `about:debugging#/runtime/this-firefox`
2. 点击「临时载入附加组件」
3. 选择 `2fauth-helper/manifest.json`

### 3. 配置扩展

1. 点击浏览器工具栏中的扩展图标
2. 输入代理服务器地址（如 `http://localhost:3000`）
3. 输入生成的 Token
4. 点击登录即可使用

## 安全说明

- 代理服务器存储 2FAuth 登录凭据，请确保 `docker-compose.yml` 的安全
- 建议为代理服务器配置 HTTPS（通过 nginx 等反向代理）
- 定期更换代理 Token
- 浏览器扩展仅存储代理 Token，不存储 2FAuth 密码

## 常见问题

### 无法连接代理服务器

1. 检查代理服务器是否正在运行：`docker ps`
2. 检查服务器地址是否正确
3. 查看代理日志：`docker logs 2fauth-proxy`

### Token 无效

```bash
# 重新生成 Token
docker exec 2fauth-proxy npm run generate-token
```

### 2FAuth 连接失败

1. 检查 `TWOFAUTH_URL` 环境变量配置
2. 确认 2FAuth 服务器可访问
3. 验证登录凭据是否正确

## 详细文档

- [代理服务器部署指南](./2fauth-proxy/README.md)
- [浏览器扩展使用说明](./2fauth-helper/README.md)

## 许可证

[AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.html)
