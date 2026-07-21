// ─────────────────────────────────────────────────────────────
// Reusable API Service Layer
// Base URL, fetch wrappers, error handling for backend calls.
// All other service modules import from here.
// ─────────────────────────────────────────────────────────────

// In development, Vite proxy rewrites /api → http://localhost:8000/api.
// In production, set VITE_API_BASE_URL to the deployed backend origin.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

/**
 * Lightweight wrapper around fetch with JSON handling and timeout.
 * Returns { data, error } — never throws, so callers can gracefully
 * fall back to mock data when the backend is unreachable.
 */
export async function apiFetch(endpoint, options = {}) {
  const { timeout = 30000, ...fetchOptions } = options
  const url = `${API_BASE_URL}${endpoint}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        // Don't set Content-Type for FormData — browser sets boundary automatically
        ...(fetchOptions.body instanceof FormData
          ? {}
          : { 'Content-Type': 'application/json' }),
        ...fetchOptions.headers,
      },
    })

    clearTimeout(timer)

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '')
      return {
        data: null,
        error: {
          status: response.status,
          message: errorBody || `HTTP ${response.status}`,
        },
      }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    clearTimeout(timer)

    // AbortError = timeout; TypeError = network/CORS failure
    const isTimeout = err.name === 'AbortError'
    return {
      data: null,
      error: {
        status: 0,
        message: isTimeout
          ? 'Request timed out — is the backend running?'
          : `Network error — ${err.message}`,
      },
    }
  }
}

/**
 * Convenience helpers for common HTTP methods.
 */
export function apiGet(endpoint, options = {}) {
  return apiFetch(endpoint, { method: 'GET', ...options })
}

export function apiPost(endpoint, body, options = {}) {
  const isFormData = body instanceof FormData
  return apiFetch(endpoint, {
    method: 'POST',
    body: isFormData ? body : JSON.stringify(body),
    ...options,
  })
}
