import { IafPassSvc, IafSession } from '@dtplatform/platform-api'

const CODE_VERIFIER_KEY = 'twinit_code_verifier'
const SELECTED_PROJECT_KEY = 'twinit_selected_project'
const TWINIT_SESSION_KEYS = ['manage', 'sessionUser', 'appTokens', 'project']

const toSnakeCase = (str) => {
  return str
    .split(/(?=[A-Z])/)
    .join('_')
    .toLowerCase()
}

const toUrlEncoded = (obj) => {
  return Object.keys(obj)
    .map((k) => {
      if (k === 'inviteId') {
        return encodeURIComponent(`${k}=${encodeURIComponent(obj[k])}`)
      }
      return `${encodeURIComponent(toSnakeCase(k))}=${encodeURIComponent(obj[k])}`
    })
    .join('&')
}

function generateCodeVerifier() {
  const array = new Uint8Array(48)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
    .slice(0, 64)
}

async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function getRedirectUri() {
  return `${window.location.origin}/`
}

function getSessionLogoutUrl() {
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_TWINIT_APP_ID,
    redirect_uri: getRedirectUri()
  })

  return `${import.meta.env.VITE_TWINIT_API}/passportsvc/api/v1/session-logout?${params}`
}

export async function initiateAuth() {
  const verifier = generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)

  sessionStorage.setItem(CODE_VERIFIER_KEY, verifier)

  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_TWINIT_APP_ID,
    scope: 'read write',
    response_type: 'code',
    redirect_uri: getRedirectUri(),
    code_challenge: challenge,
    code_challenge_method: 'S256'
  })

  window.location.href = `${import.meta.env.VITE_TWINIT_API}/passportsvc/api/v2/oauth/authorize?${params}`
}

export async function handleAuthCallback(code) {
  const verifier = sessionStorage.getItem(CODE_VERIFIER_KEY)
  if (!verifier) {
    throw new Error('No code verifier found - possible replay attack or expired session')
  }

  const response = await fetch(
    `${import.meta.env.VITE_TWINIT_API}/passportsvc/api/v2/oauth/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: toUrlEncoded({
        client_id: import.meta.env.VITE_TWINIT_APP_ID,
        redirect_uri: getRedirectUri(),
        grant_type: 'authorization_code',
        code,
        code_verifier: verifier
      })
    }
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Token exchange failed (${response.status}): ${body}`)
  }

  const tokens = await response.json()
  sessionStorage.removeItem(CODE_VERIFIER_KEY)
  clearLocalSessionState()
  await IafSession.setAuthToken(tokens.access_token)
}

export function getAccessToken() {
  return IafSession.getAuthToken()
}

export function clearLocalSessionState() {
  TWINIT_SESSION_KEYS.forEach((key) => sessionStorage.removeItem(key))
  sessionStorage.removeItem(SELECTED_PROJECT_KEY)
}

export { SELECTED_PROJECT_KEY }

export async function logout() {
  const accessToken = getAccessToken()
  const logoutUrl = getSessionLogoutUrl()

  try {
    if (accessToken) {
      await IafPassSvc.logout({ authToken: accessToken })
    }
  } catch (error) {
    console.error('Error logging out:', error)
  }

  await IafSession.deleteSession()
  clearLocalSessionState()

  window.location.replace(logoutUrl)
}
