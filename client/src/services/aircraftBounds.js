export const AIRCRAFT_MAX_AREA_SQ_DEG = 25
export const AIRCRAFT_MAX_HEIGHT_METERS = 5e5
const MAX_HALF_DEG = 2.5

function roundBound(value) {
  return Number(value.toFixed(2))
}

function viewRectangle(camera) {
  const view = camera?.view
  if (
    !view
    || !Number.isFinite(view.south)
    || !Number.isFinite(view.west)
    || !Number.isFinite(view.north)
    || !Number.isFinite(view.east)
    || view.south >= view.north
  ) {
    return null
  }
  return view
}

function lonSpanDegrees(west, east) {
  let span = east - west
  if (span < 0) span += 360
  return span
}

export function cameraViewAreaSqDeg(camera) {
  const view = viewRectangle(camera)
  if (!view) return null
  return (view.north - view.south) * lonSpanDegrees(view.west, view.east)
}

function queryHalfDeg(camera) {
  return Math.min(
    MAX_HALF_DEG,
    Math.max(0.25, (camera.heightMeters ?? 5e6) / 2e5)
  )
}

export function aircraftViewAllowed(camera) {
  const height = camera?.heightMeters
  if (Number.isFinite(height)) return height <= AIRCRAFT_MAX_HEIGHT_METERS
  const area = cameraViewAreaSqDeg(camera)
  return Number.isFinite(area) && area <= AIRCRAFT_MAX_AREA_SQ_DEG
}

export function bboxFromCamera(camera) {
  if (!camera || !Number.isFinite(camera.latitude) || !Number.isFinite(camera.longitude)) {
    return null
  }

  const view = viewRectangle(camera)
  const viewArea = cameraViewAreaSqDeg(camera)
  const compactView = Boolean(
    view
    && view.west < view.east
    && Number.isFinite(viewArea)
    && viewArea > 0
    && viewArea <= AIRCRAFT_MAX_AREA_SQ_DEG
  )

  let lamin
  let lomin
  let lamax
  let lomax

  if (compactView) {
    lamin = view.south
    lomin = view.west
    lamax = view.north
    lomax = view.east
  } else {
    const half = queryHalfDeg(camera)
    lamin = camera.latitude - half
    lamax = camera.latitude + half
    lomin = camera.longitude - half
    lomax = camera.longitude + half
  }

  lamin = Math.max(-90, Math.min(90, lamin))
  lamax = Math.max(-90, Math.min(90, lamax))

  return {
    lamin: roundBound(lamin),
    lomin: roundBound(lomin),
    lamax: roundBound(lamax),
    lomax: roundBound(lomax)
  }
}
