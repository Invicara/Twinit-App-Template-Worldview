[Airports](./airports.md) < Back | Next > [User Guide](./README.md)

---

# Gate operations

You only need this page if the airport layer is on your project. If it is not, there is no gate prompt and no error. Use [Sites](../../../base-template/user%20guide/world-view/sites.md), [Aircraft](../../../base-template/user%20guide/world-view/aircraft.md), and [Space](../../../base-template/user%20guide/world-view/space.md).

Gate operations are the McNamara terminal at **DTW — Detroit Metropolitan**. Other sites do not offer them.

## Open the overlay

1. Turn the SITES layer on.
2. Select **DTW — Detroit Metropolitan**. The camera moves to the airport at about 3,000 m.
3. If you have climbed away, come back down. The prompt is available at or below 6,000 m, near the terminal.
4. Click **SHOW GATE OPERATIONS**.

The legend **DTW // MCNAMARA GATE OPS** replaces the prompt. It shows the time the picture was generated and a count for each status:

| Status | Meaning on the legend |
|---|---|
| Open | Gate is open in the picture |
| Inbound | An arrival is inbound |
| On Block | Aircraft is on the gate |
| Turnaround | Turn in progress |
| Boarding | Boarding |
| Delayed | The picture is in a delayed phase |
| Departing | Aircraft is departing |
| Closed | Gate is closed in the picture |

Select a status to show only those gates. Select it again to show every status. **HIDE** closes the legend and clears the filter.

Gate markers use the same colors. Select a marker for that gate's detail.

The credit line under the legend is `© OpenStreetMap contributors`. Gate positions come from that map. The status, flight ident, and city pair are an operations picture generated for the terminal so you can work the filters and the markers. They are not a live airline feed, and they are not the AIRCRAFT layer.

## If the prompt never appears

* The selected site name does not start with DTW.
* The camera is above 6,000 m. Select DTW again from the list.
* The project has no Gates collection. Ask for the sample-airports package to be applied. That case stays quiet: no prompt and no error.
* The Gates collection exists and has no gate rows. The prompt shows `No gate items found for DTW`.

`UNABLE TO READ GATE OPERATIONS` means the request failed. `ACQUIRING GATES` means it is still loading.

---
[Airports](./airports.md) < Back | Next > [User Guide](./README.md)
