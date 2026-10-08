# Space intel layer

Live CelesTrak **stations** (ISS, Tiangong, visiting vehicles) on the globe. The HUD control is **SPACE** (cyan checkbox), off by default. Enabling it reads the latest cached GP snapshot from Item Service and propagates positions in the browser with SGP4. Click a row (or marker) to center the camera and **follow** that object.

The browser never talks to CelesTrak. A Workflow Service job fetches the catalog; OMAPI only reads the cache:

```
CelesTrak GROUP=stations (fallback: GitHub satvisor-data stations.json)
  → workflow FetchSpaceCatalog (script fetch, every 2h at :05 UTC)
  → Item Service Space Catalog (latest RelatedItem)
  → OMAPI GET /world-view/space → listSpace
  → satellite.js in the client
```

| Piece | Role |
|---|---|
| `fetchSpaceCatalog` workflow script | `fetch()` CelesTrak, then GitHub OMM JSON mirror; write a cache item, keep the last 5 |
| Workflow schedule `0 5 0/2 * * ? *` | 00:05, 02:05, 04:05… UTC (2 hours + 5 minutes past even hours) |
| `listSpace` | Returns the newest cache item only |
| `useSpaceCatalog` / `useSpaceTracks` | React Query + 1s SGP4 tick |
| `Globe.jsx` | Billboard, trail, `trackedEntity` follow |

No API keys. CelesTrak’s usage policy is one download per 2-hour GP update — that is why the poll lives in a scheduled workflow, not in OMAPI. If CelesTrak is down (503 / connection reset), the script uses the [satvisor-data](https://github.com/satvisorcom/satvisor-data) `stations.json` mirror. You must be signed in so a project is selected.

## Local

From `client/`: `npm run dev` (`http://localhost:8088/`). Sign in, turn **SPACE** on. The catalog is empty until the workflow has written an item (deploy seeds one run).

