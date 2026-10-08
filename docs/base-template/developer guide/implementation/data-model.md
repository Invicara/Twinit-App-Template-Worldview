[General introduction](./general-intro.md) < Back | Next > [OMAPI, workflow, and MCP tools](./omapi.md)

---

# Data model

World View keeps operator data in Item Service NamedUserCollections. Who you are, and which group you are in, stays in Passport.

The base template creates Sites and Space Catalog. Extra collections, such as Gates, show up only if you layer on a [feature extension](../../../feature-extensions/README.md) such as [sample-airports](../../../feature-extensions/sample-airports/developer%20guide/sample-airports.md).

## Sites


|                    |                    |
| ------------------ | ------------------ |
| Collection `_name` | `Sites`            |
| `_shortName`       | `sites`            |
| `_userType`        | `world_view_sites` |
| Item `_userType`   | `world_view_site`  |


Each site is a RelatedItem. Properties use the Item Service `{ dName, val }` shape:


| Property         | Meaning                                 |
| ---------------- | --------------------------------------- |
| `latitude`       | Degrees                                 |
| `longitude`      | Degrees                                 |
| `heightMeters`   | Camera altitude when the site is opened |
| `headingDegrees` | Camera heading                          |
| `pitchDegrees`   | Camera pitch                            |


The client creates, updates, and deletes sites through OMAPI. Right-click on the globe is the create path.

`listSites` returns at most 1000 sites, sorted by `_name`.

## Space Catalog


|                    |                            |
| ------------------ | -------------------------- |
| Collection `_name` | `Space Catalog`            |
| `_shortName`       | `space-catalog`            |
| `_userType`        | `world_view_space_catalog` |


`fetchSpaceCatalog` writes one RelatedItem per successful fetch and keeps the latest snapshots (the script retains a short history). `listSpace` returns only the newest item. The browser runs SGP4 with `satellite.js`. Details: [Space intel layer](../space-intel-layer.md).

## What is not stored

Aircraft tracks are not written to Item Service. `listAircraft` proxies adsb.lol (adsb.fi as backup), caps the result at 250 tracks, and returns them to the client. The client polls about every 30 seconds while the layer is on and the camera box is at most 25 square degrees.

## Passport data

The roster is not an Item Service collection. `listUsers` reads the **World View Users** group and its pending invites through `IafPassSvc`.

---

[General introduction](./general-intro.md) < Back | Next > [OMAPI, workflow, and MCP tools](./omapi.md)