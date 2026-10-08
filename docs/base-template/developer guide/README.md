# Developer Guide: World View

World View is a complete globe on its own. Optional features are separate templates, documented under [Template Feature Extensions](../../feature-extensions/README.md). This guide is only the base: the template package and the web client.

You need a Twinit account and a machine that can run a React client. The steps assume you can sign in with the Twinit IDE extension, and that you already know what a project, a script, an OMAPI config, and a NamedUserCollection are. New apps in this repo use **Vite + React**. ipa-core and `npx create-twinit-app` are not part of World View.

Platform baseline is Twinit **v5.2** unless a package pin says otherwise. The client SDK is `@dtplatform/platform-api@~5.1.0`.

## World View

If you want the shape of the app before you deploy, start with the [general introduction](./implementation/general-intro.md). The steps below are enough to get a signed-in globe with sites, aircraft, space, and personnel.

1. [Gather access, the app id, and the redirect URI](./deploy/d1-gather.md)
2. [Deploy the World View template package](./deploy/d2-deploy-world-view.md)
3. [Build and run the web client](./deploy/d4-webclient.md)
4. [Test the deployment](./deploy/d5-test.md)

When you want to change how the base works:

* [General introduction](./implementation/general-intro.md)
* [Data model](./implementation/data-model.md)
* [OMAPI, workflow, and MCP tools](./implementation/omapi.md)
* [Web client](./implementation/web-client.md)
* [Permissions](./implementation/permissions.md)
* [Architecture brief](./world-view-architecture.md)
* [Aircraft intel layer](./aircraft-intel-layer.md)
* [Space intel layer](./space-intel-layer.md)

## Customize

* [Set the Cesium ion token](./customize/cesium-token.md)
* [Change the HUD stamp and colors](./customize/hud-stamp.md)

## Finding support

Twinit Academy covers projects, scripts, and the IDE extension: [https://twinit.dev/docs/academy//](https://twinit.dev/docs/academy/).

Platform API reference: [https://twinit.dev/docs/apis/](https://twinit.dev/docs/apis/).

The [digitaltwin-factory](https://github.com/Invicara/digitaltwin-factory) repository (Apache 2.0) is the reference for other Twinit application patterns. World View does not use its BIM import or ipa-core viewer.

---
[Home](../../../README.md) < Back | Next > [User Guide](../user%20guide/README.md)
