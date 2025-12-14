# 2FAuth Proxy

[中文](./README.md) | English

___

A proxy server for the 2FAuth browser extension. This allows the browser extension to connect to your 2FAuth server without needing to configure Personal Access Tokens.

## How it works

1. The proxy server logs into your 2FAuth server using your credentials (configured via environment variables)
2. You generate a simple token using a command
3. The browser extension connects to this proxy using that token
4. All API requests from the extension are forwarded to 2FAuth through this proxy

## Quick Start

### Option 1: Docker Run (Recommended)

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

### Option 2: Docker Compose

#### 1. Configure

Edit `docker-compose.yml` and set your 2FAuth credentials:

```yaml
environment:
  - TWOFAUTH_URL=https://your-2fauth-server.com
  - TWOFAUTH_EMAIL=your-email@example.com
  - TWOFAUTH_PASSWORD=your-password
```

#### 2. Start the proxy

```bash
docker-compose up -d
```

### Generate a token

```bash
docker exec 2fauth-proxy npm run generate-token
```

This will output a token like:
```
============================================================
New token generated successfully!
The previous token (if any) has been invalidated.
============================================================

Your new token:

a1b2c3d4e5f6...

============================================================
Use this token in your browser extension to authenticate.
============================================================
```

**Important**: Each time you run this command, a new token is generated and the old one becomes invalid.

### Configure the browser extension

1. Open the browser extension
2. Enter the proxy server URL (e.g., `http://localhost:3000` or your server's public URL)
3. Enter the token you generated

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TWOFAUTH_URL` | Yes | - | Your 2FAuth server URL |
| `TWOFAUTH_EMAIL` | Yes | - | Your 2FAuth login email |
| `TWOFAUTH_PASSWORD` | Yes | - | Your 2FAuth login password |
| `PROXY_PORT` | No | `3000` | Port for the proxy server |
| `TOKEN_FILE` | No | `/app/data/token.json` | Path to store the token |

## Commands

### Generate a new token

```bash
# Using docker
docker exec 2fauth-proxy npm run generate-token

# Or locally
npm run generate-token
```

### View logs

```bash
docker logs -f 2fauth-proxy
```

### Restart the proxy

```bash
docker-compose restart
```

## Security Notes

- The proxy stores your 2FAuth credentials - keep the docker-compose.yml file secure
- The generated token provides full access to your 2FAuth account through this proxy
- Running a new token generation invalidates all previous tokens
- Consider using HTTPS in production (via reverse proxy like nginx)

## API Endpoints

The proxy exposes the same API endpoints as 2FAuth:

- `GET /health` - Health check (no auth required)
- `GET /api/v1/user` - Get user info
- `GET /api/v1/twofaccounts` - List all accounts
- `GET /api/v1/twofaccounts/:id` - Get account details
- `GET /api/v1/twofaccounts/:id/otp` - Get OTP for account
- `POST /api/v1/twofaccounts` - Create new account
- `POST /api/v1/twofaccounts/otp` - Generate OTP from URI/params
- `POST /api/v1/twofaccounts/preview` - Preview account from URI
- `POST /api/v1/twofaccounts/migration` - Import accounts
- `POST /api/v1/qrcode/decode` - Decode QR code image
- `GET /api/v1/groups` - List groups
- `POST /api/v1/icons/default` - Get default icon
- `POST /api/v1/icons` - Upload custom icon
- `GET /storage/icons/:filename` - Get account icon

All endpoints (except `/health`) require the `Authorization: Bearer <token>` header.

## Troubleshooting

### Proxy can't connect to 2FAuth

- Verify the `TWOFAUTH_URL` is correct and accessible from the Docker container
- Check if your 2FAuth server requires HTTPS
- View logs for detailed error messages: `docker logs 2fauth-proxy`

### Token not working

- Make sure you're using the most recently generated token
- Check that the token file is persisted (volume mount in docker-compose.yml)
- Try generating a new token

### Session keeps expiring

The proxy automatically re-authenticates when the session expires. If you see frequent re-authentication messages in the logs, this is normal behavior.
