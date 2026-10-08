[User Guide](../README.md) < Back

---

# Learn how to use World View

These pages are the globe on its own. Sign in, fly, save sites, and use aircraft, space, and personnel.

## Features

* **Sign in** with your Twinit account and choose a project. The globe uses that project's saved data.
* **Fly the globe** with the mouse, the compass, the coordinate fields, and RESET VIEW.
* **Search** for a city or address when 3D tiles are armed, and pick a result to fly there.
* **Save sites** by right-clicking the globe, or fly to a site already in the list.
* **Aircraft.** Zoom in and turn the layer on to see airborne tracks in the current view, with callsign, flight level, and speed.
* **Space.** Turn the layer on to see stations such as the ISS. Select one to follow it.
* **Personnel.** Add someone who already has a Twinit account to World View Users, or remove a member.

## Who can do what

Everyone in the **World View Users** group has the same controls. There is not a separate read-only role in the current application.

| | Sign in and fly | Sites | Aircraft | Space | Personnel |
|---|---|---|---|---|---|
| World View Users | Yes | Yes | Yes | Yes | Yes |

The project owner can open the globe even before they are added to the group.

## Tutorials

* [Sign in and choose a project](./sign-in.md)
* [Fly the globe](./navigate.md)
* [Sites](./sites.md)
* [Aircraft](./aircraft.md)
* [Space](./space.md)
* [Personnel](./personnel.md)

## When something is missing

| What you see | What it usually means |
|---|---|
| `3D TILES OFFLINE — AWAITING ION TOKEN` | The app was started without its Cesium ion token. Search and close-up 3D buildings stay off until that token is set and the app is restarted. |
| `NO SAVED SITES` | This project has no sites yet. Right-click the globe to mark one. |
| Aircraft checkbox will not turn on | The view is too wide. Zoom until the panel stops asking for 25 sq° or less. |
| No space stations | The catalog has not been fetched yet. Try again later. |

Optional features installed on this project are documented under [Template Feature Extensions](../../../feature-extensions/README.md). If those controls are not on the globe, that extension was never installed.

---
[User Guide](../README.md) < Back
