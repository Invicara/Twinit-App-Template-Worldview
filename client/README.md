# World View client

Vite + React client for the World View Twinit application.

Operator how-tos: [`docs/base-template/user guide`](../docs/base-template/user%20guide/README.md). Deploy steps: [`docs/base-template/developer guide`](../docs/base-template/developer%20guide/README.md).

Dev server: `http://localhost:8088/` (`strictPort` is on so the OAuth redirect URI stays valid).

The **AIRCRAFT** layer calls OMAPI `GET /world-view/aircraft`. See [`docs/base-template/developer guide/aircraft-intel-layer.md`](../docs/base-template/developer%20guide/aircraft-intel-layer.md).

The **SPACE** layer calls OMAPI `GET /world-view/space` (cached CelesTrak stations). See [`docs/base-template/developer guide/space-intel-layer.md`](../docs/base-template/developer%20guide/space-intel-layer.md).

Gate operations show up only after you layer the sample-airports template onto the project. Until then the globe just does not offer them. See the [sample-airports user guide](../docs/feature-extensions/sample-airports/user%20guide/README.md).
