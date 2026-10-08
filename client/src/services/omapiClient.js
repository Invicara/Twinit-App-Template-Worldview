import { getAccessToken } from '../auth/auth'

import { apiFetch } from './apiFetch'

/**
 * The namespace every OMAPI call is scoped to. Resolve once, at project
 * selection, and pass it down — do not re-derive it in each hook.
 */
export function getProjectNamespace(project) {
    return project?._namespaces?.[0] ?? null
}

/**
 * Calls an OMAPI endpoint.
 *
 * Two details here cause silent failures if removed. Both return HTTP 200, so
 * nothing looks wrong — the UI just shows nothing:
 *
 *  1. `nsfilter` is required. The platform docs: "All endpoints must be called
 *     with an nsfilter query parameter that is set to the project's namespace."
 *     Without it the request succeeds and returns no data.
 *
 *  2. The response is an envelope, not your script's return value:
 *       { _requestId, _timetaken, _result: <what the script returned> }
 *     Reading `data.things` instead of `data._result.things` yields undefined.
 *
 * Unwrapping happens here so no caller has to remember.
 */
export async function omapiRequest(namespace, path, options = {}) {
    const accessToken = getAccessToken()

    if (!namespace) throw new Error('Missing Twinit namespace')
    if (!accessToken) throw new Error('Missing Twinit access token')

    const { query, ...fetchOptions } = options
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    const url = new URL(
        `${import.meta.env.VITE_TWINIT_API}/omapi/${namespace}${normalizedPath}`
    )
    url.searchParams.set('nsfilter', namespace)
    if (query && typeof query === 'object') {
        for (const [key, value] of Object.entries(query)) {
            if (value == null || value === '') continue
            url.searchParams.set(key, String(value))
        }
    }

    const data = await apiFetch(url.toString(), {
        ...fetchOptions,
        headers: {
            Authorization: `Bearer ${accessToken}`,
              ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...options.headers
        },
        body: options.body && typeof options.body !== 'string'
            ? JSON.stringify(options.body)
            : options.body
    })

    // `?? data` tolerates endpoints that return an unenveloped body.
    return data?._result ?? data
}
