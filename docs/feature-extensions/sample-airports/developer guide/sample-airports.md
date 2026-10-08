[Apply sample-airports](./d3-sample-airports.md) < Back | Next > [Test airport features](./d6-test-airports.md)

---

# sample-airports package

Folder: `sample-airports/`. Template name and version: `sample-airports` `1.2.0`.

This is the layer, not the application. World View is already a finished globe. You deploy this package onto that project when you want 30 US large-hub airports and DTW McNamara gate operations, and you can do it months later. A workspace that never gets this package just has no airport list.

## How the layer sits on the base

The base template created the API, the Sites collection, Space Catalog, and the space workflow. This package does not deploy those again. It adds a feature on top:

* **A collection the base does not have.** Gates is created here. If an older World View deploy already left a Gates collection behind, this deploy leaves it and moves on.
* **Rows in a collection the base already has.** The 30 airports go into Sites. `ifExists: "add"` means they land even when someone has already saved a site of their own.
* **Behavior the base does not ship.** The gate script, the four MCP tools, and the MCP filter come from this package.
* **A route on the base API, not a second API.** A project can hold only one API config. Shipping another `omapiConfig` would delete World View's routes. Setup reads the World View API user config, appends `GET /world-view/gate-operations` if it is missing, and redeploys that same config. Sites, aircraft, space, and personnel routes stay.

The client is part of the pattern. It asks for gate operations only when someone is on a DTW site. If the route or the Gates collection is not there, the prompt never shows and the rest of the globe keeps working. You do not have to teach the base package about every layer you might add later. You teach the client to treat a missing layer as "this feature is off."

If you later redeploy the World View package, its API file goes live again and the gate route drops off. Run this package once more and the route is patched back on. The script and the gate rows are still there.

Copy this shape when the next feature should be optional. The checklist is [Add another feature extension](../../adding-an-extension.md). Give that extension its own guides under feature-extensions.

## What it contains

```
sample-airports/
├── manifest.json
├── README.md
├── custom/setupSampleAirports.mjs
├── scripts/gateOperations.mjs
├── mcpTools/
│   ├── GetGate.json
│   ├── GetGateOperations.json
│   ├── GetGateOperationsSummary.json
│   └── QueryGates.json
└── itemsToCreate/
    ├── us-airports.json
    └── mcnamara-gates.json
```

`manifest.json` creates the **Gates** collection (`_name` `Gates`, `_userType` `world_view_gates`) and has no `omapiConfig`, for the reason above. If Gates already exists, the deploy leaves that collection and continues.

Item import uses `itemsToCreate`, with the JSON files under `itemsToCreate/`:

| `collectionName` | File | `ifExists` |
|---|---|---|
| `Sites` | `us-airports.json` | `add` |
| `Gates` | `mcnamara-gates.json` | `add` |

`add` writes the rows even when the collection already has items, which is what you want on a live World View project where someone has already saved a site. `collectionName` has to match the collection `_name` (`Sites` from the World View manifest, `Gates` from this package), not the `_userType`.

## What the setup script does

`custom/setupSampleAirports.mjs` exports `setup`. It runs after the manifest has created Gates, imported the rows, and installed the script and MCP tools. This is the part that stitches the layer onto the base:

1. Resolve Sites by `_userType` `world_view_sites` and Gates by `world_view_gates`. Sites must already exist from the World View package. Gates is created by this package's manifest before setup; if that step did not create it, setup throws.
2. Delete later items that share a `_name`, so a second apply does not leave two `ATL — …` sites or two `A1` gates.
3. If `DTW — Detroit Metropolitan` exists and its coordinates are not `42.2079, -83.3565`, update them.
4. `addRelations` from that site to every gate id that is not already in `_relatedToIds`.
5. Load the **World View API** user config. If `GET /world-view/gate-operations` is not already bound to `gate-ops-script` / `listGateOperations`, append the OPTIONS and GET routes, create a new config version, undeploy the current API config, and deploy the updated one. Existing config, sites, users, aircraft, and space routes stay on that same config.
6. Create or update MCP filter **GateOperations** (`world_view_gate_ops`) for the four gate tools.

