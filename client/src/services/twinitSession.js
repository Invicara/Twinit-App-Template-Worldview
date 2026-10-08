import { IafSession } from '@dtplatform/platform-api'

import { notifySessionExpired } from './apiFetch'

/**
 * Configures the platform SDK. Must run before ANY Iaf*Svc call.
 *
 * `IafFetch.CONFIG.*ServiceOrigin` defaults to an empty string, so a call made
 * before this runs builds a URL from '' and throws:
 *
 *   Failed to construct 'URL': Invalid URL
 *
 * This is easy to miss because sign-in still works — the OAuth flow uses
 * VITE_TWINIT_API directly. The app authenticates, then dies on the first SDK
 * call, usually listing projects.
 *
 * All ten origins point at the same host. Setting only the ones you think you
 * need breaks as soon as another service is touched.
 */
export async function initializeTwinitSession() {
    const origin = import.meta.env.VITE_TWINIT_API

    if (!origin) {
        throw new Error('VITE_TWINIT_API is not set — check .env.local')
    }

    await IafSession.setConfig({
        itemServiceOrigin: origin,
        passportServiceOrigin: origin,
        fileServiceOrigin: origin,
        datasourceServiceOrigin: origin,
        graphicsServiceOrigin: origin,
        objectModelServiceOrigin: origin,
        metricsServiceOrigin: origin,
        notificationServiceOrigin: origin,
        aisvcServiceOrigin: origin,
        workflowServiceOrigin: origin
    })

    // The SDK reports auth failures through this callback rather than by
    // rejecting, so a 401 here is the only signal for SDK-originated calls.
    IafSession.setErrorCallback((error) => {
        const status = error?.status ?? error?.response?.status ?? error?.errorResult?.status

        if (status === 401) {
            notifySessionExpired()
        } else {
            throw error
        }
    })
}
