[Build and run the web client](./d4-webclient.md) < Back | Next > [Set the Cesium ion token](../customize/cesium-token.md)

---

# Deploy step 4: Test the World View deployment

This test is the base globe. You should not see an airport list or a gate prompt. If you layered sample-airports on afterward, those checks are in [Test airport features](../../../feature-extensions/sample-airports/developer%20guide/d6-test-airports.md).

Sign in at `http://localhost:8088/` as a user who can see the project. Select that project in the HUD **PROJECT** control.

| Check | Pass |
|---|---|
| HUD stamp | `WORLD VIEW // ORBITAL RECON` (or the stamp you changed in `getWorldViewConfig`) |
| Project list | The deployed project is selectable |
| SITES | Opens on the empty state: `NO SAVED SITES. RIGHT-CLICK THE GLOBE TO MARK ONE.` Saving a site adds one row and a marker. |
| SPACE | Checkbox on. After a successful seed or scheduled run, station rows appear and a click follows the object. An empty catalog means the workflow has not written an item yet. |
| AIRCRAFT | Checkbox stays disabled until you zoom to a view of 25 sq° or less. Then it returns tracks or `NO AIRBORNE TRACKS IN VIEW`. |
| PERSONNEL | Opens **World View Users** for this project. ADD with your own email reports that you are already in the group if you are. |
| Gate operations | No gate prompt, including after you save a site. That is expected. |

## Failure signs

* Sites panel: `UNABLE TO READ SITES FROM TWINIT` — OMAPI or the Sites collection is missing, or the namespace is wrong. Confirm the World View package deployed and the selected project is that one.
* SPACE errors — read the workflow run in the IDE. CelesTrak failures are warned at setup and retried on the schedule. The script can fall back to the satvisor-data mirror; see the [space intel layer](../space-intel-layer.md).
* `3D TILES OFFLINE — AWAITING ION TOKEN` — `VITE_CESIUM_ION_TOKEN` is missing or the dev server was not restarted after you set it. Create the token in [Gather access](./d1-gather.md).

---
[Build and run the web client](./d4-webclient.md) < Back | Next > [Set the Cesium ion token](../customize/cesium-token.md)
