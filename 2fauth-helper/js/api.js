// 2FAuth API Service
class TwoFAuthAPI {
  constructor() {
    this.baseUrl = '';
    this.token = '';
  }

  setBaseUrl(url) {
    // Remove trailing slash
    this.baseUrl = url.replace(/\/$/, '');
  }

  setToken(token) {
    this.token = token;
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);

      // Handle different response types
      const contentType = response.headers.get('content-type');
      let data;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        throw {
          status: response.status,
          message: data.message || data.error || 'Request failed',
          code: data.code || null,
          data: data,
        };
      }

      return data;
    } catch (error) {
      if (error.status) {
        throw error;
      }
      throw {
        status: 0,
        message: error.message || 'Network error',
        data: null,
      };
    }
  }

  // Authentication
  // Note: Using proxy token authentication
  // Generate token via: docker exec 2fauth-proxy npm run generate-token

  // Get icon URL with auth header (for proxy)
  getIconUrl(iconName) {
    return `${this.baseUrl}/storage/icons/${iconName}?token=${this.token}`;
  }

  async getUser() {
    return this.request('/api/v1/user', {
      method: 'GET',
    });
  }

  // Two Factor Accounts
  async getAccounts(withOtp = false) {
    const endpoint = withOtp ? '/api/v1/twofaccounts?withOtp=1' : '/api/v1/twofaccounts';
    return this.request(endpoint, {
      method: 'GET',
    });
  }

  async getAccount(id) {
    return this.request(`/api/v1/twofaccounts/${id}`, {
      method: 'GET',
    });
  }

  async getOtp(id) {
    return this.request(`/api/v1/twofaccounts/${id}/otp`, {
      method: 'GET',
    });
  }

  async getOtpByUri(uri) {
    return this.request('/api/v1/twofaccounts/otp', {
      method: 'POST',
      body: JSON.stringify({ uri }),
    });
  }

  async getOtpByParams(params) {
    return this.request('/api/v1/twofaccounts/otp', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async createAccount(data) {
    return this.request('/api/v1/twofaccounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createAccountFromUri(uri) {
    return this.request('/api/v1/twofaccounts', {
      method: 'POST',
      body: JSON.stringify({ uri }),
    });
  }

  async previewAccount(uri) {
    return this.request('/api/v1/twofaccounts/preview', {
      method: 'POST',
      body: JSON.stringify({ uri }),
    });
  }

  // QR Code
  async decodeQrCode(imageFile) {
    const formData = new FormData();
    formData.append('qrcode', imageFile);

    const url = `${this.baseUrl}/api/v1/qrcode/decode`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/json',
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw {
        status: response.status,
        message: data.message || 'Failed to decode QR code',
        code: data.code || null,
        data: data,
      };
    }

    return data;
  }

  // Import/Migration
  async migrate(payload, file = null) {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('withSecret', '1');

      const url = `${this.baseUrl}/api/v1/twofaccounts/migration`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/json',
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw {
          status: response.status,
          message: data.message || 'Failed to import',
          code: data.code || null,
          data: data,
        };
      }

      return data;
    }

    return this.request('/api/v1/twofaccounts/migration', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        withSecret: 1,
      }),
    });
  }

  // Groups
  async getGroups() {
    return this.request('/api/v1/groups', {
      method: 'GET',
    });
  }

  // Icons
  async getDefaultIcon(service) {
    return this.request('/api/v1/icons/default', {
      method: 'POST',
      body: JSON.stringify({ service }),
    });
  }

  async uploadIcon(imageFile) {
    const formData = new FormData();
    formData.append('icon', imageFile);

    const url = `${this.baseUrl}/api/v1/icons`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/json',
      },
      body: formData,
    });

    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // If response is not JSON, try to get text for error message
      const text = await response.text();
      data = { message: text || 'Failed to upload icon' };
    }

    if (!response.ok) {
      throw {
        status: response.status,
        message: data.message || 'Failed to upload icon',
        code: data.code || null,
        data: data,
      };
    }

    return data;
  }

  // Check server connectivity (proxy health endpoint)
  async checkServer() {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

// Create global API instance
const api = new TwoFAuthAPI();
