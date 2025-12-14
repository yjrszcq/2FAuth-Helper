const express = require('express');
const cors = require('cors');
const multer = require('multer');
const config = require('./config');
const tokenManager = require('./token-manager');
const twofauthClient = require('./twofauth-client');
const logger = require('./logger');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Enable CORS for browser extension
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  })
);

// Parse JSON bodies
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    // Don't log token in URL
    const path = req.path;
    logger.request(req.method, path, res.statusCode, duration);
  });
  next();
});

// Auth middleware - validates proxy token
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn(`Unauthorized request to ${req.path}: Missing authorization header`);
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.substring(7);

  if (!tokenManager.validateToken(token)) {
    logger.warn(`Unauthorized request to ${req.path}: Invalid token`);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  next();
};

// Error handler for 2FAuth login failures
function handleProxyError(error, res, operation) {
  if (error.loginFailed) {
    logger.error(`2FAuth login failed during ${operation}: ${error.loginError}`);
    return res.status(503).json({
      error: '2FAuth authentication failed',
      message: error.loginError || 'Could not authenticate with 2FAuth server',
      code: 'TWOFAUTH_AUTH_FAILED',
    });
  }
  logger.error(`Error during ${operation}: ${error.message}`);
  return res.status(500).json({ error: error.message });
}

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// User endpoint - returns user info
app.get('/api/v1/user', authMiddleware, async (req, res) => {
  try {
    const response = await twofauthClient.get('/api/v1/user');
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    handleProxyError(error, res, 'fetching user');
  }
});

// Get all 2FA accounts
app.get('/api/v1/twofaccounts', authMiddleware, async (req, res) => {
  try {
    const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
    const response = await twofauthClient.get(`/api/v1/twofaccounts${queryString}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    handleProxyError(error, res, 'fetching accounts');
  }
});

// Get single account
app.get('/api/v1/twofaccounts/:id', authMiddleware, async (req, res) => {
  try {
    const response = await twofauthClient.get(`/api/v1/twofaccounts/${req.params.id}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    handleProxyError(error, res, 'fetching account');
  }
});

// Get OTP for account
app.get('/api/v1/twofaccounts/:id/otp', authMiddleware, async (req, res) => {
  try {
    const response = await twofauthClient.get(`/api/v1/twofaccounts/${req.params.id}/otp`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    handleProxyError(error, res, 'fetching OTP');
  }
});

// Create account
app.post('/api/v1/twofaccounts', authMiddleware, async (req, res) => {
  try {
    logger.info('Creating new 2FA account');
    const response = await twofauthClient.post('/api/v1/twofaccounts', JSON.stringify(req.body));
    const data = await response.json();
    if (response.ok) {
      logger.info(`Created 2FA account: ${data.service || 'unknown'}`);
    }
    res.status(response.status).json(data);
  } catch (error) {
    handleProxyError(error, res, 'creating account');
  }
});

// Generate OTP from URI or params
app.post('/api/v1/twofaccounts/otp', authMiddleware, async (req, res) => {
  try {
    const response = await twofauthClient.post('/api/v1/twofaccounts/otp', JSON.stringify(req.body));
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    handleProxyError(error, res, 'generating OTP');
  }
});

// Preview account
app.post('/api/v1/twofaccounts/preview', authMiddleware, async (req, res) => {
  try {
    logger.info('Previewing account from URI');
    const response = await twofauthClient.post('/api/v1/twofaccounts/preview', JSON.stringify(req.body));
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    handleProxyError(error, res, 'previewing account');
  }
});

// Migration/Import
app.post('/api/v1/twofaccounts/migration', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    logger.info('Importing accounts');
    let response;

    if (req.file) {
      // Handle file upload
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('file', req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype,
      });
      formData.append('withSecret', '1');

      // Need to handle multipart form data differently
      const fetchModule = require('node-fetch');
      const fetchCookie = require('fetch-cookie');

      const loginResult = await twofauthClient.ensureLoggedIn();
      if (!loginResult.success) {
        return handleProxyError(
          { loginFailed: true, loginError: loginResult.error },
          res,
          'importing accounts'
        );
      }
      await twofauthClient.refreshCsrf();

      const jar = twofauthClient.cookieJar;
      const fetchWithCookies = fetchCookie(fetchModule, jar);

      response = await fetchWithCookies(`${config.twofauthUrl}/api/v1/twofaccounts/migration`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'X-CSRF-TOKEN': twofauthClient.csrfToken,
          'User-Agent': '2FAuth-Proxy/1.0',
          ...formData.getHeaders(),
        },
        body: formData,
      });
    } else {
      // Handle JSON payload
      response = await twofauthClient.post('/api/v1/twofaccounts/migration', JSON.stringify(req.body));
    }

    const data = await response.json();
    if (response.ok && Array.isArray(data)) {
      logger.info(`Imported ${data.length} account(s)`);
    }
    res.status(response.status).json(data);
  } catch (error) {
    handleProxyError(error, res, 'importing accounts');
  }
});

