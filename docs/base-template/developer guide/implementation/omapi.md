[Data model](./data-model.md) < Back | Next > [Web client](./web-client.md)

---

# OMAPI, workflow, and MCP tools

Interactive behavior lives in `template-package/scripts/worldViewApi.mjs`. The file is an object model script: callable endpoints are `async function` declarations and are **not** exported. The OMAPI config names each function in `_scriptName`.

The config file is `template-package/omapiConfig/World View API.json`. Manifest `_name` is `World View API`, which is also the filename stem.

Every route the client calls is under `/world-view`. OPTIONS routes exist beside the verbs the browser uses.

## Routes

| Method | Path | Script function | Purpose |
|---|---|---|---|
| GET | `/world-view/config` | `getWorldViewConfig` | HUD stamp, default camera (continental US, 19,000 km), tile threshold 50,000 m, Cesium asset id |
| GET | `/world-view/sites` | `listSites` | Saved sites |
| POST | `/world-view/sites` | `createSite` | New site from the globe |
| PUT | `/world-view/sites/:siteid` | `updateSite` | Rename or recapture the view |
| DELETE | `/world-view/sites/:siteid` | `deleteSite` | Remove a site |
| GET | `/world-view/users` | `listUsers` | Group members and pending invites |
| POST | `/world-view/users` | `addUser` | Add an existing platform user by email |
| DELETE | `/world-view/users/:userid` | `removeUser` | Remove a member. The caller cannot remove themselves. |
| POST | `/world-view/invites` | `inviteUser` | Email invite into the group |
| DELETE | `/world-view/invites/:inviteid` | `cancelInvite` | Delete a pending invite |
| GET | `/world-view/aircraft` | `listAircraft` | Airborne tracks in the camera box |
| GET | `/world-view/space` | `listSpace` | Newest stations GP snapshot |

The client sends the project namespace as `nsfilter` and reads the script return value from the platform envelope. That unwrap is in `client/src/services/omapiClient.js`. Miss either step and the globe looks empty while the project holds the data.

`getWorldViewConfig` does not read Item Service. Change the stamp, the home camera, or the tile threshold in that function, then redeploy the template package. Extension routes are not in this file. They are added only by an optional [feature extension](../../../feature-extensions/README.md), such as [sample-airports](../../../feature-extensions/sample-airports/developer%20guide/sample-airports.md). Redeploying World View replaces the live API config with this file, which drops that route until the extension is applied again.

## Aircraft and space

Aircraft: [aircraft-intel-layer.md](../aircraft-intel-layer.md).

Space: [space-intel-layer.md](../space-intel-layer.md).

The workflow is not an OMAPI route and it is not a Datasources orchestrator. `template-package/custom/setupWorldView.mjs` creates or updates workflow **FetchSpaceCatalog**:

* `_userType`: `world_view_space`
* One `SCRIPT_EXECUTION` task, script name `fetchSpaceCatalog`, script user type `workflow-script`
* Schedule `0 5 0/2 * * ? *` in UTC (five minutes past every even hour)
* One `runWorkflow` at the end of setup, so SPACE is not empty on a new project

If the seed fetch fails, setup logs a warning and continues. The next scheduled run fills the catalog.

The task script is `template-package/scripts/fetchSpaceCatalog.mjs`. Like the OMAPI script, it does not use `export`.

## Deploy order inside the World View package

Initialize is unused. Then scripts, the OMAPI config, the user group, the Sites and Space Catalog collections, then the setup script. Item import is empty. Airports, gates, and any extra route come from a [feature extension](../../../feature-extensions/README.md), not from this package.

---
[Data model](./data-model.md) < Back | Next > [Web client](./web-client.md)
