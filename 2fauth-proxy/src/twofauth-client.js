const fetch = require('node-fetch');
const { CookieJar } = require('tough-cookie');
const fetchCookie = require('fetch-cookie');
const config = require('./config');
const logger = require('./logger');

class TwoFAuthClient {
  constructor() {
    this.baseUrl = config.twofauthUrl.replace(/\/$/, '');
    this.email = config.twofauthEmail;
    this.password = config.twofauthPassword;
    this.cookieJar = new CookieJar();
    this.fetchWithCookies = fetchCookie(fetch, this.cookieJar);
    this.csrfToken = null;
    this.isLoggedIn = false;
    this.loginPromise = null;
    this.lastLoginError = null;
  }

  async ensureLoggedIn() {
    // If already logging in, wait for that to complete
    if (this.loginPromise) {
      return this.loginPromise;
    }

    if (this.isLoggedIn) {
      return { success: true };
    }

    this.loginPromise = this.login();
    try {
      const result = await this.loginPromise;
      return result;
    } finally {
      this.loginPromise = null;
    }
  }

  async login() {
    try {
      logger.info(`Attempting login to 2FAuth at ${this.baseUrl}`);

      // Step 1: Get the initial page to get cookies and CSRF token
      const initResponse = await this.fetchWithCookies(`${this.baseUrl}/login`, {
        method: 'GET',
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': '2FAuth-Proxy/1.0',
        },
      });

      if (!initResponse.ok) {
        const error = `Failed to reach 2FAuth server: HTTP ${initResponse.status}`;
        logger.error(error);
        this.lastLoginError = error;
        this.isLoggedIn = false;
        return { success: false, error };
      }

      // Step 2: Get CSRF token
      const csrfResponse = await this.fetchWithCookies(`${this.baseUrl}/refresh-csrf`, {
        method: 'GET',
        headers: {
          Accept: 'text/plain',
          'User-Agent': '2FAuth-Proxy/1.0',
        },
      });
      this.csrfToken = await csrfResponse.text();

      // Step 3: Login
      const loginResponse = await this.fetchWithCookies(`${this.baseUrl}/user/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-CSRF-TOKEN': this.csrfToken,
          'User-Agent': '2FAuth-Proxy/1.0',
        },
        body: JSON.stringify({
          email: this.email,
          password: this.password,
        }),
      });

      if (!loginResponse.ok) {
        let errorMessage = `Login failed with status ${loginResponse.status}`;
        try {
          const errorData = await loginResponse.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // Could not parse JSON error
        }
        logger.error(`Login failed: ${errorMessage}`);
        this.lastLoginError = errorMessage;
        this.isLoggedIn = false;
        return { success: false, error: errorMessage };
      }

      const loginData = await loginResponse.json();
      logger.info('Login successful');
      this.isLoggedIn = true;
      this.lastLoginError = null;
      return { success: true };
    } catch (error) {
      const errorMessage = `Connection error: ${error.message}`;
      logger.error(`Login error: ${error.message}`);
      this.lastLoginError = errorMessage;
      this.isLoggedIn = false;
      return { success: false, error: errorMessage };
    }
  }

  async refreshCsrf() {
    try {
      const response = await this.fetchWithCookies(`${this.baseUrl}/refresh-csrf`, {
        method: 'GET',
        headers: {
          Accept: 'text/plain',
          'User-Agent': '2FAuth-Proxy/1.0',
        },
      });
      this.csrfToken = await response.text();
      return this.csrfToken;
    } catch (error) {
      logger.error(`Failed to refresh CSRF: ${error.message}`);
      return null;
    }
  }

  async getWithExistingSession(path, headers = { Accept: 'application/json' }) {
    const url = `${this.baseUrl}${path}`;
    const requestHeaders = {
      'User-Agent': '2FAuth-Proxy/1.0',
      ...headers,
    };

    return this.fetchWithCookies(url, { method: 'GET', headers: requestHeaders });
  }

  async proxyRequest(method, path, body = null, contentType = 'application/json') {
    // Ensure we're logged in
    const loginResult = await this.ensureLoggedIn();
    if (!loginResult.success) {
      const error = new Error(loginResult.error || 'Not authenticated with 2FAuth server');
      error.loginFailed = true;
      error.loginError = loginResult.error;
      throw error;
    }

    // Refresh CSRF token for non-GET requests
    if (method !== 'GET') {
      await this.refreshCsrf();
    }

    const url = `${this.baseUrl}${path}`;
    const headers = {
      Accept: 'application/json',
      'User-Agent': '2FAuth-Proxy/1.0',
    };

    if (this.csrfToken) {
      headers['X-CSRF-TOKEN'] = this.csrfToken;
    }

    if (contentType && contentType !== 'multipart/form-data') {
      headers['Content-Type'] = contentType;
    }

    const options = {
      method,
      headers,
    };

    if (body) {
      options.body = body;
    }

    logger.debug(`Proxying ${method} ${path}`);
    let response = await this.fetchWithCookies(url, options);

    // If we get 401 or 419 (CSRF mismatch), try to re-login
    if (response.status === 401 || response.status === 419) {
      logger.warn('Session expired, attempting re-authentication...');
      this.isLoggedIn = false;
      this.cookieJar = new CookieJar();
      this.fetchWithCookies = fetchCookie(fetch, this.cookieJar);

      const reloginResult = await this.ensureLoggedIn();
      if (!reloginResult.success) {
        const error = new Error(reloginResult.error || 'Re-authentication failed');
        error.loginFailed = true;
        error.loginError = reloginResult.error;
        logger.error(`Re-authentication failed: ${reloginResult.error}`);
        throw error;
      }

      logger.info('Re-authentication successful, retrying request');

      // Refresh CSRF for non-GET requests
      if (method !== 'GET') {
        await this.refreshCsrf();
        headers['X-CSRF-TOKEN'] = this.csrfToken;
      }

      // Retry the request
      response = await this.fetchWithCookies(url, options);
    }

    return response;
  }

  async get(path) {
    return this.proxyRequest('GET', path);
  }

  async post(path, body, contentType = 'application/json') {
    return this.proxyRequest('POST', path, body, contentType);
  }

  async put(path, body) {
    return this.proxyRequest('PUT', path, JSON.stringify(body));
  }

  async patch(path, body) {
    return this.proxyRequest('PATCH', path, JSON.stringify(body));
  }

  async delete(path, body = null) {
    return this.proxyRequest('DELETE', path, body ? JSON.stringify(body) : null);
  }

  getLastLoginError() {
    return this.lastLoginError;
  }
}

module.exports = new TwoFAuthClient();
