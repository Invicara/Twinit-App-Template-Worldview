# World View — Architecture Executive Summary

**Audience:** anyone who need to understand what World View is, how it sits on Twinit, and how the UI was produced with the AI Composer.  
**As of:** 2026-08-30  

---

## 1. What World View is

World View is a **Twinit application** that presents Earth as a fullscreen orbital-reconnaissance globe. After sign-in there is no traditional product chrome — no side nav, no dashboard, no page grid. The operator sees Earth, a classified-style HUD, and optional intel overlays (saved sites, live aircraft, space stations).

The product is **not** a marketplace Portfolio map and **not** a BIM model viewer. Close-up 3D is Cesium photorealistic tiles, not Twinit Graphics / IafViewer. Twinit is the identity, data, API, and operations platform underneath; Cesium is the visualization engine in the browser.

---

## 2. How World View uses Twinit

Twinit is the operating platform. The browser is a thin, authenticated client. Application logic runs in **object model scripts behind OMAPI**. Batch work runs in **Workflow**. Identity and tenancy are **Passport**. Persistent records are **Item Service**.

```
                    ┌─────────────────────────────────────────┐
                    │              Twinit platform            │
                    │                                         │
  Operator ──PKCE──►│ Passport   (app, project, groups, OAuth)│
                    │     │                                   │
                    │     ▼                                   │
                    │ OMAPI ──► worldViewApi scripts          │
                    │     │         │                         │
                    │     │         ├─ Item Service (Sites,   │
                    │     │         │   Space Catalog)        │
                    │     │         ├─ Passport (users/invites)│
                    │     │         └─ adsb.lol / adsb.fi     │
                    │     │                                   │
                    │ Workflow ──► fetchSpaceCatalog ──► CelesTrak
                    │                                         │
                    └─────────────────────────────────────────┘
                                      ▲
                                      │ omapiRequest + IafPassSvc (projects only)
                                      │
                    ┌─────────────────┴─────────────────┐
                    │  Vite + React client (Cesium HUD) │
                    └───────────────────────────────────┘
```

### 2.1 Services in use

| Twinit service | Role in World View |
|----------------|--------------------|
| **Passport** | Application **World View**, a Passport project (workspace) under that application, OAuth PKCE, **World View Users** group, personnel invite/add/remove |
| **OMAPI** | The application API. One route per operation; scripts hold the logic |
| **Item Service** | **Sites** (`world_view_sites`) and **Space Catalog** (`world_view_space_catalog`) NamedUserCollections |
| **Workflow** | **FetchSpaceCatalog** — scheduled CelesTrak ingest every 2 hours at :05 UTC; seed run on deploy |
| **Item scripts** | `worldViewApi` (OMAPI) and `fetchSpaceCatalog` (workflow task) |

**Not used (by design):** Graphics / IafViewer (Cesium owns 3D), File Service, AI Service, Notifications, Telemetry, Datasources (deprecated). Sensors, if added later, would be TelemetryItems — not user-collection “sensor” rows.

### 2.2 OMAPI as the business-logic layer

The client never talks to Item Service for domain data. It calls:

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/world-view/config` | Camera defaults, HUD stamp, tile threshold |
| GET/POST/PUT/DELETE | `/world-view/sites` | Saved globe locations |
| GET/POST/DELETE | `/world-view/users` | Roster against World View Users |
| POST/DELETE | `/world-view/invites` | Email invites |
| GET | `/world-view/aircraft` | Live ADS-B in the camera box (proxied; 250-track cap) |
| GET | `/world-view/space` | Latest cached stations GP snapshot |

OMAPI is also the **egress proxy** where the browser cannot or must not call the upstream itself: ADS-B hosts 403 Cloudflare Worker egress, so the aircraft feed is fetched in `listAircraft`, not from Pages or the client. CelesTrak’s usage policy is one download per GP cycle, so the catalog is **not** fetched on every UI poll — a workflow writes a cache item; `listSpace` only reads the newest one. The browser then runs SGP4 locally (`satellite.js`) to animate positions.

### 2.3 Identity, project, and namespace

- Sign-in is Passport OAuth 2.0 with PKCE. The Vite origin (`http://localhost:8088/`) must match a registered redirect URI; `strictPort` is on so Vite cannot silently change port and break login.
- After auth, **ProjectContext** lists the user’s project workspaces via `IafPassSvc` and persists the selection. The first `_namespaces` entry is the OMAPI `nsfilter`. Without a selected project, intel layers have no namespace and do not fetch.
- `@dtplatform/platform-api@~5.1.0` (tilde pin) is the SDK. All ten service origins are set at boot from `VITE_TWINIT_API`. Sign-in can succeed while that config is missing; the first SDK call then throws `Invalid URL` — which is why session init is in the AI Composer checklist, not left to feature code.

