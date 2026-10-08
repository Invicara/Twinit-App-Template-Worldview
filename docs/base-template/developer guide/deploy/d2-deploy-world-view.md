[Gather access](./d1-gather.md) < Back | Next > [Build and run the web client](./d4-webclient.md)

---

# Deploy step 2: Deploy the World View template package

This is the base. It creates the backend on the project you chose in step 1, and it stops there. No airports, no gates. When this deploy finishes, go to the [web client](./d4-webclient.md).

If you later want an optional layer on this same project, that is a separate deploy under [Template Feature Extensions](../../../feature-extensions/README.md). sample-airports is [applied on its own](../../../feature-extensions/sample-airports/developer%20guide/d3-sample-airports.md). You do not need it to call this step done.

Confirm the target for the first deploy of a session: template **World View**, project name, and environment. After that, you can redeploy the same project while you iterate.

## Deploy

In the Twinit IDE extension, on the project from step 1, run **Deploy Template to Project**. Point it at the `template-package` folder.

The extension checks the package before it writes anything. If the check fails, it stops at the first problem. Fix that and run the command again. Do not build a zip. The extension packages the folder.

If the deploy itself fails, read the output in the extension. Permissions, a missing namespace, or a name clash are the usual causes. Stay signed in to the environment you mean. Switching environments in a config file will not retarget the command.

## What you should see afterward

In the extension tree for that project:

* Scripts: `worldViewApi` (`omapi-script`), `fetchSpaceCatalog` (`workflow-script`)
* API config: **World View API** — config, sites, users, aircraft, space. No gate-operations route.
* User group: **World View Users**
* Item Service collections: **Sites** (`world_view_sites`), **Space Catalog** (`world_view_space_catalog`). Gates is not created here.
* Workflow: **FetchSpaceCatalog** with a UTC schedule

Sites exists and has no rows yet. Operators add sites from the globe. Space Catalog may already hold one cache item if the setup script's CelesTrak seed succeeded. A warning in the setup log means the seed failed; the schedule will try again.

Invite operators into **World View Users** when you are ready for them to sign in. You can do that from the extension or, after the client is running, from PERSONNEL.

---
[Gather access](./d1-gather.md) < Back | Next > [Build and run the web client](./d4-webclient.md)
