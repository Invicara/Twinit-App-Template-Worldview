export function formatOrbitAltitude(altitudeMeters) {
  if (!Number.isFinite(altitudeMeters)) return '—'
  return `${(altitudeMeters / 1000).toFixed(1)} KM`
}

export function formatOrbitVelocity(velocityMps) {
  if (!Number.isFinite(velocityMps)) return '—'
  return `${(velocityMps / 1000).toFixed(2)} KM/S`
}

export function formatInclination(inclinationDegrees) {
  if (!Number.isFinite(inclinationDegrees)) return '—'
  return `${inclinationDegrees.toFixed(1)}°`
}
