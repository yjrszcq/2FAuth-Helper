// 2FAuth Browser Extension App
class TwoFAuthApp {
  constructor() {
    this.currentScreen = 'loading';
    this.accounts = [];
    this.currentAccount = null;
    this.otpTimer = null;
    this.otpInterval = null;
    this.previewUri = null;
    this.previewData = null;
    this.manualIconFile = null;
    this.manualIconFilename = null;

    this.init();
  }

  async init() {
    // Load saved data
    const data = await this.loadStorage();

    // Apply saved theme (default to system)
    this.applyTheme(data.theme || 'system');

    // Setup system theme change listener
    this.setupSystemThemeListener();

    // Apply saved language
    this.applyLanguage(data.language || 'en');

    // Load QR mode setting (default to manual)
    this.qrMode = data.qrMode || 'manual';

    if (data.serverUrl) {
      api.setBaseUrl(data.serverUrl);
    }

    if (data.token) {
      api.setToken(data.token);
    }

    // Setup event listeners
    this.setupEventListeners();

    // Check authentication state
    await this.checkAuthState(data);
  }

  applyLanguage(lang) {
    i18n.currentLang = lang;
    i18n.updateUI();
  }

  async setLanguage(lang) {
    i18n.setLang(lang);
    await this.saveStorage({ language: lang });
  }

  async setTheme(theme) {
    this.themeSetting = theme;
    this.applyTheme(theme);
    await this.saveStorage({ theme });
  }

  async setQrMode(mode) {
    this.qrMode = mode;
    await this.saveStorage({ qrMode: mode });
  }

  showSettingsScreen() {
    // Update dropdowns to current values
    document.getElementById('settings-language').value = i18n.currentLang;
    document.getElementById('settings-theme').value = this.themeSetting || 'system';
    document.getElementById('settings-qr-mode').value = this.qrMode || 'manual';
    this.showScreen('settings');
  }

