export class SessionExpiredError extends Error {
  constructor() {
    super('Session expired')
    this.name = 'SessionExpiredError'
  }
}

export const authEvents = new EventTarget()

export function notifySessionExpired() {
  authEvents.dispatchEvent(new Event('session-expired'))
}

export const apiFetch = async (url, options) => {
  const response = await fetch(url, options)

  if (response.status === 401) {
    notifySessionExpired()
    throw new SessionExpiredError()
  }

  if (!response.ok) {
    let message = `HTTP error! status: ${response.status}`
    try {
      const data = await response.json()
      message = data?.message
        || data?.errorResult?.message
        || data?._result?.message
        || (data?.errorResult?.source
          ? `${data.errorResult.source}: ${data.errorResult.message || 'script failed'}`
          : null)
        || (data?.source ? `${data.source}: ${data.message || 'script failed'}` : null)
        || message
    } catch {
      // keep the status message when the body is empty or not JSON
    }
    const error = new Error(message)
    error.status = response.status
    throw error
  }

  if (response.status === 204) {
    return null
  }

  const data = await response.json()

  if (data?.errorResult?.status === 401) {
    notifySessionExpired()
    throw new SessionExpiredError()
  }

  return data
}
