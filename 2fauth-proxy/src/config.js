// Configuration from environment variables
module.exports = {
  // 2FAuth server configuration
  twofauthUrl: process.env.TWOFAUTH_URL || 'http://localhost:8000',
  twofauthEmail: process.env.TWOFAUTH_EMAIL || '',
  twofauthPassword: process.env.TWOFAUTH_PASSWORD || '',

  // Proxy server configuration
  port: parseInt(process.env.PROXY_PORT || '3000', 10),

  // Token storage file
  tokenFile: process.env.TOKEN_FILE || '/app/data/token.json',
};
