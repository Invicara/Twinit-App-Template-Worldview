[Developer Guide](../README.md) < Back | **Start a deploy** > [Gather access](../deploy/d1-gather.md)

---

# General introduction

## What this repository is for

World View is an orbital reconnaissance client you can deploy as-is, and a worked example of keeping the business logic in OMAPI scripts.

Deploy the World View template and run the web client and you have a signed-in globe: saved sites, live aircraft, and a space-station layer. Close-up 3D is Cesium photorealistic tiles. There is no BIM model and no Graphics Service viewer in this app.

The template and the Vite client are yours to change. Optional features are not baked into that base. They arrive as separate templates, documented in [Template Feature Extensions](../../../feature-extensions/README.md).

## The World View package

| Package | Folder | What it does |
|---|---|---|
| World View | `template-package/` | Creates the application backend. NamedUserCollections for Sites and Space Catalog are created here. Sites starts empty. |

Optional feature packages are not in this template. They are documented in [Template Feature Extensions](../../../feature-extensions/README.md).

## How a session works

1. The operator signs in with Passport OAuth 2.0 PKCE. The browser origin must be a registered redirect URI. Local development is `http://localhost:8088/`.
2. The client lists the user's projects and keeps one selected. The project's first namespace is sent as `nsfilter` on every OMAPI call.
3. React components do not call Item Service. Hooks call `omapiRequest()`, which hits Object Model API routes backed by `worldViewApi.mjs`.
4. A Workflow Service job, FetchSpaceCatalog, downloads CelesTrak stations on a schedule and writes a cache item. The SPACE layer reads that cache and propagates orbits in the browser.

```
Operator --PKCE--> Passport (app, project, World View Users)
                      |
                      v
                   OMAPI --> worldViewApi
                      |         |-- Item Service (Sites, Space Catalog)
                      |         |-- Passport (roster)
                      |         |-- adsb.lol / adsb.fi
                      |
                   Workflow --> fetchSpaceCatalog --> CelesTrak
```

## What the World View package puts in the project

* Script `worldViewApi` (`_userType` `omapi-script`) — config, sites, users, aircraft, and space
* Script `fetchSpaceCatalog` (`_userType` `workflow-script`) — the scheduled catalog fetch
* OMAPI config **World View API** — config, sites, users, aircraft, and space
* User group **World View Users**
* NamedUserCollections **Sites** and **Space Catalog**
* Workflow definition **FetchSpaceCatalog** and schedule `0 5 0/2 * * ? *` (UTC), created by the setup script, plus one seed run

There is no user config and no ipa-core page map. The Vite client is the whole UI.

## A normal operator path

1. Sign in and select the World View project.
2. Right-click the globe to save a site, then fly back to it from SITES.
3. Zoom in until the aircraft checkbox enables, and turn AIRCRAFT on.
4. Turn SPACE on and follow a station.

The [User Guide](../../user%20guide/world-view/README.md) is that same path, written for the person at the globe.

## Feature extensions

Optional templates are documented separately in [Template Feature Extensions](../../../feature-extensions/README.md). The base install is finished without them. A later package can add its own collection, its own rows, and, when it needs a route, a patch on this API. Redeploying World View publishes the base API file again, which drops any route that package added until that package is applied once more.

---
[Developer Guide](../README.md) < Back | **Start a deploy** > [Gather access](../deploy/d1-gather.md)