Setup does not create collections and it does not touch the space workflow. Gates already exists by the time this function runs, because the manifest created it earlier in the same deploy.

Redeploy the base and you will want to run this package again. The World View API file has no gate route, so a fresh deploy of that file takes the route back off. The gate script and MCP tools from the earlier layer deploy are still in the project. Only the live route binding was replaced.

## Files

`us-airports.json` is a JSON array of 30 sites. Names are `IATA — Airport Name`. Altitude on every sample site is 3,000 m, heading 0, pitch -90.

`mcnamara-gates.json` is a JSON array of gate items. `_name` is the gate id. `concourse` is A, B, or C.

To change the sample, edit those files, keep `ifExists` as `add` unless you really want to skip a collection that already has rows, and validate with **Deploy Template to Project** in the Twinit IDE extension. Point it at `sample-airports`. Do not zip the folder yourself. The extension packages it.

## Gates collection

| | |
|---|---|
| Collection `_name` | `Gates` |
| `_shortName` | `gates` |
| `_userType` | `world_view_gates` |
| Item `_userType` | `world_view_gate` |
| Item `_name` | Gate id, such as `A17` |

| Property | Meaning |
|---|---|
| `concourse` | `A`, `B`, or `C` |
| `latitude` | Gate latitude |
| `longitude` | Gate longitude |

Positions in `mcnamara-gates.json` are the McNamara terminal at Detroit Metropolitan. The operations response attributes geometry to OpenStreetMap contributors. Sample airport sites use pitch `-90` (straight down) and open at 3,000 m. They are written into the World View Sites collection. They do not use a second site collection.

## Relation: DTW site to gates

Setup links them with `IafItemSvc.addRelations`:

| Field | Value |
|---|---|
| `_relatedFromId` | DTW site item id in Sites |
| `_relatedToIds` | Gate item ids |
| `_relatedUserItemDbId` | Gates collection id |
| `_relatedUserType` | `world_view_gates` |
| `_userType` | `world_view_site_gates` |

DTW is the site whose `_name` is `DTW — Detroit Metropolitan`. The setup script also sets that site to latitude `42.2079` and longitude `-83.3565` when the stored point differs. The client treats a site as DTW when its name starts with `DTW`.

Re-running sample-airports does not add a second relation edge for a gate that is already linked. Items that share a `_name` are reduced to one: the setup script deletes the later copies. That matters because item import uses `ifExists: "add"`, which appends even when the collection already has rows.

Gate status, airline, flight ident, origin, destination, and delay are not stored. `listGateOperations` builds them on each request:

* Airlines used in the picture: DL, WS, AF, KL
* Aircraft types include A319, A321, B739, A333, A359, B752, E175
* A per-gate hash picks a phase clock. Phases are OPEN, INBOUND, ON_BLOCK, TURNAROUND, BOARDING, DEPARTING, and a DELAYED variant
* CLOSED is part of the legend enum

Only DTW is accepted. Any other `airport` value throws `Gate operations are only available for DTW`. Gate operations prefer gates related to the DTW site. If that relation is missing, `listGateOperations` falls back to every item in the Gates collection. If the Gates collection is missing, the script returns `available: false` and the client hides the prompt.

## Apply order

1. Deploy `template-package/` to the project. That creates an empty Sites collection and Space Catalog. It does not create Gates.
2. Deploy `sample-airports/` to the **same** project. That creates Gates, then imports airports and gates.

Deploying sample-airports onto a project that has never had the World View package creates Gates, then fails setup because Sites is missing. Item import into Sites needs that collection to already exist.

---
[Apply sample-airports](./d3-sample-airports.md) < Back | Next > [Test airport features](./d6-test-airports.md)
