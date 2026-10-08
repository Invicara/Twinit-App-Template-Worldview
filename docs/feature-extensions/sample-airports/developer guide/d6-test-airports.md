[sample-airports package](./sample-airports.md) < Back | Next > [User Guide](../user%20guide/README.md)

---

# Test airport features

Use this page only after [sample-airports](./d3-sample-airports.md) has been applied to the same project you already tested as World View. The [World View test](../../../base-template/developer%20guide/deploy/d5-test.md) does not expect airports or gate operations.

Sign in at `http://localhost:8088/` and select that project.

| Check | Pass |
|---|---|
| SITES | The list includes the sample airports plus any sites you saved. Names look like `DTW — DETROIT METROPOLITAN`. |
| DTW camera | Selecting DTW flies to about 3,000 m, looking down. |
| Gate prompt | With DTW selected and the camera under 6 km, **SHOW GATE OPERATIONS** appears. There is no error above the button. |
| Legend | The legend lists Open, Inbound, On Block, Turnaround, Boarding, Delayed, Departing, Closed. **HIDE** returns to the prompt. |

## Failure signs

* No gate prompt and no gate error on a site you saved yourself — expected. Gate operations are offered for a site whose name starts with DTW.
* No gate prompt and no gate error on DTW — Gates is not on this project, or the gate route was dropped by a later World View redeploy. Apply sample-airports again.
* Gate prompt error `No gate items found for DTW` — Gates exists and has no gate rows.
* `UNABLE TO READ GATE OPERATIONS` — the route answered and failed. Sites, aircraft, and space should still work. Read the OMAPI request log for `GET /world-view/gate-operations`.

## MCP

With a project API key, call the stateless MCP endpoint in [sample-airports/README.md](../../../../sample-airports/README.md). `GetGateOperationsSummary` should return counts. `GetGate` with id `A1` should return that gate. This path does not use the web client.

---
[sample-airports package](./sample-airports.md) < Back | Next > [User Guide](../user%20guide/README.md)
