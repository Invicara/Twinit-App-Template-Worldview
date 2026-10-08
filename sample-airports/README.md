# sample-airports

This is an example of a template layered on a base template. [World View](../template-package/README.md) is the base, and it is a working globe by itself. Deploy this package afterward, on that same project, when you also want airports and DTW gate operations. Skip it and the globe simply has no airport list.

The layer creates the **Gates** collection. It does not create Sites. It writes into the Sites collection the base already made, and it adds the gate route onto the World View API instead of shipping a second API. If a workspace already has Gates from an older World View deploy, that collection is left in place.

Why it is built that way: [Developer Guide](../docs/feature-extensions/sample-airports/developer%20guide/sample-airports.md). Operators: [User Guide](../docs/feature-extensions/sample-airports/user%20guide/README.md).

It writes:

- 30 FAA large-hub airports into **Sites** (`world_view_sites`)
- McNamara terminal gates into **Gates** (`world_view_gates`)
- An Item Service relation from the DTW site to those gates
- Script `gateOperations` (`gate-ops-script`) — the status picture, `listGateOperations`, and the MCP handlers
- MCP tools `QueryGates`, `GetGate`, `GetGateOperations`, `GetGateOperationsSummary`
- MCP tool filter `world_view_gate_ops`
- `GET /world-view/gate-operations` on the existing **World View API** config

A project can have only one deployed API config. This package does not ship a second config. Setup reads the World View API user config, adds the gate routes if they are missing, and redeploys that config. Redeploying the World View package replaces the live config and drops those routes until this package is applied again.

In the Twinit IDE extension, run **Deploy Template to Project** and point it at this folder. The extension validates the package before it writes anything. Do not build a zip.

`ifExists` is `add`, so the rows are written even when the collections already contain items. Setup then drops later items that share a `_name`. Applying the package again does not leave duplicate airports or gates.

## External MCP client

After this package is applied, an external agent can query DTW McNamara gate operations through the project's AI Service MCP endpoint. Create a Twinit API key and secret for the project, then connect with:

```
POST {TWINIT_API}/aisvc/api/v1/stateless/mcp/tools?nsfilter={project-namespace}&filter=world_view_gate_ops
```

`TWINIT_API` is the environment you are signed in to (for example the value of `VITE_TWINIT_API`). Put the API key and secret in the client, not in this repo.

```json
{
  "mcpServers": {
    "world-view-gate-ops": {
      "url": "https://<twinit-api-host>/aisvc/api/v1/stateless/mcp/tools?nsfilter=<project-namespace>&filter=world_view_gate_ops",
      "headers": {
        "Authorization": "Basic <base64-of-apiKey:secret>"
      }
    }
  }
}
```

| Tool | Purpose |
|------|---------|
| `QueryGates` | Search gates by concourse, status, flight ident, origin, or destination |
| `GetGate` | One gate by id (`A17`, `B8`, …) |
| `GetGateOperations` | Current operations snapshot, with optional concourse/status filters |
| `GetGateOperationsSummary` | Status counts for the terminal or one concourse |

Gate operations are available for **DTW** only.

See the [Developer Guide](../docs/feature-extensions/sample-airports/developer%20guide/sample-airports.md).
