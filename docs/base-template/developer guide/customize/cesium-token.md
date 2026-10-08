[Test the deployment](../deploy/d5-test.md) < Back | Next > [Change the HUD stamp and colors](./hud-stamp.md)

---

# Set the Cesium ion token

A Cesium ion access token is required. Photorealistic 3D tiles and HUD place search both use it. If it is missing, the HUD shows `3D TILES OFFLINE — AWAITING ION TOKEN` and SEARCH stays hidden. Create the token in [Gather access](../deploy/d1-gather.md) before you run the client.

1. Open `client/.env.local` (copy from `client/.env.example` if you have not already).
2. Set:

```
VITE_CESIUM_ION_TOKEN=<your token>
```

3. Restart `npm run dev`. Vite reads env files at startup.

The token is a browser build variable. Anyone who can load the client can see it. Use a token scoped to the origins you host, and do not commit `.env.local`.

The tileset asset id and the altitude where tiles arm (50 km) are not in the env file. They come from `getWorldViewConfig` in `template-package/scripts/worldViewApi.mjs` (`photorealisticTilesAssetId`, `tilesEnableHeightMeters`). Changing those requires a template redeploy, not only an env edit.

---
[Test the deployment](../deploy/d5-test.md) < Back | Next > [Change the HUD stamp and colors](./hud-stamp.md)
