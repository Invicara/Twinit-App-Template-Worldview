const SPACE_COLLECTION_USER_TYPE = 'world_view_space_catalog'
const SPACE_ITEM_USER_TYPE = 'world_view_space_cache'
const SPACE_GROUP = 'stations'
const CATALOG_URLS = [
  `https://celestrak.org/NORAD/elements/gp.php?GROUP=${SPACE_GROUP}&FORMAT=json`,
  'https://raw.githubusercontent.com/satvisorcom/satvisor-data/master/celestrak/json/stations.json'
]
const SPACE_UA = 'WorldView/1.0 (Invicara World View; +https://github.com/Invicara/worldview)'
const KEEP_CACHE_ITEMS = 5

function asList(result) {
  if (Array.isArray(result)) return result
  return result?._list ?? []
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
  if (Array.isArray(value)) return value
  if (value.data != null && value.data !== value) return asJson(value.data)
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

function fetchErrorDetail(err) {
  const cause = err?.cause
  return [err?.message, cause?.code, cause?.message].filter(Boolean).join(' ') || String(err)
}

async function httpGetJson(url) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': SPACE_UA,
        From: 'https://github.com/Invicara/worldview'
      }
    })
    return readHttpBody(response)
  } catch (err) {
    throw new Error(fetchErrorDetail(err))
  }
}

async function loadStationCatalog() {
  const errors = []
  for (const url of CATALOG_URLS) {
    try {
      const payload = await httpGetJson(url)
      const objects = readOmmList(payload).filter((row) => row && typeof row === 'object')
      if (objects.length === 0) {
        throw new Error('no station objects')
      }
      return { source: url, objects }
    } catch (err) {
      errors.push(`${url}: ${err?.message || err}`)
    }
  }
  throw new Error(errors.join('; ') || 'Station catalog unavailable')
}

function readOmmList(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.data)) return payload.data
  return []
}

async function getSpaceCollection(IafItemSvc, ctx) {
  const result = await IafItemSvc.getNamedUserItems(
    { query: { _userType: SPACE_COLLECTION_USER_TYPE } },
    ctx
  )
  return asList(result)[0] ?? null
}

async function pruneOldCaches(IafItemSvc, collectionId, ctx) {
  const result = await IafItemSvc.getRelatedItems(
    collectionId,
    { query: { _userType: SPACE_ITEM_USER_TYPE } },
    ctx,
    { page: { _pageSize: 50, _offset: 0 }, sort: { _createdAt: -1 } }
  )
  const items = asList(result)
  const stale = items.slice(KEEP_CACHE_ITEMS)
  for (const item of stale) {
    if (!item?._id) continue
    await IafItemSvc.deleteRelatedItem(collectionId, item._id, ctx)
  }
}

async function fetchSpaceCatalog(input, libraries, ctx) {
  const { IafItemSvc } = libraries.PlatformApi
  const collection = await getSpaceCollection(IafItemSvc, ctx)
  if (!collection) {
    throw new Error('Space Catalog collection is not deployed')
  }

  const { source, objects } = await loadStationCatalog()

  const fetchedAt = new Date().toISOString()
  const created = await IafItemSvc.createRelatedItems(
    collection._id,
    [{
      _name: `${SPACE_GROUP} ${fetchedAt}`,
      _userType: SPACE_ITEM_USER_TYPE,
      properties: {
        group: { dName: 'Group', val: SPACE_GROUP },
        source: { dName: 'Source', val: source },
        fetchedAt: { dName: 'Fetched At', val: fetchedAt },
        objectCount: { dName: 'Objects', val: objects.length },
        catalog: { dName: 'Catalog', val: JSON.stringify(objects) }
      }
    }],
    ctx
  )

  await pruneOldCaches(IafItemSvc, collection._id, ctx)

  return {
    fetchedAt,
    source,
    objectCount: objects.length,
    itemId: created?.[0]?._id ?? created?._list?.[0]?._id ?? null
  }
}
