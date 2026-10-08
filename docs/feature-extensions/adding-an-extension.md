[Feature extensions](./README.md) < Back | Next > [sample-airports](./sample-airports/developer%20guide/README.md)

---

# Add another feature extension

[sample-airports](./sample-airports/developer%20guide/README.md) is the example. World View is the base template, and sample-airports is a second template that adds a feature on top of a project where that base is already deployed. Copy that shape when you want another city, a stadium list, or a second terminal. Give the new extension its own developer guide and user guide under `docs/feature-extensions/<name>/`. Keep those pages in that extension's own folder.

Keep the new feature out of `template-package/`. If you put it in the base, every workspace that installs World View gets it, and you lose the point of the layer. The base should still install cleanly on an empty project. Your package should assume that install is already there, then add its own collection, its own rows, and, if it needs a route, a setup script that patches the existing World View API instead of shipping a second one. A project can only have one API config.

1. Create a sibling folder, for example `sample-stadia/`.
2. Add `manifest.json` with `Template Name`, `Template Version`, and `itemsToCreate`. Set `collectionName` to `Sites` (created by World View) or `Gates` (created by sample-airports). Set `ifExists` to `add` when the collection may already contain rows.
3. Put a JSON **array** of items in `itemsToCreate/<file>.json`. Site items need `_name`, `_userType` `world_view_site`, and the latitude, longitude, height, heading, and pitch properties. Gate items need `_userType` `world_view_gate` plus concourse, latitude, and longitude.
4. Do not add `namedUserCollections` unless you are intentionally creating a new collection. A package that only fills Sites must not create Sites. Gates is created by sample-airports.
5. If the new rows must be linked to a site, add `setupScript` pointing at `custom/<name>.mjs` that exports `async function setup`. Look up collections by `_userType`, and use `addRelations`. Do not create the collection in that script.
6. Validate the folder with **Deploy Template to Project** in the Twinit IDE extension before you rely on the deploy. Do not build a zip.

`template-package/itemsToCreate/nfl-stadiums.json` is an unused leftover file. It is not in the World View manifest. Prefer a new sample package over wiring that file back into the application package.

Gate operations logic is `listGateOperations` in `sample-airports/scripts/gateOperations.mjs`. It still accepts only airport `DTW`. A second airport's gates will sit in the collection and will not drive the legend until that script grows a real per-airport path. Linking them with relations is still the right data model. The route is attached to the World View API by this package's setup script, not by a second OMAPI config.

---
[Feature extensions](./README.md) < Back | Next > [sample-airports](./sample-airports/developer%20guide/README.md)