### 2.4 Reproducible deploy

Backend state is expressed in `template-package/` (manifest, scripts, OMAPI config, empty Sites and Space Catalog collections, setup script). Validate and deploy with the Twinit template-package CLI; do not hand-build a zip. Setup creates or updates the WorkflowDef and schedule, then attempts one CelesTrak seed so SPACE is not empty on a fresh project. Optional features are separate templates under [Template Feature Extensions](../../feature-extensions/README.md). The base stays a complete app without them. Operator and developer guides for this base are the [developer guide](./README.md) and the [user guide](../user%20guide/README.md).

---

## 3. How it was built: Twinit AI Composer

World View was implemented with the **AI Composer** workflow — the same method used to stand up any new Twinit app in this repo. That workflow is plan-first, OMAPI-first, and template-package-backed. It is what produced the client bootstrap, the backend contract, and the folder layout; the globe and HUD are product code written *on top of* that contract.

### 3.1 Plan, then build

| Step | Tool | Outcome |
|------|------|---------|
| Discover and lock scope | App Planner (`/plan-twinit-app`) | Approved plan — services, OMAPI routes, pages, theming |
| Implement | AI Composer (`/create-twinit-app`, `twinit-app-builder`) | Backend template package + Vite client, in platform phase order |
| UI detail | `twinit-vite-client` skill + boilerplate | Auth, session, OMAPI client, project context — copied, not reinvented |
| Deploy | Template package CLI | Repeatable project setup on the project the user selects |

The plan is the product spec AI Composer is required to follow. It chose **greenfield Vite + React** because Portfolio (2D multi-site map + standard nav) and ipa-core (`IpaMainLayout`, user-config pages) cannot deliver a chrome-less 3D globe. Iteration 1 was auth + globe + HUD + Cesium tiles. Later slices (sites, users, aircraft, space) reused the same AI Composer conventions without changing the visual language.

### 3.2 What the AI Composer actually contributed to the UI

AI Composer does not generate a Cesium scene. It contributes a **platform-correct React shell** so every later feature talks to Twinit the same way. That shell is the `twinit-vite-client` content the AI Composer is instructed to copy into a new client and then leave alone.

**Copied as working files (do not retype):**

| File | Job |
|------|-----|
| `client/src/auth/auth.js` | OAuth 2.0 PKCE sign-in, callback, sign-out |
| `client/src/services/apiFetch.js` | Central 401 handling (HTTP status **and** `errorResult.status` in a 200 body) |
| `client/src/services/omapiClient.js` | `omapiRequest()` — the only path to application logic |
| `client/src/services/twinitSession.js` | `IafSession.setConfig` for all ten Twinit service origins |
| `client/src/main.jsx` | `Buffer` global before first render |
| `client/vite.config.js` | Node polyfill aliases + `global: 'globalThis'` + Passport-matched port **8088** |

Those files exist because the failures they prevent **compile and run** before they fail: empty OMAPI lists, `Invalid URL` after a successful login, sign-in that breaks because Vite hopped to another port. AI Composer copies them, then writes `App.jsx` itself so session init always runs first.

**Structure AI Composer requires (and World View follows):**