// Decode QR code
app.post('/api/v1/qrcode/decode', authMiddleware, upload.single('qrcode'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    logger.info('Decoding QR code');

    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('qrcode', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const fetchModule = require('node-fetch');
    const fetchCookie = require('fetch-cookie');

    const loginResult = await twofauthClient.ensureLoggedIn();
    if (!loginResult.success) {
      return handleProxyError(
        { loginFailed: true, loginError: loginResult.error },
        res,
        'decoding QR code'
      );
    }
    await twofauthClient.refreshCsrf();

    const jar = twofauthClient.cookieJar;
    const fetchWithCookies = fetchCookie(fetchModule, jar);

    const response = await fetchWithCookies(`${config.twofauthUrl}/api/v1/qrcode/decode`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'X-CSRF-TOKEN': twofauthClient.csrfToken,
        'User-Agent': '2FAuth-Proxy/1.0',
        ...formData.getHeaders(),
      },
      body: formData,
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    handleProxyError(error, res, 'decoding QR code');
  }
});

// Get groups
app.get('/api/v1/groups', authMiddleware, async (req, res) => {
  try {
    const response = await twofauthClient.get('/api/v1/groups');
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    handleProxyError(error, res, 'fetching groups');
  }
});

// Get default icon
app.post('/api/v1/icons/default', authMiddleware, async (req, res) => {
  try {
    const response = await twofauthClient.post('/api/v1/icons/default', JSON.stringify(req.body));
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    handleProxyError(error, res, 'fetching icon');
  }
});

// Upload icon
app.post('/api/v1/icons', authMiddleware, upload.single('icon'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    logger.info('Uploading icon');

    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('icon', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const fetchModule = require('node-fetch');
    const fetchCookie = require('fetch-cookie');

    const loginResult = await twofauthClient.ensureLoggedIn();
    if (!loginResult.success) {
      return handleProxyError(
        { loginFailed: true, loginError: loginResult.error },
        res,
        'uploading icon'
      );
    }
    await twofauthClient.refreshCsrf();

    const jar = twofauthClient.cookieJar;
    const fetchWithCookies = fetchCookie(fetchModule, jar);

    const response = await fetchWithCookies(`${config.twofauthUrl}/api/v1/icons`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'X-CSRF-TOKEN': twofauthClient.csrfToken,
        'User-Agent': '2FAuth-Proxy/1.0',
        ...formData.getHeaders(),
      },
      body: formData,
    });

    const data = await response.json();
    if (response.ok) {
      logger.info(`Uploaded icon: ${data.filename || 'unknown'}`);
    }
    res.status(response.status).json(data);
  } catch (error) {
    handleProxyError(error, res, 'uploading icon');
  }
});

// Proxy icon files (supports token via query param for img tags)
app.get('/storage/icons/:filename', async (req, res) => {
  // Support token via query param (for img src) or Authorization header
  const queryToken = req.query.token;
  const authHeader = req.headers.authorization;
  let token = queryToken;

  if (!token && authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  if (!token || !tokenManager.validateToken(token)) {
    return res.status(401).json({ error: 'Invalid or missing token' });
  }

  try {
    const response = await twofauthClient.get(`/storage/icons/${req.params.filename}`);

    if (!response.ok) {
      return res.status(response.status).send('Icon not found');
    }

    const buffer = await response.buffer();
    const contentType = response.headers.get('content-type') || 'image/png';

    res.set('Content-Type', contentType);
    res.send(buffer);
  } catch (error) {
    handleProxyError(error, res, 'fetching icon');
  }
});

// Start server
async function start() {
  logger.info('Starting 2FAuth Proxy server...');

  // Validate configuration
  if (!config.twofauthEmail || !config.twofauthPassword) {
    logger.error('TWOFAUTH_EMAIL and TWOFAUTH_PASSWORD environment variables are required');
    process.exit(1);
  }

  if (!config.twofauthUrl) {
    logger.error('TWOFAUTH_URL environment variable is required');
    process.exit(1);
  }

  logger.info(`2FAuth server: ${config.twofauthUrl}`);

  // Check if token exists
  const currentToken = tokenManager.getCurrentToken();
  if (currentToken) {
    logger.info('Existing proxy token found');
  } else {
    logger.warn('No proxy token found. Run "npm run generate-token" to create one.');
  }

  // Don't try to login on startup - let it happen on first request
  // This allows the server to start even if 2FAuth is temporarily unavailable

  app.listen(config.port, '0.0.0.0', () => {
    logger.info(`2FAuth Proxy server running on port ${config.port}`);
    logger.info('Waiting for requests...');
  });
}

start();
