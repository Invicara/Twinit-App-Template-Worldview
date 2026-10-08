async function optionsScript() {
  return { ok: true }
}

const SITES_USER_TYPE = 'world_view_sites'

function propertyValue(properties, key) {
  const value = properties?.[key]
  if (value == null) return null
  if (typeof value === 'object' && 'val' in value) return value.val
  return value
}

function toSite(item) {
  const properties = item.properties || {}
  return {
    id: item._id,
    name: item._name,
    latitude: Number(propertyValue(properties, 'latitude')),
    longitude: Number(propertyValue(properties, 'longitude')),
    heightMeters: Number(propertyValue(properties, 'heightMeters')),
    headingDegrees: Number(propertyValue(properties, 'headingDegrees')),
    pitchDegrees: Number(propertyValue(properties, 'pitchDegrees'))
  }
}

async function getSitesCollection(IafItemSvc, ctx) {
  const result = await IafItemSvc.getNamedUserItems(
    { query: { _userType: SITES_USER_TYPE } },
    ctx
  )
  return result?._list?.[0] ?? null
}

async function getWorldViewConfig() {
  return {
    displayName: 'World View',
    hudStamp: 'WORLD VIEW // ORBITAL RECON',
    camera: {
      longitude: -98,
      latitude: 39,
      heightMeters: 19000000,
      headingDegrees: 0,
      pitchDegrees: -90
    },
    tilesEnableHeightMeters: 50000,
    photorealisticTilesAssetId: 2275207,
    attribution: 'Imagery and 3D tiles © Cesium / Google'
  }
}

async function listSites(input, libraries, ctx) {
  const { IafItemSvc } = libraries.PlatformApi
  const collection = await getSitesCollection(IafItemSvc, ctx)
  if (!collection) return { sites: [] }

  const result = await IafItemSvc.getRelatedItems(
    collection._id,
    { query: {} },
    ctx,
    { page: { _pageSize: 1000, _offset: 0 }, sort: { _name: 1 } }
  )

  return {
    sites: (result?._list ?? []).map(toSite)
  }
}

async function createSite(input, libraries, ctx) {
  const { IafItemSvc } = libraries.PlatformApi
  const name = String(input.params?.name ?? '').trim()
  const latitude = Number(input.params?.latitude)
  const longitude = Number(input.params?.longitude)
  const heightMeters = Number(input.params?.heightMeters)
  const headingDegrees = Number(input.params?.headingDegrees)
  const pitchDegrees = Number(input.params?.pitchDegrees)

  if (!name) {
    throw new Error('Site name is required')
  }
  if (![latitude, longitude, heightMeters].every(Number.isFinite)) {
    throw new Error('Site coordinates are required')
  }

  const collection = await getSitesCollection(IafItemSvc, ctx)
  if (!collection) {
    throw new Error('Sites collection is not deployed')
  }

  const created = await IafItemSvc.createRelatedItems(
    collection._id,
    [{
      _name: name,
      _userType: 'world_view_site',
      properties: {
        latitude: { dName: 'Latitude', val: latitude },
        longitude: { dName: 'Longitude', val: longitude },
        heightMeters: { dName: 'Altitude', val: heightMeters },
        headingDegrees: { dName: 'Heading', val: headingDegrees },
        pitchDegrees: { dName: 'Pitch', val: pitchDegrees }
      }
    }],
    ctx
  )

  return {
    site: toSite(created?.[0] ?? created?._list?.[0] ?? { _name: name, properties: {
      latitude: { val: latitude },
      longitude: { val: longitude },
      heightMeters: { val: heightMeters },
      headingDegrees: { val: headingDegrees },
      pitchDegrees: { val: pitchDegrees }
    } })
  }
}

function siteProperties(latitude, longitude, heightMeters, headingDegrees, pitchDegrees) {
  return {
    latitude: { dName: 'Latitude', val: latitude },
    longitude: { dName: 'Longitude', val: longitude },
    heightMeters: { dName: 'Altitude', val: heightMeters },
    headingDegrees: { dName: 'Heading', val: headingDegrees },
    pitchDegrees: { dName: 'Pitch', val: pitchDegrees }
  }
}

