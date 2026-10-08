# Release notes

## 1.10.0 — first public release

World View 1.10.0 is the base. sample-airports 1.2.0 is an optional template you can layer onto the same project afterward. You can stop after the base. The globe, sites, aircraft, space, and personnel do not need the airport package.

### World View

* Vite + React client: a classified-style HUD on a Cesium globe. Sign-in is Passport OAuth with PKCE. Local development is `http://localhost:8088/`.
* Template package deployed with **Deploy Template to Project** in the Twinit IDE extension. It creates the **World View API** (config, sites, users, aircraft, and space), the **Sites** and **Space Catalog** collections, the **World View Users** group, and the **FetchSpaceCatalog** workflow.
* Sites start empty. People save locations from the globe.
* Aircraft tracks come from ADS-B through OMAPI. They are not stored in Item Service.
* Space stations come from a CelesTrak snapshot on a schedule. The browser propagates the orbits.
* The base package does not create a Gates collection and does not include a gate-operations route.

### sample-airports (optional)

* Creates the **Gates** collection, then loads 30 US large-hub airports into Sites and the McNamara terminal gates into Gates.
* Relates the DTW site to those gates, and drops a duplicate name if you apply the package again.
* Adds `gateOperations`, `GET /world-view/gate-operations` on the existing World View API, four MCP tools, and the `world_view_gate_ops` filter.
* A project can only have one API config, so this package patches the World View API instead of shipping a second one. Redeploying World View publishes the base API file again and drops that gate route until you apply sample-airports once more.
* If Gates or the gate route is missing, the client hides gate operations. Sites, aircraft, and space keep working, and the missing layer is not shown as a failed request.

### Docs

The base template has its own developer guide and user guide under `docs/base-template/`. Feature extensions are a separate section under `docs/feature-extensions/`. Each extension, including sample-airports, has its own developer guide and user guide.

The repo is Apache License 2.0. See [LICENSE](../LICENSE).
