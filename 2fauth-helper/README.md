# 2FAuth Helper 浏览器扩展

中文 | [English](./README_EN.md)

___

这是一个用于 2FAuth 的浏览器扩展，可以方便地在浏览器中查看和管理你的两步验证码。

## 功能特点

- 查看所有 2FA 账户列表
- 获取并显示 OTP 验证码
- 一键复制验证码到剪贴板
- 支持 TOTP、HOTP、Steam 验证码
- 扫描屏幕上的二维码添加账户
- 上传二维码图片添加账户
- 手动输入密钥添加账户
- 从其他验证器应用导入账户
- 搜索账户功能
- 美观的移动端风格界面
- 支持明亮/黑暗主题切换
- 支持中文/英文界面语言切换
- 手动添加账户时可配置图标（自动获取或上传自定义图标）

## 安装方法

### Chrome / Edge / Brave

1. 下载扩展文件夹
2. 打开浏览器，进入扩展管理页面：
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
   - Brave: `brave://extensions/`
3. 开启「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择 `2fauth-helper` 文件夹

### Firefox

1. 打开 `about:debugging#/runtime/this-firefox`
2. 点击「临时载入附加组件」
3. 选择 `manifest.json` 文件

## 使用前准备

本扩展需要配合 2FAuth 代理服务器使用。请先部署代理服务器并生成访问 Token。

### 1. 部署代理服务器

参考 `2fauth-proxy/README.md` 部署代理服务器。

### 2. 生成 Token

```bash
docker exec 2fauth-proxy npm run generate-token
```

## 使用说明

### 首次配置

1. 点击浏览器工具栏中的扩展图标
2. 输入代理服务器地址（如 `http://localhost:3000`）
3. 点击「Save & Continue」
4. 输入代理服务器生成的 Token
5. 点击「Login」

### 查看验证码

1. 在账户列表中点击任意账户
2. 即可看到当前的 OTP 验证码
3. 验证码会自动刷新
4. 点击复制按钮可将验证码复制到剪贴板

### 添加新账户

扩展提供多种添加账户的方式：

#### 扫描屏幕二维码

1. 在需要添加的网站页面显示二维码
2. 点击扩展中的「Scan Screen QR」
3. 扩展会自动识别屏幕上的二维码
4. 确认账户信息后点击「Add Account」

#### 上传二维码图片

1. 点击「Upload QR Image」
2. 选择包含二维码的图片文件
3. 确认账户信息后点击「Add Account」

#### 手动输入

1. 点击「Manual Entry」
2. 填写服务名称、账户名、密钥等信息
3. 可选择为账户配置图标：
   - 点击「Fetch Icon」自动根据服务名称获取图标
   - 点击「Upload」上传自定义图标
   - 点击清除按钮移除图标
4. 点击「Add Account」

#### 导入账户

支持从以下来源导入：

- Google Authenticator（通过导出二维码）
- 2FAS Authenticator
- Aegis Authenticator
- 其他支持标准格式的验证器

1. 点击「Import Accounts」
2. 选择导入来源
3. 扫描导出二维码或上传导出文件

### 搜索账户

在主界面顶部的搜索框中输入关键词，可快速筛选账户。

### 切换主题和语言

1. 点击菜单栏右侧的设置按钮（齿轮图标）
2. 在设置页面可以选择：
   - **语言**：中文 / English
   - **主题**：跟随系统 / 浅色 / 深色
3. 设置会自动保存

### 退出登录

点击右上角的用户头像，选择「Logout」即可退出。

## 安全说明

- 扩展不会存储你的 2FAuth 账号密码
- 所有验证码由 2FAuth 服务器计算，扩展仅负责显示
- Token 存储在浏览器本地存储中
- 建议定期更换代理 Token

## 注意事项

- 本扩展仅支持查看和添加账户，不支持编辑或删除账户
- 如需编辑或删除账户，请登录 2FAuth 网页版操作
- 扫描屏幕二维码需要授予扩展截图权限

## 故障排除

### 无法连接服务器

1. 检查代理服务器是否正在运行
2. 确认输入的服务器地址正确
3. 检查网络连接

### Token 无效

1. 确认 Token 输入正确（注意不要有多余空格）
2. Token 可能已失效（服务器重新生成了新 Token），重新生成：
   ```bash
   docker exec 2fauth-proxy npm run generate-token
   ```

### 2FAuth 连接失败

如果提示「2FAuth connection failed」，说明代理服务器无法连接到 2FAuth：

1. 检查代理服务器的环境变量配置是否正确
2. 确认 2FAuth 服务器正常运行
3. 检查代理服务器的日志获取详细错误信息

### 扫描二维码失败

1. 确保二维码完整显示在屏幕上
2. 尝试放大二维码
3. 如果屏幕扫描失败，可以尝试截图后上传

## 技术说明

- 基于 Manifest V3 开发
- 使用 jsQR 库进行二维码解码
- 支持 Chrome、Edge、Firefox 等主流浏览器