async function updateSite(input, libraries, ctx) {
  const { IafItemSvc } = libraries.PlatformApi
  const siteId = String(input.siteid ?? input.params?.siteid ?? '').trim()
  const name = String(input.params?.name ?? '').trim()
  const latitude = Number(input.params?.latitude)
  const longitude = Number(input.params?.longitude)
  const heightMeters = Number(input.params?.heightMeters)
  const headingDegrees = Number(input.params?.headingDegrees)
  const pitchDegrees = Number(input.params?.pitchDegrees)

  if (!siteId) {
    throw new Error('Site id is required')
  }
  if (!name) {
    throw new Error('Site name is required')
  }
  if (![latitude, longitude, heightMeters].every(Number.isFinite)) {
    throw new Error('Site coordinates are required')
  }

  const collection = await getSitesCollection(IafItemSvc, ctx)
  if (!collection) {
    throw new Error('Sites collection is not deployed')
  }

  const existing = await IafItemSvc.getRelatedItem(collection._id, siteId, ctx)
  if (!existing?._id) {
    throw new Error('Site not found')
  }

  const updated = await IafItemSvc.updateRelatedItem(
    collection._id,
    siteId,
    {
      _name: name,
      properties: siteProperties(latitude, longitude, heightMeters, headingDegrees, pitchDegrees)
    },
    ctx
  )

  return {
    site: toSite(updated ?? {
      _id: siteId,
      _name: name,
      properties: siteProperties(latitude, longitude, heightMeters, headingDegrees, pitchDegrees)
    })
  }
}

async function deleteSite(input, libraries, ctx) {
  const { IafItemSvc } = libraries.PlatformApi
  const siteId = String(input.siteid ?? input.params?.siteid ?? '').trim()
  if (!siteId) {
    throw new Error('Site id is required')
  }

  const collection = await getSitesCollection(IafItemSvc, ctx)
  if (!collection) {
    throw new Error('Sites collection is not deployed')
  }

  await IafItemSvc.deleteRelatedItem(collection._id, siteId, ctx)
  return { ok: true, siteId }
}

const APP_USER_GROUP_SHORT_NAME = 'wv-users'
const APP_USER_GROUP_NAME = 'World View Users'

function asList(result) {
  if (Array.isArray(result)) return result
  return result?._list ?? []
}

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

function toMember(user) {
  const first = user?._firstname ?? ''
  const last = user?._lastname ?? ''
  const name = user?._fullname || [first, last].filter(Boolean).join(' ') || user?._email || 'UNKNOWN'
  return {
    id: user?._id,
    email: user?._email ?? '',
    name
  }
}

function toInvite(invite) {
  return {
    id: invite?._id,
    email: invite?._email ?? '',
    status: invite?._status ?? 'PENDING'
  }
}

function groupInNamespace(group, namespace) {
  return (group?._namespaces ?? []).includes(namespace)
}

async function getCurrentWorkspace(IafPassSvc, ctx) {
  const namespace = ctx?._namespaces?.[0]
  if (!namespace) {
    throw new Error('Missing project namespace')
  }

  const workspaces = asList(await IafPassSvc.getWorkspaces(
    { _userType: 'project_workspace' },
    ctx,
    { _pageSize: 1000 }
  ))
  const workspace = workspaces.find((item) => (item._namespaces ?? []).includes(namespace))
  if (!workspace) {
    throw new Error('Current project workspace was not found')
  }
  return workspace
}

function pickAppUserGroup(groups, namespace) {
  const inProject = groups.filter((group) => groupInNamespace(group, namespace))
  return inProject.find((group) => group._shortName === APP_USER_GROUP_SHORT_NAME)
    || inProject.find((group) => group._name === APP_USER_GROUP_NAME)
    || null
}

async function getAppUserGroup(libraries, ctx) {
  const { IafPassSvc, IafProj } = libraries.PlatformApi
  const workspace = await getCurrentWorkspace(IafPassSvc, ctx)
  const namespace = workspace._namespaces[0]

  if (typeof IafProj?.getUserGroups === 'function') {
    try {
      const projectGroups = asList(await IafProj.getUserGroups(workspace, ctx))
      const fromProject = pickAppUserGroup(projectGroups, namespace)
        || projectGroups.find((group) => group._shortName === APP_USER_GROUP_SHORT_NAME)
        || projectGroups.find((group) => group._name === APP_USER_GROUP_NAME)
      if (fromProject) return fromProject
    } catch (error) {
      console.warn('Project user group lookup failed', error)
    }
  }

  const byShortName = asList(await IafPassSvc.getUserGroups(
    {
      _shortName: APP_USER_GROUP_SHORT_NAME,
      _namespaces: [namespace]
    },
    ctx,
    { includeAll: true, _pageSize: 100 }
  ))
  const scoped = pickAppUserGroup(byShortName, namespace)
  if (scoped) return scoped

  const linkedId = workspace?._userAttributes?.user_group?.[0]
  if (linkedId) {
    const linked = await IafPassSvc.getUserGroup(linkedId, ctx)
    if (linked && groupInNamespace(linked, namespace)) return linked
  }

  throw new Error('World View Users group is not deployed in this project')
}