```
client/src/
├── main.jsx              # entry
├── App.jsx               # boot, auth gate, providers — written by AI Composer
├── auth/                 # PKCE
├── services/             # omapiClient + one use*.js hook per resource
├── context/              # ProjectContext (namespace for every OMAPI call)
├── components/           # presentation only
└── pages/                # one screen: WorldView (plus SignIn)
```

**Rules the UI still obeys, because they are AI Composer / architecture rules, not style preferences:**

1. **Presentation only.** React components do not contain business rules and do not call Item Service. Queries and mutations go through OMAPI hooks (`useWorldViewConfig`, `useSites`, `useAircraft`, `useSpaceCatalog`, `useUsers`, …).
2. **Namespace in the query key.** React Query keys include the project namespace; hooks are `enabled` only after a project is selected. Switching project refetches instead of showing another project’s data.
3. **`nsfilter` + `_result` unwrap.** Every OMAPI call sends the project namespace as `nsfilter` and reads the script return value from the platform envelope. Miss either and the UI looks empty while the platform holds the data.
4. **No ipa-core.** No `ipaCore/`, no `pageComponents/`, no user-config-driven pages, no `npx create-twinit-app`. Routes are explicit. Theming is plain CSS from the plan (phosphor HUD), not an `ipaConfig` theme.

**What was written as product UI on that shell:** Cesium globe, HUD, sites / aircraft / space panels, personnel dialog, and the orbital-recon visual language in `index.css`. Those are World View. The auth/session/OMAPI/project wiring is the AI Composer’s Vite client pattern, shared with any other new Twinit app.

### 3.3 Backend that AI Composer produced in the same pass

The AI Composer treats the **template package** as the source of truth for the platform project. World View’s package deploys scripts, OMAPI routes, collections, a user group, and a setup script that registers the space-catalog workflow. Feature extensions, such as sample-airports, are a separate package applied afterward. See [Template Feature Extensions](../../feature-extensions/README.md). There is no Datasources / orchestrator path — pipelines use **Workflow Service**, as the current architecture rule requires.

---

## 4. Client architecture (product layer)

Once the AI Composer shell is in place, the product is a single authenticated view:

| Piece | Responsibility |
|-------|----------------|
| `SignIn` | Spy-themed auth gate (`AUTHENTICATE` / operational copy from the plan) |
| `WorldView` | Composes globe + HUD + panels; holds layer and selection state |
| `Globe` | CesiumJS: Earth, 3D tiles below ~50 km, billboards, trails, follow |
| `Hud` | Classification stamp, lat/lon/alt, project control, intel toggles, sign-out |
| Sites / Aircraft / Space panels | Lists and callouts; presentation only |
| `UsersDialog` | Personnel against the World View Users group |

Environment: `VITE_TWINIT_API`, `VITE_TWINIT_APP_ID`, and `VITE_CESIUM_ION_TOKEN`. The ion token is required for photorealistic tiles and place search.

---

## 5. Why this shape

| Decision | Reason |
|----------|--------|
| Twinit as the platform, Cesium as the globe | Identity, tenancy, APIs, and ops stay on Twinit; visualization needs a real 3D globe, which Graphics/IafViewer is not built to be |
| Vite client, not ipa-core | New Twinit apps are Vite; ipa-core layout and user-config pages fight a chrome-less HUD |
| AI Composer boilerplate for auth/OMAPI | Platform-contract bugs fail after a clean build; copying the known-good files is cheaper than rediscovering them |
| OMAPI-first scripts | One API for UI, future agents, and external clients; React stays replaceable |
| Workflow for space, OMAPI proxy for aircraft | Respect upstream rate/egress limits while keeping the browser off those hosts |
| Template package | A second project gets the same collections, routes, group, and schedule without tribal knowledge |

---

## 6. One-sentence takeaway

World View is a Cesium orbital client whose **Twinit surface was generated by the AI Composer** (approved plan → Vite PKCE/OMAPI shell → template package), and whose **product UI** is a HUD on that shell: every operator action after login is a namespaced OMAPI call, with Workflow used only for the scheduled space-catalog ingest.
