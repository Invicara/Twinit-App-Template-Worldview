export function displayCallsign(aircraft) {
  return String(aircraft?.callsign || aircraft?.icao24 || '').toUpperCase()
}

export function formatIcao24(icao24) {
  const value = String(icao24 || '').trim().toLowerCase()
  return value ? value.toUpperCase() : '—'
}

export function formatLatLon(value, axis) {
  if (!Number.isFinite(value)) return '—'
  const hemisphere = axis === 'lat'
    ? (value >= 0 ? 'N' : 'S')
    : (value >= 0 ? 'E' : 'W')
  return `${Math.abs(value).toFixed(4)}° ${hemisphere}`
}

export function formatAltitude(altitudeMeters) {
  if (!Number.isFinite(altitudeMeters)) return '—'
  const feet = Math.max(0, Math.round(altitudeMeters * 3.28084))
  const fl = Math.round(feet / 100)
  return `FL${String(fl).padStart(3, '0')}  ${feet.toLocaleString()} FT`
}

export function formatFlightLevel(altitudeMeters) {
  if (!Number.isFinite(altitudeMeters)) return '—'
  return `FL${Math.max(0, Math.round((altitudeMeters * 3.28084) / 100))}`
}

export function formatHeading(headingDegrees) {
  if (!Number.isFinite(headingDegrees)) return '—'
  const wrapped = ((headingDegrees % 360) + 360) % 360
  return `${String(Math.round(wrapped)).padStart(3, '0')}°`
}

export function formatKnots(velocityMps) {
  if (!Number.isFinite(velocityMps)) return '—'
  return `${Math.round(velocityMps * 1.94384)} KT`
}

export function formatVerticalRate(verticalRateMps) {
  if (!Number.isFinite(verticalRateMps)) return '—'
  const fpm = Math.round(verticalRateMps * 196.85)
  if (Math.abs(fpm) < 50) return 'LEVEL'
  const direction = fpm > 0 ? 'CLIMB' : 'DESC'
  return `${direction} ${Math.abs(fpm).toLocaleString()} FPM`
}

export function formatSquawk(squawk) {
  const value = String(squawk ?? '').trim()
  return value || '—'
}

export function isEmergencySquawk(squawk) {
  return ['7500', '7600', '7700'].includes(String(squawk ?? '').trim())
}