async function findUserByEmail(IafPassSvc, email, ctx) {
  const orgs = asList(await IafPassSvc.getOrganizations({}, ctx, { _pageSize: 100 }))
  for (const org of orgs) {
    try {
      const users = asList(await IafPassSvc.getOrganizationUsers(
        org._id,
        { query: email },
        ctx,
        { _pageSize: 50 }
      ))
      const match = users.find((user) => normalizeEmail(user._email) === email)
      if (match) return match
    } catch (error) {
      console.warn('Organization user lookup failed', org?._id, error)
    }
  }
  return null
}

async function listUsers(input, libraries, ctx) {
  const { IafPassSvc } = libraries.PlatformApi
  const group = await getAppUserGroup(libraries, ctx)
  const workspace = await getCurrentWorkspace(IafPassSvc, ctx)
  const currentUser = await IafPassSvc.getCurrentUser(ctx)
  const users = asList(await IafPassSvc.getUsersInGroup(
    group._id,
    ctx,
    { _pageSize: 1000, _offset: 0 }
  ))
  const invites = asList(await IafPassSvc.getUserGroupInvites(
    group._id,
    { _status: ['PENDING'] },
    ctx,
    { includeAll: true, _pageSize: 100 }
  ))

  return {
    group: { id: group._id, name: group._name },
    projectName: workspace?._name ?? null,
    currentUserId: currentUser?._id ?? null,
    users: users.map(toMember),
    invites: invites.map(toInvite)
  }
}

async function addUser(input, libraries, ctx) {
  const { IafPassSvc } = libraries.PlatformApi
  const email = normalizeEmail(input.params?.email)
  if (!email) {
    throw new Error('Email is required')
  }

  const group = await getAppUserGroup(libraries, ctx)
  const members = asList(await IafPassSvc.getUsersInGroup(
    group._id,
    ctx,
    { _pageSize: 1000, _offset: 0 }
  ))
  if (members.some((user) => normalizeEmail(user._email) === email)) {
    throw new Error('That user is already in the group')
  }

  const user = await findUserByEmail(IafPassSvc, email, ctx)
  if (!user?._id) {
    throw new Error('No platform user with that email. Send an invite instead.')
  }

  await IafPassSvc.addUsersToGroup(group._id, [user._id], ctx)
  return { user: toMember(user) }
}

async function removeUser(input, libraries, ctx) {
  const { IafPassSvc } = libraries.PlatformApi
  const userId = String(input.userid ?? input.params?.userid ?? '').trim()
  if (!userId) {
    throw new Error('User id is required')
  }

  const currentUser = await IafPassSvc.getCurrentUser(ctx)
  if (currentUser?._id === userId) {
    throw new Error('You cannot remove yourself from the group')
  }

  const group = await getAppUserGroup(libraries, ctx)
  await IafPassSvc.deleteUsersFromGroup(group._id, [userId], ctx)
  return { ok: true, userId }
}

async function inviteUser(input, libraries, ctx) {
  const { IafPassSvc } = libraries.PlatformApi
  const email = normalizeEmail(input.params?.email)
  if (!email) {
    throw new Error('Email is required')
  }

  const group = await getAppUserGroup(libraries, ctx)
  const members = asList(await IafPassSvc.getUsersInGroup(
    group._id,
    ctx,
    { _pageSize: 1000, _offset: 0 }
  ))
  if (members.some((user) => normalizeEmail(user._email) === email)) {
    throw new Error('That user is already in the group')
  }

  const pending = asList(await IafPassSvc.getUserGroupInvites(
    group._id,
    { _status: ['PENDING'] },
    ctx,
    { includeAll: true, _pageSize: 100 }
  ))
  if (pending.some((invite) => normalizeEmail(invite._email) === email)) {
    throw new Error('An invite is already pending for that email')
  }

  const created = await IafPassSvc.inviteUsersToGroup(group._id, [{ _email: email }], ctx)
  const invite = asList(created)[0] ?? { _email: email, _status: 'PENDING' }
  return { invite: toInvite(invite) }
}

async function cancelInvite(input, libraries, ctx) {
  const { IafPassSvc } = libraries.PlatformApi
  const inviteId = String(input.inviteid ?? input.params?.inviteid ?? '').trim()
  if (!inviteId) {
    throw new Error('Invite id is required')
  }

  const group = await getAppUserGroup(libraries, ctx)
  await IafPassSvc.updateUserGroupInvite(group._id, inviteId, { _status: 'CANCELLED' }, ctx)
  return { ok: true, inviteId }
}