  applyTheme(theme) {
    this.themeSetting = theme;
    let effectiveTheme = theme;

    if (theme === 'system') {
      // Use browser/system preference
      effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    document.documentElement.setAttribute('data-theme', effectiveTheme);
    this.currentTheme = effectiveTheme;
  }

  setupSystemThemeListener() {
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (this.themeSetting === 'system') {
        const effectiveTheme = e.matches ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', effectiveTheme);
        this.currentTheme = effectiveTheme;
      }
    });
  }

  async loadStorage() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['serverUrl', 'token', 'user', 'theme', 'language', 'qrMode'], (result) => {
        resolve(result || {});
      });
    });
  }

  async saveStorage(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set(data, resolve);
    });
  }

  async clearStorage() {
    return new Promise((resolve) => {
      chrome.storage.local.clear(resolve);
    });
  }

  async checkAuthState(data) {
    if (!data.serverUrl) {
      this.showScreen('setup');
      return;
    }

    if (!data.token) {
      this.showScreen('login');
      this.updateServerDisplay(data.serverUrl);
      return;
    }

    // Try to validate token
    try {
      const user = await api.getUser();
      await this.saveStorage({ user });
      this.showMainScreen(user);
    } catch (error) {
      if (error.status === 401) {
        // Token expired
        await this.saveStorage({ token: null, user: null });
        this.showScreen('login');
        this.updateServerDisplay(data.serverUrl);
      } else if (error.code === 'TWOFAUTH_AUTH_FAILED') {
        // Proxy cannot authenticate with 2FAuth server
        this.showScreen('login');
        this.updateServerDisplay(data.serverUrl);
        this.showToast(`${i18n.t('twofauthFailed')}: ${error.message || 'Authentication error'}`, 'error');
      } else {
        // Server error or network issue
        this.showScreen('login');
        this.updateServerDisplay(data.serverUrl);
        this.showToast(i18n.t('cannotConnectServer'), 'error');
      }
    }
  }

  showScreen(screenName) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach((screen) => {
      screen.classList.add('hidden');
    });

    // Show target screen
    const targetScreen = document.getElementById(`${screenName}-screen`);
    if (targetScreen) {
      targetScreen.classList.remove('hidden');
    }

    this.currentScreen = screenName;

    // Stop OTP timer if leaving OTP screen
    if (screenName !== 'otp') {
      this.stopOtpTimer();
    }
  }

  updateServerDisplay(url) {
    const serverDisplay = document.getElementById('current-server');
    if (serverDisplay) {
      try {
        const urlObj = new URL(url);
        serverDisplay.textContent = urlObj.hostname;
      } catch {
        serverDisplay.textContent = url;
      }
    }
  }

  async showMainScreen(user) {
    this.showScreen('main');

    // Update user display
    const userDisplay = document.getElementById('current-user');
    if (userDisplay && user) {
      userDisplay.textContent = user.name || user.email || 'User';
    }

    // Load accounts
    await this.loadAccounts();
  }

  async loadAccounts() {
    try {
      this.accounts = await api.getAccounts(false);
      this.renderAccountList();
    } catch (error) {
      if (error.code === 'TWOFAUTH_AUTH_FAILED') {
        this.showToast(`${i18n.t('twofauthFailed')}: ${error.message || 'Authentication error'}`, 'error');
      } else {
        this.showToast(i18n.t('failedLoadAccounts'), 'error');
      }
    }
  }

  renderAccountList(filter = '') {
    const listContainer = document.getElementById('account-list');
    const emptyState = document.getElementById('empty-state');

    if (!listContainer) return;

    // Filter accounts
    let filteredAccounts = this.accounts;
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      filteredAccounts = this.accounts.filter(
        (account) =>
          (account.service && account.service.toLowerCase().includes(lowerFilter)) ||
          (account.account && account.account.toLowerCase().includes(lowerFilter))
      );
    }

    if (filteredAccounts.length === 0 && !filter) {
      listContainer.classList.add('hidden');
      emptyState.classList.remove('hidden');
      return;
    }

    listContainer.classList.remove('hidden');
    emptyState.classList.add('hidden');

    listContainer.innerHTML = filteredAccounts
      .map(
        (account) => `
      <div class="account-item" data-id="${account.id}">
        <div class="account-icon">
          ${this.getAccountIcon(account)}
        </div>
        <div class="account-info">
          <div class="account-service">${this.escapeHtml(account.service || 'Unknown')}</div>
          <div class="account-name">${this.escapeHtml(account.account || '')}</div>
        </div>
        <div class="account-arrow">
          <i class="fas fa-chevron-right"></i>
        </div>
      </div>
    `
      )
      .join('');

    // Add click handlers
    listContainer.querySelectorAll('.account-item').forEach((item) => {
      item.addEventListener('click', () => {
        const id = parseInt(item.dataset.id);
        this.showOtpScreen(id);
      });
    });
  }

  getAccountIcon(account) {
    if (account.icon) {
      // Use token in query param for img src (can't set Authorization header on img tags)
      const iconUrl = `${api.baseUrl}/storage/icons/${account.icon}?token=${api.token}`;
      return `<img src="${iconUrl}" alt="${this.escapeHtml(account.service)}" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-key\\'></i>'">`;
    }
    return '<i class="fas fa-key"></i>';
  }

  async showOtpScreen(accountId) {
    const account = this.accounts.find((a) => a.id === accountId);
    if (!account) return;

    this.currentAccount = account;
    this.showScreen('otp');

    // Update display
    document.getElementById('otp-title').textContent = account.service || 'OTP';
    document.getElementById('otp-service').textContent = account.service || 'Unknown';
    document.getElementById('otp-account').textContent = account.account || '';

    const iconContainer = document.getElementById('otp-icon');
    iconContainer.innerHTML = this.getAccountIcon(account);

    // Load OTP
    await this.refreshOtp();
  }

  async refreshOtp() {
    if (!this.currentAccount) return;

    try {
      const otp = await api.getOtp(this.currentAccount.id);
      this.displayOtp(otp);
    } catch (error) {
      if (error.code === 'TWOFAUTH_AUTH_FAILED') {
        this.showToast(`${i18n.t('twofauthFailed')}: ${error.message || 'Authentication error'}`, 'error');
      } else {
        this.showToast(i18n.t('failedGetOtp'), 'error');
      }
    }
  }

  displayOtp(otp) {
    const codeDisplay = document.getElementById('otp-code');
    const timerProgress = document.getElementById('timer-progress');
    const timerText = document.getElementById('timer-text');
    const dotsContainer = document.getElementById('otp-dots');

    // Format OTP code with space in middle
    const code = otp.password || otp.otp || '------';
    const formattedCode =
      code.length > 3 ? code.slice(0, Math.ceil(code.length / 2)) + ' ' + code.slice(Math.ceil(code.length / 2)) : code;

    codeDisplay.textContent = formattedCode;

    // Handle TOTP timer
    if (otp.otp_type === 'totp' || otp.otp_type === 'steamtotp') {
      const period = otp.period || 30;
      const generatedAt = otp.generated_at || Math.floor(Date.now() / 1000);
      const remaining = period - (Math.floor(Date.now() / 1000) % period);

      // Create dots for visual timer
      dotsContainer.innerHTML = '';
      for (let i = 0; i < period; i++) {
        const dot = document.createElement('div');
        dot.className = 'otp-dot';
        if (i < remaining) dot.classList.add('active');
        dotsContainer.appendChild(dot);
      }

      this.startOtpTimer(period, remaining);
    } else if (otp.otp_type === 'hotp') {
      timerProgress.style.width = '100%';
      timerText.textContent = 'HOTP';
      dotsContainer.innerHTML = '';
    }
  }

  startOtpTimer(period, remaining) {
    this.stopOtpTimer();

    const timerProgress = document.getElementById('timer-progress');
    const timerText = document.getElementById('timer-text');
    const dotsContainer = document.getElementById('otp-dots');

    let currentRemaining = remaining;

    const updateTimer = () => {
      const progress = (currentRemaining / period) * 100;
      timerProgress.style.width = `${progress}%`;
      timerText.textContent = `${currentRemaining}s`;

      // Update dots
      const dots = dotsContainer.querySelectorAll('.otp-dot');
      dots.forEach((dot, index) => {
        if (index < currentRemaining) {
          dot.classList.add('active');
        } else {
          dot.classList.remove('active');
        }
      });

      currentRemaining--;

      if (currentRemaining < 0) {
        this.refreshOtp();
      }
    };

    updateTimer();
    this.otpInterval = setInterval(updateTimer, 1000);
  }

  stopOtpTimer() {
    if (this.otpInterval) {
      clearInterval(this.otpInterval);
      this.otpInterval = null;
    }
  }

  async copyOtp() {
    const codeDisplay = document.getElementById('otp-code');
    const code = codeDisplay.textContent.replace(/\s/g, '');

    try {
      await navigator.clipboard.writeText(code);
      this.showToast(i18n.t('copiedToClipboard'), 'success');
    } catch (error) {
      this.showToast(i18n.t('failedToCopy'), 'error');
    }
  }

  // Screen QR Code Scanning
  async scanScreenQr() {
    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab) {
        this.showToast(i18n.t('failedCaptureScreen'), 'error');
        return;
      }

      // Capture visible tab
      const imageDataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });

      // Process the image
      const qrData = await this.decodeQrFromDataUrl(imageDataUrl);

      if (qrData) {
        await this.handleQrData(qrData);
      } else {
        this.showToast(i18n.t('noQrFound'), 'error');
      }
    } catch (error) {
      console.error('Screen capture error:', error);
      this.showToast(i18n.t('failedCaptureScreen'), 'error');
    }
  }

  async decodeQrFromDataUrl(dataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        resolve(code ? code.data : null);
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  }

  async handleQrData(data) {
    // Check for otpauth URI
    if (data.toLowerCase().startsWith('otpauth://')) {
      // Check qrMode setting
      if (this.qrMode === 'manual') {
        // Parse URI and fill manual form
        await this.parseUriAndFillForm(data);
      } else {
        // Direct mode: show preview
        await this.showPreview(data);
      }
    }
    // Check for Google Authenticator migration URI
    else if (data.toLowerCase().startsWith('otpauth-migration://')) {
      await this.handleMigrationUri(data);
    } else {
      this.showToast(i18n.t('invalidQrFormat'), 'error');
    }
  }

  async showPreview(uri) {
    this.previewUri = uri;

    try {
      // Preview the account
      const preview = await api.previewAccount(uri);
      this.previewData = preview;

      // Show preview screen
      this.showScreen('qr-preview');

      document.getElementById('preview-service').textContent = preview.service || 'Unknown';
      document.getElementById('preview-account').textContent = preview.account || '';

      const iconContainer = document.getElementById('preview-icon');
      if (preview.icon) {
        const iconUrl = `${api.baseUrl}/storage/icons/${preview.icon}`;
        iconContainer.innerHTML = `<img src="${iconUrl}" alt="${this.escapeHtml(preview.service)}" onerror="this.innerHTML='<i class=\\'fas fa-key\\'></i>'">`;
      } else {
        iconContainer.innerHTML = '<i class="fas fa-key"></i>';
      }

      // Get preview OTP
      const otp = await api.getOtpByUri(uri);
      const code = otp.password || otp.otp || '------';
      const formattedCode =
        code.length > 3
          ? code.slice(0, Math.ceil(code.length / 2)) + ' ' + code.slice(Math.ceil(code.length / 2))
          : code;
      document.getElementById('preview-otp-code').textContent = formattedCode;
    } catch (error) {
      if (error.code === 'TWOFAUTH_AUTH_FAILED') {
        this.showToast(`${i18n.t('twofauthFailed')}: ${error.message || 'Authentication error'}`, 'error');
      } else {
        this.showToast(i18n.t('failedPreview'), 'error');
      }
    }
  }

  async confirmAddAccount() {
    if (!this.previewUri) return;

    try {
      await api.createAccountFromUri(this.previewUri);
      this.showToast(i18n.t('accountAdded'), 'success');
      this.previewUri = null;
      this.previewData = null;
      await this.loadAccounts();
      this.showScreen('main');
    } catch (error) {
      const errorEl = document.getElementById('preview-error');
      if (error.code === 'TWOFAUTH_AUTH_FAILED') {
        errorEl.textContent = `2FAuth connection failed: ${error.message || 'Authentication error'}`;
      } else {
        errorEl.textContent = error.message || 'Failed to add account';
      }
      errorEl.classList.remove('hidden');
    }
  }

  async handleMigrationUri(uri) {
    try {
      const result = await api.migrate({ payload: uri });
      if (result && result.length > 0) {
        this.showToast(i18n.t('importedAccounts', { count: result.length }), 'success');
        await this.loadAccounts();
        this.showScreen('main');
      } else {
        this.showToast(i18n.t('noAccountsToImport'), 'error');
      }
    } catch (error) {
      if (error.code === 'TWOFAUTH_AUTH_FAILED') {
        this.showToast(`${i18n.t('twofauthFailed')}: ${error.message || 'Authentication error'}`, 'error');
      } else {
        this.showToast(error.message || i18n.t('failedImport'), 'error');
      }
    }
  }

  async uploadQrImage(file) {
    try {
      // First try to decode locally
      const dataUrl = await this.fileToDataUrl(file);
      const localResult = await this.decodeQrFromDataUrl(dataUrl);

      if (localResult) {
        await this.handleQrData(localResult);
        return;
      }

      // Fall back to server-side decoding
      const result = await api.decodeQrCode(file);
      if (result && result.data) {
        await this.handleQrData(result.data);
      } else {
        this.showToast(i18n.t('noQrInImage'), 'error');
      }
    } catch (error) {
      if (error.code === 'TWOFAUTH_AUTH_FAILED') {
        this.showToast(`${i18n.t('twofauthFailed')}: ${error.message || 'Authentication error'}`, 'error');
      } else {
        this.showToast(error.message || 'Failed to decode QR code', 'error');
      }
    }
  }

  fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Icon handling methods
  async fetchIconByService(serviceName) {
    if (!serviceName.trim()) {
      this.showToast(i18n.t('service') + ' is required', 'error');
      return;
    }

    try {
      // Show loading spinner in icon preview
      const preview = document.getElementById('manual-icon-preview');
      preview.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

      // Create timeout promise (3 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('timeout')), 3000);
      });

      // Race between API call and timeout
      const result = await Promise.race([
        api.getDefaultIcon(serviceName.trim()),
        timeoutPromise
      ]);

      if (result && result.filename) {
        this.manualIconFilename = result.filename;
        this.manualIconFile = null;
        this.updateIconPreview(result.filename);
      } else {
        // No icon found, use default
        await this.useDefaultIcon(serviceName.trim());
      }
    } catch (error) {
      // Timeout or error: use default icon
      await this.useDefaultIcon(serviceName.trim());
    }
  }

  async useDefaultIcon(serviceName) {
    // Set a special marker for default icon
    this.manualIconFile = null;
    this.manualIconFilename = 'default';

    // Generate preview of first-letter icon
    const preview = document.getElementById('manual-icon-preview');
    try {
      const iconFile = await this.generateDefaultIconFile(serviceName);
      const dataUrl = await this.fileToDataUrl(iconFile);
      preview.innerHTML = `<img src="${dataUrl}" alt="Default Icon">`;
    } catch (error) {
      // Fallback to key icon if generation fails
      preview.innerHTML = '<i class="fas fa-key"></i>';
    }
  }

  async uploadIconFile(file) {
    try {
      const dataUrl = await this.fileToDataUrl(file);
      this.manualIconFile = file;
      this.manualIconFilename = null;

      // Show preview
      const preview = document.getElementById('manual-icon-preview');
      preview.innerHTML = `<img src="${dataUrl}" alt="Icon">`;
    } catch (error) {
      this.showToast(i18n.t('failedFetchIcon'), 'error');
    }
  }

  clearIcon() {
    this.manualIconFile = null;
    this.manualIconFilename = null;

    const preview = document.getElementById('manual-icon-preview');
    preview.innerHTML = '<i class="fas fa-key"></i>';
  }

  updateIconPreview(filename) {
    const preview = document.getElementById('manual-icon-preview');
    const iconUrl = `${api.baseUrl}/storage/icons/${filename}?token=${api.token}`;
    preview.innerHTML = `<img src="${iconUrl}" alt="Icon" onerror="this.parentElement.innerHTML='<i class=\\'fas fa-key\\'></i>'">`;
  }

  generateDefaultIconFile(serviceName) {
    // Create a canvas to generate a default icon with first letter
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Generate a color based on service name
    let hash = 0;
    const name = serviceName || 'Default';
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;

    // Draw a colored circle background
    ctx.fillStyle = `hsl(${hue}, 65%, 55%)`;
    ctx.beginPath();
    ctx.arc(64, 64, 64, 0, Math.PI * 2);
    ctx.fill();

    // Draw the first character in white (works for both English and Chinese)
    const firstChar = (serviceName || '?').charAt(0);
    // Only uppercase for ASCII letters
    const displayChar = /^[a-zA-Z]$/.test(firstChar) ? firstChar.toUpperCase() : firstChar;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayChar, 64, 64);

    // Convert canvas to blob
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        const file = new File([blob], 'default-icon.png', { type: 'image/png' });
        resolve(file);
      }, 'image/png');
    });
  }

  resetManualForm() {
    document.getElementById('manual-form').reset();
    this.clearIcon();
    document.getElementById('manual-error').classList.add('hidden');
    // Reset OTP type specific options visibility
    document.querySelector('.totp-options').classList.remove('hidden');
    document.querySelector('.hotp-options').classList.add('hidden');
  }

  async parseUriAndFillForm(uri) {
    try {
      // Parse otpauth:// URI
      const url = new URL(uri);
      const type = url.hostname; // totp or hotp
      const path = url.pathname.substring(1); // Remove leading /

      // Parse label (service:account or just account)
      let service = '';
      let account = '';
      if (path.includes(':')) {
        const parts = path.split(':');
        service = decodeURIComponent(parts[0]);
        account = decodeURIComponent(parts[1] || '');
      } else {
        account = decodeURIComponent(path);
      }

      // Get URL parameters
      const params = url.searchParams;
      const secret = params.get('secret') || '';
      const issuer = params.get('issuer');
      const algorithm = params.get('algorithm') || 'SHA1';
      const digits = params.get('digits') || '6';
      const period = params.get('period') || '30';
      const counter = params.get('counter') || '0';

      // Use issuer if service is empty
      if (!service && issuer) {
        service = issuer;
      }

      // Fill the form
      document.getElementById('manual-service').value = service;
      document.getElementById('manual-account').value = account;
      document.getElementById('manual-secret').value = secret;
      document.getElementById('manual-digits').value = digits;
      document.getElementById('manual-algorithm').value = algorithm.toUpperCase();
      document.getElementById('manual-period').value = period;
      document.getElementById('manual-counter').value = counter;

      // Set OTP type
      const otpTypeSelect = document.getElementById('manual-otp-type');
      if (type === 'hotp') {
        otpTypeSelect.value = 'hotp';
        document.querySelector('.totp-options').classList.add('hidden');
        document.querySelector('.hotp-options').classList.remove('hidden');
      } else {
        otpTypeSelect.value = 'totp';
        document.querySelector('.totp-options').classList.remove('hidden');
        document.querySelector('.hotp-options').classList.add('hidden');
      }

      // Show manual entry screen
      this.showScreen('manual');

      // Auto-fetch icon if service name exists
      if (service) {
        await this.fetchIconByService(service);
      }
    } catch (error) {
      console.error('Failed to parse URI:', error);
      this.showToast(i18n.t('invalidQrFormat'), 'error');
    }
  }

  async addManualAccount(formData) {
    try {
      const accountData = {
        service: formData.service,
        account: formData.account,
        otp_type: formData.otpType,
        secret: formData.secret,
        digits: parseInt(formData.digits),
        algorithm: formData.algorithm,
      };

      if (formData.otpType === 'totp' || formData.otpType === 'steamtotp') {
        accountData.period = parseInt(formData.period);
      } else if (formData.otpType === 'hotp') {
        accountData.counter = parseInt(formData.counter);
      }

      // Handle icon - wrap in try-catch to prevent icon upload failure from blocking account creation
      try {
        if (this.manualIconFile) {
          // User uploaded icon: upload and use it
          const uploadResult = await api.uploadIcon(this.manualIconFile);
          if (uploadResult && uploadResult.filename) {
            accountData.icon = uploadResult.filename;
          }
        } else if (this.manualIconFilename && this.manualIconFilename !== 'default') {
          // Successfully fetched icon: use it directly
          accountData.icon = this.manualIconFilename;
        } else if (this.manualIconFilename === 'default' || !this.manualIconFilename) {
          // Using default marker or no icon set: generate first-letter icon and upload
          const defaultIconFile = await this.generateDefaultIconFile(formData.service);
          const uploadResult = await api.uploadIcon(defaultIconFile);
          if (uploadResult && uploadResult.filename) {
            accountData.icon = uploadResult.filename;
          }
        }
      } catch (iconError) {
        // Icon upload failed, but continue without icon
        console.warn('Icon upload failed:', iconError);
        // accountData.icon will remain undefined, 2FAuth will use default behavior
      }

      await api.createAccount(accountData);
      this.showToast(i18n.t('accountAdded'), 'success');
      this.resetManualForm();
      await this.loadAccounts();
      this.showScreen('main');
    } catch (error) {
      const errorEl = document.getElementById('manual-error');
      if (error.code === 'TWOFAUTH_AUTH_FAILED') {
        errorEl.textContent = `${i18n.t('twofauthFailed')}: ${error.message || 'Authentication error'}`;
      } else {
        errorEl.textContent = error.message || i18n.t('failedAddAccount');
      }
      errorEl.classList.remove('hidden');
    }
  }

  async importAccounts(source, data) {
    try {
      let result;

      if (data instanceof File) {
        result = await api.migrate({}, data);
      } else {
        result = await api.migrate({ payload: data });
      }

      if (result && result.length > 0) {
        this.showToast(i18n.t('importedAccounts', { count: result.length }), 'success');
        await this.loadAccounts();
        this.showScreen('main');
      } else {
        this.showToast(i18n.t('noAccountsToImport'), 'error');
      }
    } catch (error) {
      const errorEl = document.getElementById('import-error');
      if (error.code === 'TWOFAUTH_AUTH_FAILED') {
        errorEl.textContent = `${i18n.t('twofauthFailed')}: ${error.message || 'Authentication error'}`;
      } else {
        errorEl.textContent = error.message || i18n.t('failedImport');
      }
      errorEl.classList.remove('hidden');
    }
  }

  async logout() {
    // PAT-based auth doesn't need server-side logout
    // Just clear local storage and reset state
    await this.saveStorage({ token: null, user: null });
    api.setToken('');
    this.accounts = [];
    this.currentAccount = null;

    const data = await this.loadStorage();
    this.showScreen('login');
    this.updateServerDisplay(data.serverUrl);

    // Clear the token input field
    const tokenInput = document.getElementById('pat-token');
    if (tokenInput) {
      tokenInput.value = '';
    }
  }

  showToast(message, type = '') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');

    toast.className = 'toast';
    if (type) toast.classList.add(type);

    toastMessage.textContent = message;
    toast.classList.remove('hidden');

    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  setupEventListeners() {
    // Setup Form
    const setupForm = document.getElementById('setup-form');
    setupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const serverUrl = document.getElementById('server-url').value.trim();
      const errorEl = document.getElementById('setup-error');
      const submitBtn = document.getElementById('setup-submit-btn');

      errorEl.classList.add('hidden');

      if (!serverUrl) return;

      // Show loading state
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> <span>Connecting...</span>';

      try {
        api.setBaseUrl(serverUrl);
        const isValid = await api.checkServer();

        if (isValid) {
          await this.saveStorage({ serverUrl });
          this.showScreen('login');
          this.updateServerDisplay(serverUrl);
        } else {
          errorEl.textContent = 'Cannot connect to proxy server. Please check the URL and ensure the server is running.';
          errorEl.classList.remove('hidden');
        }
      } catch (error) {
        errorEl.textContent = `Connection failed: ${error.message || 'Network error'}`;
        errorEl.classList.remove('hidden');
      } finally {
        // Restore button state
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-check"></i> <span>Save & Continue</span>';
      }
    });

    // Back to setup
    document.getElementById('back-to-setup').addEventListener('click', async () => {
      await this.saveStorage({ serverUrl: null, token: null, user: null });
      this.showScreen('setup');
    });

    // Login Form (PAT-based)
    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const token = document.getElementById('pat-token').value.trim();

      const errorEl = document.getElementById('login-error');
      errorEl.classList.add('hidden');

      if (!token) {
        errorEl.textContent = 'Please enter your proxy token';
        errorEl.classList.remove('hidden');
        return;
      }

      try {
        // Set the token and try to get user info to validate it
        api.setToken(token);
        const user = await api.getUser();

        // Token is valid, save it
        await this.saveStorage({ token, user });
        this.showMainScreen(user);
      } catch (error) {
        api.setToken('');
        if (error.status === 401) {
          errorEl.textContent = 'Invalid or expired token. Generate a new one with: docker exec 2fauth-proxy npm run generate-token';
        } else if (error.code === 'TWOFAUTH_AUTH_FAILED') {
          errorEl.textContent = `2FAuth connection failed: ${error.message || 'The proxy cannot authenticate with 2FAuth server'}`;
        } else {
          errorEl.textContent = error.message || 'Failed to authenticate';
        }
        errorEl.classList.remove('hidden');
      }
    });

    // Toggle password visibility
    document.querySelector('.toggle-password').addEventListener('click', function () {
      const passwordInput = document.getElementById('pat-token');
      const icon = this.querySelector('i');

      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        icon.className = 'fas fa-eye-slash';
      } else {
        passwordInput.type = 'password';
        icon.className = 'fas fa-eye';
      }
    });

    // User dropdown
    const userDropdownTrigger = document.getElementById('user-dropdown-trigger');
    const userDropdown = document.getElementById('user-dropdown');

    userDropdownTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
      userDropdown.classList.add('hidden');
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
      this.logout();
    });

    // Settings button
    document.getElementById('settings-btn').addEventListener('click', () => {
      this.showSettingsScreen();
    });

    // Add account button
    document.getElementById('add-account-btn').addEventListener('click', () => {
      this.showScreen('add');
    });

    document.getElementById('add-first-account').addEventListener('click', () => {
      this.showScreen('add');
    });

    // Search
    const searchInput = document.getElementById('search-input');
    const clearSearch = document.getElementById('clear-search');

    searchInput.addEventListener('input', (e) => {
      const value = e.target.value;
      this.renderAccountList(value);
      clearSearch.classList.toggle('hidden', !value);
    });

    clearSearch.addEventListener('click', () => {
      searchInput.value = '';
      this.renderAccountList();
      clearSearch.classList.add('hidden');
    });

    // Back from OTP
    document.getElementById('back-to-list').addEventListener('click', () => {
      this.showScreen('main');
    });

    // Copy OTP
    document.getElementById('copy-otp').addEventListener('click', () => {
      this.copyOtp();
    });

    // Back from Add
    document.getElementById('back-from-add').addEventListener('click', () => {
      this.showScreen('main');
    });

    // Scan screen QR
    document.getElementById('scan-screen-qr').addEventListener('click', () => {
      this.scanScreenQr();
    });

    // Upload QR
    const qrFileInput = document.getElementById('qr-file-input');
    document.getElementById('upload-qr').addEventListener('click', () => {
      qrFileInput.click();
    });

    qrFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.uploadQrImage(file);
        qrFileInput.value = '';
      }
    });

    // Manual entry
    document.getElementById('manual-entry').addEventListener('click', () => {
      this.showScreen('manual');
    });

    // Import accounts
    document.getElementById('import-accounts').addEventListener('click', () => {
      this.showScreen('import');
    });

    // Back from manual
    document.getElementById('back-from-manual').addEventListener('click', () => {
      this.resetManualForm();
      this.showScreen('add');
    });

    // Manual form
    const manualForm = document.getElementById('manual-form');
    const otpTypeSelect = document.getElementById('manual-otp-type');

    otpTypeSelect.addEventListener('change', (e) => {
      const isHotp = e.target.value === 'hotp';
      document.querySelector('.totp-options').classList.toggle('hidden', isHotp);
      document.querySelector('.hotp-options').classList.toggle('hidden', !isHotp);
    });

    manualForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      document.getElementById('manual-error').classList.add('hidden');

      const formData = {
        service: document.getElementById('manual-service').value.trim(),
        account: document.getElementById('manual-account').value.trim(),
        secret: document.getElementById('manual-secret').value.trim().replace(/\s/g, ''),
        otpType: document.getElementById('manual-otp-type').value,
        digits: document.getElementById('manual-digits').value,
        algorithm: document.getElementById('manual-algorithm').value,
        period: document.getElementById('manual-period').value,
        counter: document.getElementById('manual-counter').value,
      };

      await this.addManualAccount(formData);
    });

    // Icon buttons for manual entry
    document.getElementById('fetch-icon-btn').addEventListener('click', () => {
      const serviceName = document.getElementById('manual-service').value;
      this.fetchIconByService(serviceName);
    });

    const iconFileInput = document.getElementById('icon-file-input');
    document.getElementById('upload-icon-btn').addEventListener('click', () => {
      iconFileInput.click();
    });

    iconFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.uploadIconFile(file);
        iconFileInput.value = '';
      }
    });

    document.getElementById('clear-icon-btn').addEventListener('click', () => {
      this.clearIcon();
    });

    // Back from import
    document.getElementById('back-from-import').addEventListener('click', () => {
      document.getElementById('import-error').classList.add('hidden');
      this.showScreen('add');
    });

    // Import scan QR
    document.getElementById('import-scan-qr').addEventListener('click', () => {
      this.scanScreenQr();
    });

    // Import upload QR
    document.getElementById('import-upload-qr').addEventListener('click', () => {
      qrFileInput.click();
    });

    // Import upload file
    const importFileInput = document.getElementById('import-file-input');
    document.getElementById('import-upload-file').addEventListener('click', () => {
      importFileInput.click();
    });

    importFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const source = document.getElementById('import-source').value;
        this.importAccounts(source, file);
        importFileInput.value = '';
      }
    });

    // Import submit (text)
    document.getElementById('import-submit').addEventListener('click', () => {
      const text = document.getElementById('import-text').value.trim();
      if (text) {
        const source = document.getElementById('import-source').value;
        this.importAccounts(source, text);
      } else {
        this.showToast(i18n.t('pleaseEnterData'), 'error');
      }
    });

    // QR Preview - Confirm
    document.getElementById('confirm-add').addEventListener('click', () => {
      this.confirmAddAccount();
    });

    // QR Preview - Cancel
    document.getElementById('cancel-add').addEventListener('click', () => {
      this.previewUri = null;
      this.previewData = null;
      document.getElementById('preview-error').classList.add('hidden');
      this.showScreen('add');
    });

    // Back from QR Preview
    document.getElementById('back-from-qr-preview').addEventListener('click', () => {
      this.previewUri = null;
      this.previewData = null;
      document.getElementById('preview-error').classList.add('hidden');
      this.showScreen('add');
    });

    // Settings screen
    document.getElementById('back-from-settings').addEventListener('click', () => {
      this.showScreen('main');
    });

    document.getElementById('settings-language').addEventListener('change', (e) => {
      this.setLanguage(e.target.value);
    });

    document.getElementById('settings-theme').addEventListener('change', (e) => {
      this.setTheme(e.target.value);
    });

    document.getElementById('settings-qr-mode').addEventListener('change', (e) => {
      this.setQrMode(e.target.value);
    });
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new TwoFAuthApp();
});
