export function formatLatitude(value) {
  if (!Number.isFinite(value)) return ''
  const hemisphere = value >= 0 ? 'N' : 'S'
  return `${Math.abs(value).toFixed(4)}° ${hemisphere}`
}

export function formatLongitude(value) {
  if (!Number.isFinite(value)) return ''
  const hemisphere = value >= 0 ? 'E' : 'W'
  return `${Math.abs(value).toFixed(4)}° ${hemisphere}`
}

export function formatAltitude(meters) {
  if (!Number.isFinite(meters)) return ''
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(meters >= 100000 ? 0 : 1)} KM`
  }
  return `${Math.round(meters)} M`
}

export function formatHeading(degrees) {
  if (!Number.isFinite(degrees)) return ''
  const normalized = ((degrees % 360) + 360) % 360
  return `${normalized.toFixed(1)}°`
}

export function draftFromCamera(camera) {
  return {
    latitude: formatLatitude(camera?.latitude),
    longitude: formatLongitude(camera?.longitude),
    altitude: formatAltitude(camera?.heightMeters),
    heading: formatHeading(camera?.headingDegrees)
  }
}

function parseSignedDegrees(raw, positive, negative) {
  const text = String(raw ?? '').trim().toUpperCase()
  if (!text) return null

  const match = text.match(/(-?\d+(?:\.\d+)?)\s*°?\s*([A-Z])?/)
  if (!match) return null

  let value = Number(match[1])
  if (!Number.isFinite(value)) return null

  const hemi = match[2]
  if (hemi === negative) value = -Math.abs(value)
  else if (hemi === positive) value = Math.abs(value)

  return value
}

export function parseLatitude(raw) {
  const value = parseSignedDegrees(raw, 'N', 'S')
  if (value == null || value < -90 || value > 90) return null
  return value
}

export function parseLongitude(raw) {
  const value = parseSignedDegrees(raw, 'E', 'W')
  if (value == null || value < -180 || value > 180) return null
  return value
}

export function parseAltitudeMeters(raw) {
  const text = String(raw ?? '').trim().toUpperCase()
  if (!text) return null

  const match = text.match(/(-?\d+(?:\.\d+)?)/)
  if (!match) return null

  const value = Number(match[1])
  if (!Number.isFinite(value) || value <= 0) return null

  if (text.includes('KM')) return value * 1000
  if (/(^|[^A-Z])M\b/.test(text) && !text.includes('KM')) return value
  if (value > 100000) return value
  return value * 1000
}

export function parseHeading(raw) {
  const text = String(raw ?? '').trim()
  const match = text.match(/(-?\d+(?:\.\d+)?)/)
  if (!match) return null
  const value = Number(match[1])
  if (!Number.isFinite(value)) return null
  return ((value % 360) + 360) % 360
}

export function parseAimDraft(draft) {
  const latitude = parseLatitude(draft.latitude)
  const longitude = parseLongitude(draft.longitude)
  const heightMeters = parseAltitudeMeters(draft.altitude)
  const headingDegrees = parseHeading(draft.heading)

  return {
    latitude,
    longitude,
    heightMeters,
    headingDegrees,
    valid: [latitude, longitude, heightMeters, headingDegrees].every((value) => value != null)
  }
}
