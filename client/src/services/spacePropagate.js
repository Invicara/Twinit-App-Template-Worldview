import {
  degreesLat,
  degreesLong,
  eciToGeodetic,
  gstime,
  json2satrec,
  propagate
} from 'satellite.js'

function readNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function catalogObjectId(omm) {
  const norad = omm?.NORAD_CAT_ID ?? omm?.norad_cat_id
  if (norad != null && String(norad).trim()) return String(norad).trim()
  const objectId = omm?.OBJECT_ID ?? omm?.object_id
  if (objectId) return String(objectId)
  return String(omm?.OBJECT_NAME ?? omm?.object_name ?? 'unknown')
}

export function catalogObjectName(omm) {
  return String(omm?.OBJECT_NAME ?? omm?.object_name ?? catalogObjectId(omm)).trim()
}

export function toSatrec(omm) {
  if (!omm || typeof omm !== 'object') return null
  if (omm.NORAD_CAT_ID == null || !omm.EPOCH) return null
  try {
    const satrec = json2satrec(omm)
    if (!satrec || satrec.error) return null
    return satrec
  } catch {
    return null
  }
}

export function propagateSatrec(satrec, when = new Date()) {
  if (!satrec) return null
  const pv = propagate(satrec, when)
  const positionEci = pv?.position
  if (!positionEci || !Number.isFinite(positionEci.x)) return null

  const gmst = gstime(when)
  const geodetic = eciToGeodetic(positionEci, gmst)
  const latitude = degreesLat(geodetic.latitude)
  const longitude = degreesLong(geodetic.longitude)
  const altitudeMeters = geodetic.height * 1000
  if (![latitude, longitude, altitudeMeters].every(Number.isFinite)) return null

  const velocity = pv.velocity
  const velocityMps = velocity && [velocity.x, velocity.y, velocity.z].every(Number.isFinite)
    ? Math.hypot(velocity.x, velocity.y, velocity.z) * 1000
    : null

  return {
    latitude,
    longitude,
    altitudeMeters,
    velocityMps
  }
}

export function propagateCatalog(objects, when = new Date()) {
  if (!Array.isArray(objects)) return []
  return objects.map((omm) => {
    const satrec = toSatrec(omm)
    const state = propagateSatrec(satrec, when)
    if (!state) return null
    return {
      id: catalogObjectId(omm),
      name: catalogObjectName(omm),
      objectId: omm?.OBJECT_ID ?? omm?.object_id ?? null,
      inclinationDegrees: readNumber(omm?.INCLINATION ?? omm?.inclination),
      ...state
    }
  }).filter(Boolean)
}
