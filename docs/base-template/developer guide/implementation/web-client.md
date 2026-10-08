[OMAPI, workflow, and MCP tools](./omapi.md) < Back | Next > [Permissions](./permissions.md)

---

# Web client

The client is `client/`. It is Vite + React. There is one authenticated screen.

```
client/src/
├── main.jsx                 Buffer global, React root
├── App.jsx                  Session boot, auth gate, providers
├── auth/auth.js             OAuth PKCE sign-in, callback, sign-out
├── services/apiFetch.js     401 handling
├── services/omapiClient.js  omapiRequest — the only application API
├── services/twinitSession.js
├── services/use*.js         One hook module per resource
├── context/                 ProjectContext (selected project and namespace)
├── components/              HUD, globe, panels, dialogs
└── pages/WorldView.jsx      Composes the screen
```

`vite.config.js` pins the dev server to port **8088** with `strictPort`, so Vite cannot hop ports and break the Passport redirect URI.

## Environment

Copy `client/.env.example` to `client/.env.local`.

| Variable | Role |
|---|---|
| `VITE_TWINIT_API` | Platform origin. Must be the same environment the template was deployed to. |
| `VITE_TWINIT_APP_ID` | World View application id. |
| `VITE_CESIUM_ION_TOKEN` | Required. Arms photorealistic 3D tiles and place search. Create it in [Gather access](../deploy/d1-gather.md). |

`IafSession.setConfig` points all ten service origins at `VITE_TWINIT_API`. Sign-in can succeed while that value is missing; the first SDK call then fails. Session init runs in `App.jsx` before feature code.

## What the screen is made of

| Piece | File | Responsibility |
|---|---|---|
| Globe | `components/Globe.jsx` | Cesium viewer, site markers, aircraft and space billboards, gate markers |
| HUD | `components/Hud.jsx` | Stamp, project picker, lat/lon/alt/heading, compass, search, help |
| Sites | `components/SitesPanel.jsx` | Layer checkbox (on by default), list, edit |
| Aircraft | `components/AircraftPanel.jsx` | Amber checkbox, off until the view is small enough |
| Space | `components/SpacePanel.jsx` | Cyan checkbox, off by default |
| Gate prompt / legend | `GateOpsPrompt.jsx`, `GateOpsLegend.jsx` | Used only when the optional airport package is installed. Hidden when Gates is absent. |
| Personnel | `components/UsersDialog.jsx` | Add and remove group members |
| Save site | `components/SaveSiteDialog.jsx` | Create, recapture view, delete |

Panels are presentation. Queries and mutations go through the `use*` hooks. React Query keys include the project namespace, and hooks stay disabled until a project is selected. Switching project refetches.

## Camera and layers

Default camera comes from `GET /world-view/config`: longitude `-98`, latitude `39`, height `19000000` meters, pitch `-90`.

Photorealistic tiles turn on when the camera is below `tilesEnableHeightMeters` (50 km) **and** `VITE_CESIUM_ION_TOKEN` is set. The HUD reports `3D TILES ARMED` or `3D TILES OFFLINE — AWAITING ION TOKEN`.

Aircraft polling requires `aircraftViewAllowed`: the camera box must be at most 25 square degrees. Above that, the checkbox is disabled and the panel says to zoom in.

Gate markers render only after the optional airport package is installed, the operator has opened gate operations, and the camera height is at most 6,000 m (`GATE_OPS_MAX_HEIGHT_METERS` in `client/src/services/gateOpsBounds.js`). With no Gates collection those controls stay hidden. Selecting a non-DTW site closes the overlay. See [Test airport features](../../../feature-extensions/sample-airports/developer%20guide/d6-test-airports.md).

Place search (SEARCH on the HUD) uses Cesium ion geocoding. It is hidden when the ion token is absent.

## Commands

From `client/`:

```bash
npm install
npm run dev
npm run build
npm run preview
```

`@dtplatform` and `@invicara` packages install from `https://npm.twinit.dev/`. The repo `.npmrc` and `client/.npmrc` point at that registry. Production user-access keys belong in the developer environment (`DTPLATFORM_KEY` / `DTPLATFORM_SECRET`), not in the repo.

## What not to put in React

Do not call `IafItemSvc` from a component. Do not duplicate gate-status rules, ADS-B host selection, or site validation in the client. Add an OMAPI route and a thin hook.

---
[OMAPI, workflow, and MCP tools](./omapi.md) < Back | Next > [Permissions](./permissions.md)
