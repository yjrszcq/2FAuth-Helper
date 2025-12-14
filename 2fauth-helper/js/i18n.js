// Internationalization (i18n) support
const i18n = {
  currentLang: 'en',

  translations: {
    en: {
      // Setup Screen
      selfHosted2FA: 'Self-hosted 2FA solution',
      proxyServerUrl: 'Proxy Server URL',
      proxyServerHelp: 'Enter your 2FAuth Proxy server address',
      saveContinue: 'Save & Continue',
      connecting: 'Connecting...',
      cannotConnectProxy: 'Cannot connect to proxy server. Please check the URL and ensure the server is running.',
      connectionFailed: 'Connection failed',

      // Login Screen
      login: 'Login',
      proxyToken: 'Proxy Token',
      tokenPlaceholder: 'Paste your proxy token here',
      tokenHelp: 'Generate token via command:',
      invalidToken: 'Invalid or expired token. Generate a new one with: docker exec 2fauth-proxy npm run generate-token',
      twofauthFailed: '2FAuth connection failed',
      authFailed: 'Failed to authenticate',
      enterToken: 'Please enter your proxy token',
      changeServer: 'Change Server',

      // Main Screen
      searchAccounts: 'Search accounts...',
      logout: 'Logout',
      addAccount: 'Add Account',
      noAccounts: 'No accounts yet',
      addFirstAccount: 'Add your first account',
      failedLoadAccounts: 'Failed to load accounts',

      // OTP Screen
      copy: 'Copy',
      copiedToClipboard: 'Copied to clipboard',
      failedToCopy: 'Failed to copy',
      failedGetOtp: 'Failed to get OTP',

      // Add Account Screen
      scanScreenQr: 'Scan Screen QR',
      scanScreenQrDesc: 'Capture QR code from current page',
      uploadQrImage: 'Upload QR Image',
      uploadQrDesc: 'Select QR code image file',
      manualEntry: 'Manual Entry',
      manualEntryDesc: 'Enter account details manually',
      import: 'Import',
      importDesc: 'Import from other apps',

      // Manual Entry Screen
      service: 'Service',
      servicePlaceholder: 'e.g., Google, GitHub',
      account: 'Account',
      accountPlaceholder: 'e.g., user@example.com',
      secretKey: 'Secret Key',
      secretPlaceholder: 'Base32 encoded secret',
      icon: 'Icon',
      fetchIcon: 'Fetch Icon',
      uploadIcon: 'Upload',
      iconHelp: 'Fetch icon by service name or upload custom icon',
      otpType: 'OTP Type',
      totpOption: 'TOTP (Time-based)',
      hotpOption: 'HOTP (Counter-based)',
      steamOption: 'Steam TOTP',
      digits: 'Digits',
      algorithm: 'Algorithm',
      period: 'Period (seconds)',
      counter: 'Counter',
      addAccountBtn: 'Add Account',
      failedAddAccount: 'Failed to add account',
      accountAdded: 'Account added successfully',
      fetchingIcon: 'Fetching icon...',
      iconFetched: 'Icon fetched',
      noIconFound: 'No icon found for this service',
      failedFetchIcon: 'Failed to fetch icon',
      usingDefault: 'using default icon',

      // Import Screen
      importAccounts: 'Import Accounts',
      importFrom: 'Import from',
      googleAuth: 'Google Authenticator (QR Code)',
      aegis: 'Aegis Authenticator',
      twofas: '2FAS Authenticator',
      twofauth: '2FAuth',
      freeotp: 'FreeOTP+',
      plainText: 'Plain Text (URI list)',
      scanExportQr: 'Scan Export QR',
      uploadExportQr: 'Upload Export QR',
      uploadFile: 'Upload File',
      uploadFileDesc: 'Upload JSON/TXT export file',
      orPasteText: 'Or paste export data:',
      pasteTextPlaceholder: 'Paste exported text or URIs here...',
      pleaseEnterData: 'Please enter export data',
      importBtn: 'Import',
      importedAccounts: 'Imported {count} account(s)',
      noAccountsToImport: 'No accounts found to import',
      failedImport: 'Failed to import',

      // QR Preview Screen
      previewAccount: 'Preview Account',
      confirmAdd: 'Add Account',
      cancel: 'Cancel',

      // General
      back: 'Back',
      error: 'Error',
      success: 'Success',
      loading: 'Loading...',
      noQrFound: 'No QR code found on screen',
      noQrInImage: 'No QR code found in image',
      invalidQrFormat: 'Invalid QR code format',
      failedCaptureScreen: 'Failed to capture screen',
      failedPreview: 'Failed to preview account',
      networkError: 'Network error',
      cannotConnectServer: 'Cannot connect to server',

      // Settings
      settings: 'Settings',
      language: 'Language',
      theme: 'Theme',
      systemTheme: 'System',
      lightTheme: 'Light',
      darkTheme: 'Dark',
      qrProcessMode: 'QR Code Processing',
      qrModeDirect: 'Submit Directly',
      qrModeManual: 'Edit Manually',
    },

    zh: {
      // Setup Screen
      selfHosted2FA: '自托管两步验证解决方案',
      proxyServerUrl: '代理服务器地址',
      proxyServerHelp: '输入你的 2FAuth 代理服务器地址',
      saveContinue: '保存并继续',
      connecting: '连接中...',
      cannotConnectProxy: '无法连接到代理服务器，请检查地址并确保服务器正在运行。',
      connectionFailed: '连接失败',

      // Login Screen
      login: '登录',
      proxyToken: '代理令牌',
      tokenPlaceholder: '在此粘贴代理令牌',
      tokenHelp: '通过以下命令生成令牌：',
      invalidToken: '令牌无效或已过期。请使用以下命令重新生成：docker exec 2fauth-proxy npm run generate-token',
      twofauthFailed: '2FAuth 连接失败',
      authFailed: '认证失败',
      enterToken: '请输入代理令牌',
      changeServer: '更换服务器',

      // Main Screen
      searchAccounts: '搜索账户...',
      logout: '退出登录',
      addAccount: '添加账户',
      noAccounts: '暂无账户',
      addFirstAccount: '添加你的第一个账户',
      failedLoadAccounts: '加载账户失败',

      // OTP Screen
      copy: '复制',
      copiedToClipboard: '已复制到剪贴板',
      failedToCopy: '复制失败',
      failedGetOtp: '获取验证码失败',

      // Add Account Screen
      scanScreenQr: '扫描屏幕二维码',
      scanScreenQrDesc: '从当前页面捕获二维码',
      uploadQrImage: '上传二维码图片',
      uploadQrDesc: '选择二维码图片文件',
      manualEntry: '手动输入',
      manualEntryDesc: '手动输入账户信息',
      import: '导入',
      importDesc: '从其他应用导入',

      // Manual Entry Screen
      service: '服务名称',
      servicePlaceholder: '例如：Google、GitHub',
      account: '账户',
      accountPlaceholder: '例如：user@example.com',
      secretKey: '密钥',
      secretPlaceholder: 'Base32 编码的密钥',
      icon: '图标',
      fetchIcon: '获取图标',
      uploadIcon: '上传',
      iconHelp: '根据服务名称获取图标或上传自定义图标',
      otpType: 'OTP 类型',
      totpOption: 'TOTP（基于时间）',
      hotpOption: 'HOTP（基于计数器）',
      steamOption: 'Steam TOTP',
      digits: '位数',
      algorithm: '算法',
      period: '周期（秒）',
      counter: '计数器',
      addAccountBtn: '添加账户',
      failedAddAccount: '添加账户失败',
      accountAdded: '账户添加成功',
      fetchingIcon: '正在获取图标...',
      iconFetched: '图标已获取',
      noIconFound: '未找到该服务的图标',
      failedFetchIcon: '获取图标失败',
      usingDefault: '使用默认图标',

      // Import Screen
      importAccounts: '导入账户',
      importFrom: '导入来源',
      googleAuth: 'Google 身份验证器（二维码）',
      aegis: 'Aegis Authenticator',
      twofas: '2FAS Authenticator',
      twofauth: '2FAuth',
      freeotp: 'FreeOTP+',
      plainText: '纯文本（URI 列表）',
      scanExportQr: '扫描导出二维码',
      uploadExportQr: '上传导出二维码',
      uploadFile: '上传文件',
      uploadFileDesc: '上传 JSON/TXT 导出文件',
      orPasteText: '或粘贴导出数据：',
      pasteTextPlaceholder: '在此粘贴导出的文本或 URI...',
      pleaseEnterData: '请输入导出数据',
      importBtn: '导入',
      importedAccounts: '已导入 {count} 个账户',
      noAccountsToImport: '未找到可导入的账户',
      failedImport: '导入失败',

      // QR Preview Screen
      previewAccount: '预览账户',
      confirmAdd: '添加账户',
      cancel: '取消',

      // General
      back: '返回',
      error: '错误',
      success: '成功',
      loading: '加载中...',
      noQrFound: '屏幕上未找到二维码',
      noQrInImage: '图片中未找到二维码',
      invalidQrFormat: '无效的二维码格式',
      failedCaptureScreen: '截屏失败',
      failedPreview: '预览账户失败',
      networkError: '网络错误',
      cannotConnectServer: '无法连接到服务器',

      // Settings
      settings: '设置',
      language: '语言',
      theme: '主题',
      systemTheme: '跟随系统',
      lightTheme: '浅色',
      darkTheme: '深色',
      qrProcessMode: '二维码处理方式',
      qrModeDirect: '直接提交',
      qrModeManual: '手动编辑',
    },
  },

  // Get translation
  t(key, params = {}) {
    const lang = this.translations[this.currentLang] || this.translations.en;
    let text = lang[key] || this.translations.en[key] || key;

    // Replace placeholders like {count}
    Object.keys(params).forEach((param) => {
      text = text.replace(`{${param}}`, params[param]);
    });

    return text;
  },

  // Set language
  setLang(lang) {
    if (this.translations[lang]) {
      this.currentLang = lang;
      this.updateUI();
    }
  },

  // Toggle between languages
  toggle() {
    this.setLang(this.currentLang === 'en' ? 'zh' : 'en');
  },

  // Update all UI elements with data-i18n attribute
  updateUI() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      el.textContent = this.t(key);
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = this.t(key);
    });

    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      el.title = this.t(key);
    });

    // Update settings language dropdown
    const langSelect = document.getElementById('settings-language');
    if (langSelect) {
      langSelect.value = this.currentLang;
    }
  },
};

// Export for use in app.js
window.i18n = i18n;