const AIRCRAFT_MAX_COUNT = 250
const AIRCRAFT_MAX_AREA_SQ_DEG = 25
const AIRCRAFT_MAX_HALF_DEG = 2.5
const AIRCRAFT_UA = 'WorldView/1.0 (Invicara World View; +https://github.com/Invicara/worldview)'
const ADSB_ENDPOINTS = [
  'https://api.adsb.lol/v2',
  'https://opendata.adsb.fi/api/v2'
]
const FT_TO_M = 0.3048
const KT_TO_MPS = 0.514444
const FT_PER_MIN_TO_MPS = 0.00508

function readBound(input, key) {
  const value = Number(input.params?.[key])
  return Number.isFinite(value) ? value : NaN
}

function clampAircraftBbox(lamin, lomin, lamax, lomax) {
  let south = Math.max(-90, Math.min(90, lamin))
  let north = Math.max(-90, Math.min(90, lamax))
  let west = lomin
  let east = lomax
  if (south > north) {
    const swap = south
    south = north
    north = swap
  }
  if (!(west < east)) {
    const latC = (south + north) / 2
    const lonC = west
    return {
      lamin: Math.max(-90, latC - AIRCRAFT_MAX_HALF_DEG),
      lamax: Math.min(90, latC + AIRCRAFT_MAX_HALF_DEG),
      lomin: lonC - AIRCRAFT_MAX_HALF_DEG,
      lomax: lonC + AIRCRAFT_MAX_HALF_DEG
    }
  }

  const area = (north - south) * (east - west)
  if (area > AIRCRAFT_MAX_AREA_SQ_DEG) {
    const latC = (south + north) / 2
    const lonC = (west + east) / 2
    south = Math.max(-90, latC - AIRCRAFT_MAX_HALF_DEG)
    north = Math.min(90, latC + AIRCRAFT_MAX_HALF_DEG)
    west = lonC - AIRCRAFT_MAX_HALF_DEG
    east = lonC + AIRCRAFT_MAX_HALF_DEG
  }

  return { lamin: south, lomin: west, lamax: north, lomax: east }
}

function bboxToPointRadius(bbox) {
  const lat = (bbox.lamin + bbox.lamax) / 2
  const lon = (bbox.lomin + bbox.lomax) / 2
  const latNm = Math.abs(bbox.lamax - bbox.lamin) * 30
  const lonNm = Math.abs(bbox.lomax - bbox.lomin) * 30 * Math.cos((lat * Math.PI) / 180)
  const dist = Math.min(250, Math.max(1, Math.ceil(Math.hypot(latNm, lonNm))))
  return { lat, lon, dist }
}

function feetToMeters(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n * FT_TO_M : null
}

function toAdsbAircraft(ac, bbox) {
  const latitude = Number(ac?.lat)
  const longitude = Number(ac?.lon)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  if (
    latitude < bbox.lamin
    || latitude > bbox.lamax
    || longitude < bbox.lomin
    || longitude > bbox.lomax
  ) {
    return null
  }
  if (ac?.alt_baro === 'ground') return null

  const icao24 = String(ac?.hex ?? '').trim().toLowerCase()
  if (!icao24) return null

  const geoAlt = feetToMeters(ac?.alt_geom)
  const baroAlt = feetToMeters(ac?.alt_baro)
  const altitudeMeters = Number.isFinite(geoAlt)
    ? geoAlt
    : (Number.isFinite(baroAlt) ? baroAlt : 8000)
  const gsKt = Number(ac?.gs)
  const heading = Number(ac?.track)
  const baroRate = Number(ac?.baro_rate)
  const callsign = String(ac?.flight ?? '').trim()

  return {
    id: icao24,
    icao24,
    callsign: callsign || icao24.toUpperCase(),
    latitude,
    longitude,
    altitudeMeters,
    headingDegrees: Number.isFinite(heading) ? heading : null,
    velocityMps: Number.isFinite(gsKt) ? gsKt * KT_TO_MPS : null,
    verticalRateMps: Number.isFinite(baroRate) ? baroRate * FT_PER_MIN_TO_MPS : null,
    squawk: ac?.squawk ?? null
  }
}

function readAircraftList(payload) {
  if (Array.isArray(payload?.ac)) return payload.ac
  if (Array.isArray(payload?.aircraft)) return payload.aircraft
  return []
}

