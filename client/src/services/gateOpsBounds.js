// Terminal-level altitude band. Sits well above the ~2,790 m the DTW site view
// settles at, so gates stay available while panning and zooming around McNamara.
export const GATE_OPS_MAX_HEIGHT_METERS = 6000

export const MCNAMARA_BBOX = {
  south: 42.200603,
  west: -83.365688,
  north: 42.216619,
  east: -83.351047
}

export function isDtwSite(site) {
  return /^DTW\b/i.test(String(site?.name ?? ''))
}

export function gateOpsViewAllowed(camera) {
  const height = camera?.heightMeters
  if (!Number.isFinite(height) || height > GATE_OPS_MAX_HEIGHT_METERS) return false
  const lat = camera.latitude
  const lon = camera.longitude
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false
  return (
    lat >= MCNAMARA_BBOX.south
    && lat <= MCNAMARA_BBOX.north
    && lon >= MCNAMARA_BBOX.west
    && lon <= MCNAMARA_BBOX.east
  )
}
