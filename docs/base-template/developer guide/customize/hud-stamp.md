[Set the Cesium ion token](./cesium-token.md) < Back | Next > [User Guide](../../user%20guide/README.md)

---

# Change the HUD stamp and colors

The stamp is data from OMAPI, not a string in the React tree. Colors are CSS.

## Stamp and home camera

1. Open `template-package/scripts/worldViewApi.mjs`.
2. Edit `getWorldViewConfig`. `hudStamp` is the top-left line. `displayName`, `camera`, `tilesEnableHeightMeters`, and `attribution` are the same object.
3. Validate and redeploy the World View package to the project with **Deploy Template to Project** in the Twinit IDE extension. Point it at `template-package`. Do not build a zip.

4. Reload the client. The HUD reads `config.hudStamp` and falls back to `WORLD VIEW // ORBITAL RECON` only when the request fails.

The fallback string is `DEFAULT_WORLD_VIEW_CONFIG` in `client/src/services/worldViewConfig.js`. Change it if you want the offline stamp to match.

## Colors

Operational color is in `client/src/index.css` (phosphor HUD, amber aircraft, cyan space, gate status colors drawn from `client/src/services/gateOpsFormat.js`).

Gate legend colors are the `color` fields in `gateOpsFormat.js`. Aircraft and space billboard colors are the constants at the top of `client/src/components/Globe.jsx`. Change those in the client and refresh. They are not in the template package.

Do not encode business rules in the CSS or in the globe component. Status values still come from `listGateOperations`.

---
[Set the Cesium ion token](./cesium-token.md) < Back | Next > [User Guide](../../user%20guide/README.md)