function asJson(value) {
  if (value == null) throw new Error('Empty HTTP response')
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) throw new Error('Empty HTTP response')
    if (trimmed.startsWith('<')) throw new Error('Upstream returned HTML')
    return JSON.parse(trimmed)
  }
  if (typeof value !== 'object') throw new Error('Unexpected HTTP response')
  if (Array.isArray(value.ac) || Array.isArray(value.aircraft)) return value
  if (value.data && typeof value.data === 'object') return asJson(value.data)
  if (value.body != null && value.body !== value) return asJson(value.body)
  return value
}

async function readHttpBody(response) {
  if (response && typeof response.text === 'function') {
    const text = await response.text()
    if (response.ok === false) {
      const hint = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 120)
      throw new Error(hint || `HTTP ${response.status}`)
    }
    return asJson(text)
  }
  if (response && typeof response.json === 'function') {
    if (response.ok === false) throw new Error(`HTTP ${response.status}`)
    return response.json()
  }
  return asJson(response)
}

async function httpGetJson(url, libraries, ctx) {
  const headers = {
    Accept: 'application/json',
    'User-Agent': AIRCRAFT_UA,
    From: 'https://github.com/Invicara/worldview'
  }
  const errors = []

  const IafFetch = libraries.PlatformApi?.IafFetch || libraries.IafFetch
  if (IafFetch?.doGet) {
    try {
      return asJson(await IafFetch.doGet(url, ctx, { headers }))
    } catch (err) {
      errors.push(`IafFetch: ${err?.message || err}`)
    }
  }

  if (typeof fetch === 'function') {
    try {
      return readHttpBody(await fetch(url, { headers }))
    } catch (err) {
      errors.push(`fetch: ${err?.message || err}`)
    }
  }

  throw new Error(errors.join('; ') || 'HTTP client unavailable for aircraft feed')
}

async function listAircraft(input, libraries, ctx) {
  const lamin = readBound(input, 'lamin')
  const lomin = readBound(input, 'lomin')
  const lamax = readBound(input, 'lamax')
  const lomax = readBound(input, 'lomax')
  if (![lamin, lomin, lamax, lomax].every(Number.isFinite)) {
    throw new Error('Aircraft bounds are required')
  }

  const bbox = clampAircraftBbox(lamin, lomin, lamax, lomax)
  const { lat, lon, dist } = bboxToPointRadius(bbox)
  const path = `/lat/${lat}/lon/${lon}/dist/${dist}`
  let lastError = 'Aircraft feed unavailable'

  for (const base of ADSB_ENDPOINTS) {
    try {
      const payload = await httpGetJson(`${base}${path}`, libraries, ctx)
      const aircraft = readAircraftList(payload)
        .map((ac) => toAdsbAircraft(ac, bbox))
        .filter(Boolean)
        .slice(0, AIRCRAFT_MAX_COUNT)
      return {
        time: Math.floor(Date.now() / 1000),
        bbox,
        upstream: base,
        aircraft
      }
    } catch (err) {
      lastError = `${base}: ${err?.message || err}`
    }
  }

  throw new Error(lastError)
}

const SPACE_COLLECTION_USER_TYPE = 'world_view_space_catalog'
const SPACE_ITEM_USER_TYPE = 'world_view_space_cache'

function parseCatalog(value) {
  if (Array.isArray(value)) return value
  if (typeof value !== 'string') return []
  const trimmed = value.trim()
  if (!trimmed) return []
  try {
    const parsed = JSON.parse(trimmed)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    return []
  }
}

async function getSpaceCatalogCollection(IafItemSvc, ctx) {
  const result = await IafItemSvc.getNamedUserItems(
    { query: { _userType: SPACE_COLLECTION_USER_TYPE } },
    ctx
  )
  return result?._list?.[0] ?? null
}

async function listSpace(input, libraries, ctx) {
  const { IafItemSvc } = libraries.PlatformApi
  const collection = await getSpaceCatalogCollection(IafItemSvc, ctx)
  if (!collection) {
    return { fetchedAt: null, source: null, objects: [] }
  }

  const result = await IafItemSvc.getRelatedItems(
    collection._id,
    { query: { _userType: SPACE_ITEM_USER_TYPE } },
    ctx,
    { page: { _pageSize: 1, _offset: 0 }, sort: { _createdAt: -1 } }
  )
  const item = result?._list?.[0] ?? null
  if (!item) {
    return { fetchedAt: null, source: null, objects: [] }
  }

  const objects = parseCatalog(propertyValue(item.properties, 'catalog'))
  return {
    fetchedAt: propertyValue(item.properties, 'fetchedAt'),
    source: propertyValue(item.properties, 'source'),
    objects
  }
}
