import axios from "axios";
import { authStore } from "../store/auth-store";

interface RetriableConfig {
  _retry?: boolean;
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1",
  withCredentials: true,
  timeout: 15000
});

apiClient.interceptors.request.use((config) => {
  const accessToken = authStore.getState().tokens?.accessToken;

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

let isRefreshing = false;
let requestQueue: Array<() => void> = [];

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as typeof error.config & RetriableConfig;

    if (error.response?.status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      await new Promise<void>((resolve) => {
        requestQueue.push(resolve);
      });
      return apiClient(originalRequest);
    }

    isRefreshing = true;
    originalRequest._retry = true;

    try {
      const { refreshSession } = authStore.getState();
      await refreshSession();
      requestQueue.forEach((resolve) => resolve());
      requestQueue = [];
      return apiClient(originalRequest);
    } catch (refreshError) {
      const { clearAuthState } = authStore.getState();
      clearAuthState();
      requestQueue = [];
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
