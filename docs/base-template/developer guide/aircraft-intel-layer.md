# Aircraft intel layer

Live ADS-B tracks on the globe from [adsb.lol](https://adsb.lol), with [adsb.fi](https://adsb.fi) as backup. The HUD control is **AIRCRAFT** (amber checkbox), off by default. Enabling it polls roughly every **30 seconds** for airborne traffic in the current camera box.

The browser never talks to those APIs directly. Local and production use the same path:

```
Globe camera → bbox (clamped) → OMAPI GET /world-view/aircraft → listAircraft → adsb.lol
```

| Piece | Role |
|---|---|
| `template-package/scripts/worldViewApi.mjs` `listAircraft` | Feed, mapping, 250-track cap |
| `client/src/services/useAircraft.js` | React Query poll |
| `client/src/services/aircraftBounds.js` | Caps the camera box at **25 sq°** |
| `Globe.jsx` | Billboard airplane, trail, callsign |

No API keys. You must be signed in so a project (and namespace) is selected. Turn the layer **off** when you are not looking at tracks.

Cloudflare Pages Functions cannot call these feeds (the hosts 403 Worker egress). That is why the proxy lives in OMAPI, not on Pages.
