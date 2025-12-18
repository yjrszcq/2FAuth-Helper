# 2FAuth Helper

[中文](./README.md) | English

___

A browser extension solution for [2FAuth](https://github.com/Bubka/2FAuth) - view and manage your two-factor authentication codes conveniently in your browser.

> The current version uses the API of 2FAuth v5.6.1.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Browser        │────▶│   Proxy         │────▶│  2FAuth Server  │
│  Extension      │◀────│   Server        │◀────│  (Self-hosted)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

This project contains two components:

| Component | Description | Documentation |
|-----------|-------------|---------------|
| **Proxy Server** | Handles 2FAuth session authentication and request forwarding | [📖 Details](./2fauth-proxy/README_EN.md) |
| **Browser Extension** | View and manage 2FA codes in your browser | [📖 Details](./2fauth-helper/README_EN.md) |

## Features

- View all 2FA accounts and OTP codes
- Support for TOTP, HOTP, and Steam codes
- Multiple ways to add accounts (scan QR, upload, manual entry, import)
- Smart icon management (auto-fetch, auto-generate, custom upload)
- QR code processing modes (Direct Submit / Manual Edit)
- Import from Google Authenticator, Aegis, 2FAS, and more
- Light/Dark theme support
- Chinese/English interface
- One-click copy to clipboard

## Quick Start

### 1. Deploy the Proxy Server

```bash
docker run -d \
  --name 2fauth-proxy \
  -p 3000:3000 \
  -e TWOFAUTH_URL=https://your-2fauth-server.com \
  -e TWOFAUTH_EMAIL=your-email@example.com \
  -e TWOFAUTH_PASSWORD=your-password \
  -v ./data:/app/data \
  szcq/2fauth-proxy:latest

# Generate access token
docker exec 2fauth-proxy npm run generate-token
```

### 2. Install the Browser Extension

**Chrome / Edge / Brave:**
1. Open extensions page (`chrome://extensions/`)
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `2fauth-helper` folder

**Firefox:**
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on..."
3. Select `2fauth-helper/manifest.json`

### 3. Configure the Extension

1. Click the extension icon in your browser toolbar
2. Enter the proxy server URL (e.g., `http://localhost:3000`)
3. Enter the generated token
4. Click Login

## Security Notes

- The proxy server stores 2FAuth credentials - keep `docker-compose.yml` secure
- Consider using HTTPS for the proxy server (via nginx reverse proxy)
- Rotate proxy tokens periodically
- The browser extension only stores the proxy token, not your 2FAuth password

## Troubleshooting

### Cannot Connect to Proxy Server

1. Check if the proxy server is running: `docker ps`
2. Verify the server URL is correct
3. Check proxy logs: `docker logs 2fauth-proxy`

### Invalid Token

```bash
# Regenerate token
docker exec 2fauth-proxy npm run generate-token
```

### 2FAuth Connection Failed

1. Check the `TWOFAUTH_URL` environment variable
2. Verify the 2FAuth server is accessible
3. Confirm login credentials are correct

## Documentation

- [Proxy Server Deployment Guide](./2fauth-proxy/README_EN.md)
- [Browser Extension User Guide](./2fauth-helper/README_EN.md)

## License

[AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.html)
