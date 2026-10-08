# World View template package

Deploys World View backend resources:

- `worldViewApi` object model script (`getWorldViewConfig`, sites, users, `listAircraft`, `listSpace`)
- OMAPI config for config, sites, users, aircraft, and space
- **Sites** NamedUserCollection (`world_view_sites`) — empty until a sample package or an operator adds sites
- **Space Catalog** NamedUserCollection (`world_view_space_catalog`)
- `fetchSpaceCatalog` workflow script and **FetchSpaceCatalog** schedule (`0 5 0/2 * * ? *` UTC)
- World View Users group

This is the base template. Airport data and other optional features are not in it. Those are [feature extensions](../docs/feature-extensions/README.md), deployed later only on projects that need them.

## Deploy

Target project: the project you selected in the Twinit IDE extension. Confirm that project before the first deploy of a session. See [Gather access](../docs/base-template/developer%20guide/deploy/d1-gather.md).

In the Twinit IDE extension, run **Deploy Template to Project** and point it at this folder. The extension validates the package before it writes anything. Do not build a zip.

## After deploy

Invite operators into **World View Users**. The project owner can already call OMAPI without that membership.

The setup script creates the workflow schedule and runs one seed fetch from CelesTrak. If that seed fails, SPACE stays empty until the next scheduled run.

Feature extensions are not in this package. Redeploying this package replaces the live API config with the routes in `omapiConfig/World View API.json`, which drops any route an extension patched on until that extension is applied again. See [Template Feature Extensions](../docs/feature-extensions/README.md).
