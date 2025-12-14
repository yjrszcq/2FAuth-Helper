const fs = require('fs');
const crypto = require('crypto');
const config = require('./config');

class TokenManager {
  constructor() {
    this.tokenFile = config.tokenFile;
    this.currentToken = null;
    this.loadToken();
  }

  loadToken() {
    try {
      if (fs.existsSync(this.tokenFile)) {
        const data = fs.readFileSync(this.tokenFile, 'utf8');
        const parsed = JSON.parse(data);
        this.currentToken = parsed.token || null;
      }
    } catch (error) {
      console.error('Failed to load token:', error.message);
      this.currentToken = null;
    }
  }

  saveToken() {
    try {
      const dir = require('path').dirname(this.tokenFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        this.tokenFile,
        JSON.stringify({ token: this.currentToken, createdAt: new Date().toISOString() }, null, 2)
      );
    } catch (error) {
      console.error('Failed to save token:', error.message);
    }
  }

  generateToken() {
    // Generate a new random token (invalidates old one)
    this.currentToken = crypto.randomBytes(32).toString('hex');
    this.saveToken();
    return this.currentToken;
  }

  validateToken(token) {
    // Always reload token from file to support token regeneration without restart
    this.loadToken();
    if (!this.currentToken) {
      return false;
    }
    return token === this.currentToken;
  }

  getCurrentToken() {
    return this.currentToken;
  }
}

module.exports = new TokenManager();
