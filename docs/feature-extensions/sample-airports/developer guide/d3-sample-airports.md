[Developer Guide](./README.md) < Back | Next > [sample-airports package](./sample-airports.md)

---

# Apply sample-airports

Run this on a project that already has the World View package. [Deploy the base](../../../base-template/developer%20guide/deploy/d2-deploy-world-view.md) first. The [web client](../../../base-template/developer%20guide/deploy/d4-webclient.md) and the [World View test](../../../base-template/developer%20guide/deploy/d5-test.md) do not include this layer. A project that never gets this package is a finished globe.

This package creates Gates, fills that collection, and adds the 30 airports into Sites. It does not create Sites. The base owns the globe. This package adds the airport feature on top. The write-up of how that works is [sample-airports package](./sample-airports.md).

## Deploy

On that same project, run **Deploy Template to Project** again and select the `sample-airports` folder. Same command as the base, different folder.

## What the deploy writes

* Collection **Gates** (`world_view_gates`), created here. An existing Gates collection is left in place.
* Script `gateOperations` and MCP tools `QueryGates`, `GetGate`, `GetGateOperations`, `GetGateOperationsSummary`
* `GET /world-view/gate-operations` on the existing World View API, plus filter `world_view_gate_ops`
* 30 sites in **Sites**, including `DTW — Detroit Metropolitan` at 42.2079, -83.3565, camera altitude 3,000 m
* McNamara gates in **Gates** (concourse A, B, and C)
* A `world_view_site_gates` relation from that DTW site to those gates

`ifExists` is `add`, so rows are inserted even if someone already saved a site. The setup script then removes items that repeat a `_name`, so deploying sample-airports a second time does not leave duplicate airports or gates. Relations that already exist are left in place; missing gate links are added.

## If setup fails

`Sites collection must already exist. Deploy the World View template package first.`

The project does not have `_userType` `world_view_sites`. Deploy `template-package/` to this project, then run sample-airports again.

Item import can also fail if the collection `_name` is not exactly `Sites` or `Gates`. Do not rename Sites in the World View manifest, or Gates in the sample-airports manifest, without changing `collectionName` in `sample-airports/manifest.json`.

## A project that already has airports and gates

If this project was loaded from a private build that already contains the airports, the gates, and the DTW relation, applying sample-airports is still safe. Import appends, and setup deletes name duplicates and only adds relations that are missing. You do not have to wipe the collections first.

---
[Developer Guide](./README.md) < Back | Next > [sample-airports package](./sample-airports.md)
