[Deploy the World View template package](./d2-deploy-world-view.md) < Back | Next > [Test the deployment](./d5-test.md)

---

# Deploy step 3: Build and run the web client

The base deploy does not include a hosted UI. The client in this repo is what people actually fly. You can run it now. The airport layer is optional and does not have to be on the project yet.

## Configure

1. Copy `client/.env.example` to `client/.env.local`.
2. Set `VITE_TWINIT_API` to the same origin you deployed to (no trailing path).
3. Set `VITE_TWINIT_APP_ID` to the application id from step 1.
4. Set `VITE_CESIUM_ION_TOKEN` to the Cesium ion token from [step 1](./d1-gather.md). The client needs it for 3D tiles and place search.

`.env.local` stays uncommitted. Do not put Twinit keys or the ion token in `template-package/` or `sample-airports/`.

## Install and run

From `client/`:

```bash
npm install
npm run dev
```

Open **http://localhost:8088/**. If the port is taken, free it. The server will not switch ports.

Sign in. If Passport rejects the redirect, the origin `http://localhost:8088/` is missing from the application. Add it, then try again. A successful login followed by `Invalid URL` means `VITE_TWINIT_API` is empty or not the platform origin.

## Production build

```bash
npm run build
npm run preview
```

`npm run build` writes `client/dist/`. Host that directory on any static host whose origin is registered as a redirect URI. Set the same `VITE_*` variables at build time; Vite inlines them. Preview still needs the port and redirect to match if you use it for sign-in.

There is no second "manager" application. One client talks to whichever project the operator selects in the HUD.

---
[Deploy the World View template package](./d2-deploy-world-view.md) < Back | Next > [Test the deployment](./d5-test.md)
