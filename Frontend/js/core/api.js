import { state, clearAuth, setAuth } from "./state.js?v=20260529-razorpay-errors";
import { showToast } from "./ui.js?v=20260529-razorpay-errors";

export async function api(path, options = {}) {
  const response = await request(path, options);

  if (response.status === 401 && state.refreshToken && options.auth !== false && !options._retried) {
    try {
      const refreshed = await request("/api/auth/refresh", {
        method: "POST",
        auth: false,
        body: JSON.stringify({ refreshToken: state.refreshToken }),
      });
      setAuth(await parseResponse(refreshed));
      return api(path, { ...options, _retried: true });
    } catch {
      clearAuth();
      showToast("Session expired. Please log in again.");
    }
  }

  return parseResponse(response);
}

export async function checkBackendHealth() {
  try {
    const response = await fetch(`${state.apiBaseUrl}/api/health`);
    if (!response.ok) return false;
    await response.json();
    return true;
  } catch {
    return false;
  }
}

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (state.token && options.auth !== false) {
    headers.Authorization = `Bearer ${state.token}`;
  }

  const { _retried, ...fetchOptions } = options;

  try {
    return await fetch(`${state.apiBaseUrl}${path}`, {
      ...fetchOptions,
      headers,
    });
  } catch {
    throw new Error(`Cannot reach backend at ${state.apiBaseUrl}`);
  }
}

async function parseResponse(response) {
  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text || "Unexpected server response" };
  }

  if (!response.ok) {
    const message = data?.message || data?.error || `Request failed with ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.validationErrors = data?.validationErrors || {};
    if (response.status === 401) {
      clearAuth();
      showToast("Session expired. Please log in again.");
    }
    throw error;
  }

  return data;
}
