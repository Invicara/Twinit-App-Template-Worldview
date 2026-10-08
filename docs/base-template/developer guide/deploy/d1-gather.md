[Developer Guide](../README.md) < Back | Next > [Deploy the World View template package](./d2-deploy-world-view.md)

---

# Deploy step 1: Gather access

Confirm these before you deploy. Guessing the environment deploys into the wrong place.

## Twinit account and application

1. Sign in to the Twinit IDE extension.
2. Select the environment you will deploy to. Common origins are Production (`https://api.invicara.com`), Sandbox (`https://sandbox-api.invicara.com`), and others your organization uses. Use the one you are signed in to. Do not assume Production.
3. Select the **World View** application. If it does not exist yet, create the application in that environment first. The client and the template deploy to the same application.

Copy the application id from the extension (right-click the application, **Copy App ID**). That value is `VITE_TWINIT_APP_ID`.

## Project

You need a project (workspace) in that application. Create it or pick it in the extension tree. That selected project is the one the deploy command writes to.

## Redirect URI

Local sign-in uses `http://localhost:8088/`. That origin must be on the application's allowed redirect URIs and CORS origins in Passport. The Vite config will not move off 8088.

## NPM

`npm install` in `client/` pulls `@dtplatform/platform-api` from `https://npm.twinit.dev/`. That registry expects Production user-access keys in `DTPLATFORM_KEY` and `DTPLATFORM_SECRET` in your environment, plus the repo `.npmrc`. Those keys are not the same as a Sandbox deploy session. Do not commit them.

## Cesium ion token

You need a Cesium ion access token before you run the client. Close-up 3D tiles and place search both call Cesium ion with that token. World View streams Google Photorealistic 3D Tiles (asset `2275207`).

Get one:

1. Create a Cesium ion account at [https://ion.cesium.com/signup](https://ion.cesium.com/signup), or sign in if you already have one.
2. Open [Access Tokens](https://ion.cesium.com/tokens).
3. Create a token for this app. Name it something you will recognize, such as `World View`. A new account also has a default token. Use a token you created for this app. Cesium says the default token is for trying things out, not for an app you hand to other people.
4. Turn on the public scopes `assets:read` and `geocode`. Leave the private scopes off. `assets:read` loads the tiles. `geocode` is what SEARCH uses.
5. Restrict the token to the origins that will load the client. For local development that is `http://localhost:8088`. Add your hosted origin when you have one. The token is baked into the browser build, so anyone who can open the app can read it. The URL limit is what keeps it from being reused elsewhere.
6. Create the token and copy it. You will put it in `VITE_CESIUM_ION_TOKEN` when you [configure the client](./d4-webclient.md). Do not commit it, and do not put it in a template package.
7. In the ion dashboard, confirm **Google Photorealistic 3D Tiles** is on your account. If that asset is missing, the token will sign in and the tiles will still fail to load.

[Set the Cesium ion token](../customize/cesium-token.md) is where that value goes in `.env.local`, and what to restart afterward.

---
[Developer Guide](../README.md) < Back | Next > [Deploy the World View template package](./d2-deploy-world-view.md)
