[Web client](./web-client.md) < Back | Next > [User Guide](../../user%20guide/README.md)

---

# Permissions

World View currently has one group, defined in `template-package/manifest.json`:

| `_name` | `_shortName` | Who it is for |
|---|---|---|
| World View Users | `wv-users` | Operators who sign in and use the globe |

The manifest entry includes `permissions.accessAll: true`. Members can use the project resources the client needs: OMAPI, Sites, Space Catalog, and Passport group operations the personnel dialog performs.

There is no separate Viewer group. Every signed-in member of World View Users gets the same HUD: sites, aircraft, space, and personnel. The project owner can call OMAPI without being in the group; invite operators into **World View Users** after deploy.

## Personnel behavior

`POST /world-view/users` looks up an existing platform user by email and adds them to the group. If no platform user has that email, the script returns `No platform user with that email. Send an invite instead.`

`POST /world-view/invites` creates a Passport invite. The personnel dialog lists pending invites and can delete them. The dialog's ADD button calls the add-user route, not the invite route.

`DELETE /world-view/users/:userid` refuses to remove the caller.

## Before a wider rollout

The greenfield default is one admin-style group while the API is still moving. Before end-user onboarding, add least-privilege groups as separate Permission records (not as a `permissions` snapshot embedded on the group) and keep ordinary operators out of an all-access admin group. See the Passport skill and [https://twinit.dev/docs/concepts/back-end-services/passport-service](https://twinit.dev/docs/concepts/back-end-services/passport-service).

A project API key for an extension's MCP tools is a different credential, and it exists only after that extension is installed. See [sample-airports](../../../feature-extensions/sample-airports/developer%20guide/sample-airports.md). That key is not membership in World View Users.

---
[Web client](./web-client.md) < Back | Next > [User Guide](../../user%20guide/README.md)
