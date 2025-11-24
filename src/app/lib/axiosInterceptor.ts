'use client';
import axios from 'axios';
import { refreshAccessToken } from './authService';

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Response interceptor for automatic token refresh
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      // If already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return axios(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh the token
        const newToken = await refreshAccessToken();
        processQueue(null, newToken);

        // Retry original request with new token
        originalRequest.headers['Authorization'] = 'Bearer ' + newToken;
        return axios(originalRequest);

      } catch (refreshError) {
        processQueue(refreshError, null);

        // Refresh failed - clear storage and redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('role');
          localStorage.removeItem('userName');
          localStorage.removeItem('companyId');

          // Only redirect if not already on login page
          if (!window.location.pathname.includes('/auth') && window.location.pathname !== '/') {
            window.location.href = '/';
          }
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axios;
