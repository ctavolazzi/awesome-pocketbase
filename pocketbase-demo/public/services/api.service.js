/**
 * API Service for Express Backend Communication
 * Handles all mutations (create, update, delete) through the Express API
 */

class ApiService {
  constructor(baseUrl) {
    this.baseUrl = baseUrl || window.API_BASE_URL || 'http://127.0.0.1:3030';
  }

  /**
   * Make authenticated request to Express API
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;

    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    // Add auth token if available
    if (window.pb?.authStore?.token) {
      config.headers['Authorization'] = `Bearer ${window.pb.authStore.token}`;
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          error: response.statusText
        }));
        throw new ApiError(
          error.error || 'Request failed',
          response.status,
          error.details
        );
      }

      return await response.json();
    } catch (error) {
      // Network errors
      if (error.name === 'TypeError' && !navigator.onLine) {
        throw new NetworkError('No internet connection');
      }

      // Re-throw API errors
      if (error instanceof ApiError) {
        throw error;
      }

      // Unknown errors
      throw new ApiError('An unexpected error occurred', 500);
    }
  }

  /**
   * Posts API
   */
  async listPosts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/api/posts${query ? '?' + query : ''}`);
  }

  async getPost(id) {
    return this.request(`/api/posts/${id}`);
  }

  async createPost(data) {
    return this.request('/api/posts', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updatePost(id, data) {
    return this.request(`/api/posts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  async deletePost(id) {
    return this.request(`/api/posts/${id}`, {
      method: 'DELETE'
    });
  }
}

/**
 * Custom error types
 */
class ApiError extends Error {
  constructor(message, status, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }

  isValidationError() {
    return this.status === 422;
  }

  isAuthError() {
    return this.status === 401 || this.status === 403;
  }

  isNotFound() {
    return this.status === 404;
  }

  isServerError() {
    return this.status >= 500;
  }

  isRateLimitError() {
    return this.status === 429;
  }
}

class NetworkError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NetworkError';
  }
}

// Export singleton instance
const apiService = new ApiService();

// Also export classes for instanceof checks
export { apiService, ApiService, ApiError, NetworkError };

