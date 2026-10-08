const DTW_SITE_NAME = 'DTW — Detroit Metropolitan'
const DTW_LATITUDE = 42.2079
const DTW_LONGITUDE = -83.3565
const PAGE_SIZE = 500
const WORLD_VIEW_API_NAME = 'World View API'
const GATE_SCRIPT_USER_TYPE = 'gate-ops-script'
const GATE_OPS_PATH = '/world-view/gate-operations'
const GATE_OPS_FILTER_NAME = 'GateOperations'
const GATE_OPS_FILTER_USER_TYPE = 'world_view_gate_ops'
const GATE_OPS_TOOL_NAMES = [
  'GetGate',
  'GetGateOperations',
  'GetGateOperationsSummary',
  'QueryGates'
]
const GATE_OPS_PATHS = [
  {
    path: GATE_OPS_PATH,
    method: 'OPTIONS',
    script: { _userType: GATE_SCRIPT_USER_TYPE, _scriptName: 'optionsScript' }
  },
  {
    path: GATE_OPS_PATH,
    method: 'GET',
    script: { _userType: GATE_SCRIPT_USER_TYPE, _scriptName: 'listGateOperations' }
  }
]

function asList(result) {
  if (Array.isArray(result)) return result
  return result?._list ?? []
}

function log(callback, message) {
  if (typeof callback === 'function') callback(message)
}

function propertyVal(properties, key) {
  const value = properties?.[key]
  if (value == null) return null
  if (typeof value === 'object' && 'val' in value) return value.val
  return value
}

async function namedCollection(IafItemSvc, ctx, userType) {
  const collections = asList(await IafItemSvc.getNamedUserItems(
    { query: { _userType: userType } },
    ctx
  ))
  return collections[0] ?? null
}

async function listAllItems(IafItemSvc, collectionId, ctx) {
  const items = []
  let offset = 0
  for (;;) {
    const page = asList(await IafItemSvc.getRelatedItems(
      collectionId,
      { query: {} },
      ctx,
      { page: { _pageSize: PAGE_SIZE, _offset: offset } }
    ))
    items.push(...page)
    if (page.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }
  return items
}

async function dedupeByName(IafItemSvc, collection, ctx, callback, label) {
  const items = await listAllItems(IafItemSvc, collection._id, ctx)
  const seen = new Set()
  const extras = []
  for (const item of items) {
    const key = item._name
    if (!key || seen.has(key)) extras.push(item)
    else seen.add(key)
  }
  for (const extra of extras) {
    if (!extra?._id) continue
    await IafItemSvc.deleteRelatedItem(collection._id, extra._id, ctx)
  }
  if (extras.length > 0) {
    log(callback, `INFO: Removed ${extras.length} duplicate ${label} items`)
  }
}

async function alignDtwSite(IafItemSvc, sitesCollection, ctx, callback) {
  const result = await IafItemSvc.getRelatedItems(
    sitesCollection._id,
    { query: { _name: DTW_SITE_NAME } },
    ctx,
    { page: { _pageSize: 5, _offset: 0 } }
  )
  const dtw = asList(result)[0]
  if (!dtw?._id) {
    log(callback, 'WARN: DTW site not found; skipped coordinate align')
    return null
  }

  const latitude = Number(propertyVal(dtw.properties, 'latitude'))
  const longitude = Number(propertyVal(dtw.properties, 'longitude'))
  if (latitude === DTW_LATITUDE && longitude === DTW_LONGITUDE) {
    log(callback, 'INFO: DTW site already at 42.2079, -83.3565')
    return dtw
  }

  await IafItemSvc.updateRelatedItem(
    sitesCollection._id,
    dtw._id,
    {
      _name: dtw._name,
      properties: {
        ...dtw.properties,
        latitude: { dName: 'Latitude', val: DTW_LATITUDE },
        longitude: { dName: 'Longitude', val: DTW_LONGITUDE }
      }
    },
    ctx
  )
  log(callback, 'INFO: Updated DTW site to 42.2079, -83.3565')
  return dtw
}

async function relateDtwGates(IafItemSvc, sitesCollection, gatesCollection, dtw, ctx, callback) {
  const gates = await listAllItems(IafItemSvc, gatesCollection._id, ctx)
  if (gates.length === 0) {
    log(callback, 'WARN: No gate items found; skipped gate relations')
    return
  }

  const existing = asList(await IafItemSvc.getRelations(
    sitesCollection._id,
    { query: { _relatedFromId: dtw._id } },
    ctx
  ))
  const related = new Set()
  for (const rel of existing) {
    for (const id of (rel._relatedToIds ?? [])) related.add(id)
  }
  const missing = gates.map((gate) => gate._id).filter((id) => id && !related.has(id))
  if (missing.length === 0) {
    log(callback, `INFO: ${gates.length} gates already related to DTW`)
    return
  }

  await IafItemSvc.addRelations(sitesCollection._id, [{
    _relatedFromId: dtw._id,
    _relatedToIds: missing,
    _relatedUserItemDbId: gatesCollection._id,
    _relatedUserType: 'world_view_gates',
    _userType: 'world_view_site_gates'
  }], ctx)
  log(callback, `INFO: Related ${missing.length} McNamara gates to DTW`)
}

function tipVersion(config) {
  const versions = config?._versions ?? []
  const tip = config?._tipVersion
  if (tip != null) {
    const match = versions.find((version) => version._version === tip || version._id === tip)
    if (match) return match
  }
  return versions[0] ?? null
}

function parseConfigData(raw) {
  if (raw == null) return null
  if (typeof raw === 'string') return JSON.parse(raw)
  return raw
}

function configDocument(parsed) {
  if (Array.isArray(parsed)) return parsed[0] ?? null
  return parsed
}

function gateRoutesCurrent(parsed) {
  const paths = configDocument(parsed)?.endpoints?.['world-view']?.paths ?? []
  return GATE_OPS_PATHS.every((wanted) => paths.some((path) => (
    path.path === wanted.path
    && path.method === wanted.method
    && path.script?._userType === wanted.script._userType
    && path.script?._scriptName === wanted.script._scriptName
  )))
}

function withGateRoutes(parsed) {
  const doc = configDocument(parsed)
  const paths = doc?.endpoints?.['world-view']?.paths
  if (!Array.isArray(paths)) {
    throw new Error('World View API config has no world-view paths to attach gate operations to')
  }
  doc.endpoints['world-view'].paths = paths
    .filter((path) => path.path !== GATE_OPS_PATH)
    .concat(GATE_OPS_PATHS)
  return parsed
}

async function ensureGateRoutes(libraries, input, ctx, callback) {
  const IafUserConfig = libraries?.PlatformApi?.IafUserConfig
  const IafObjectModelAPISvc = libraries?.PlatformApi?.IafObjectModelAPISvc
  if (!IafUserConfig?.getUserConfigs || !IafUserConfig?.createVersion || !IafObjectModelAPISvc?.addApiConfig) {
    throw new Error('User config or OMAPI APIs are unavailable; cannot publish gate operations routes')
  }

  const found = asList(await IafUserConfig.getUserConfigs(
    { query: { _name: WORLD_VIEW_API_NAME } },
    ctx
  ))
  const config = found.find((item) => item._name === WORLD_VIEW_API_NAME) ?? found[0]
  if (!config?._id) {
    throw new Error('World View API config was not found. Deploy the World View template package first.')
  }

  const version = tipVersion(config)
  if (!version) {
    throw new Error('World View API config has no version to update')
  }

  const parsed = parseConfigData(version._userData)
  if (gateRoutesCurrent(parsed)) {
    log(callback, 'INFO: Gate operations routes already point at gate-ops-script')
    return
  }

  const nextData = JSON.stringify(withGateRoutes(parsed))
  await IafUserConfig.createVersion(config._id, {
    ...version,
    _userData: nextData,
    _userAttributes: { commitMessage: 'Add DTW gate operations routes' }
  }, ctx)
  log(callback, 'INFO: Added gate operations routes to World View API')

  const namespace = input?.project?._namespaces?.[0]
  if (!namespace) {
    throw new Error('Project namespace is required to deploy the gate operations routes')
  }
  try {
    await IafObjectModelAPISvc.deleteApiConfig(namespace, ctx)
  } catch (err) {
    log(callback, `INFO: No previous API config to replace: ${err?.message || err}`)
  }
  await IafObjectModelAPISvc.addApiConfig(config._id, ctx)
  log(callback, 'INFO: Deployed World View API with gate operations routes')
}

async function upsertGateOperationsMcpFilter(libraries, input, ctx, callback) {
  const IafAISvc = libraries?.PlatformApi?.IafAISvc
  if (!IafAISvc?.getMcpToolFilters || !IafAISvc?.createMcpToolFilters) {
    log(callback, 'WARN: IafAISvc unavailable; skipped gate operations MCP filter')
    return
  }

  const namespace = input?.project?._namespaces?.[0]
  if (!namespace) {
    throw new Error('Project namespace is required to create the gate operations MCP filter')
  }

  const body = {
    _name: GATE_OPS_FILTER_NAME,
    _description: 'Expose only World View DTW McNamara gate operations MCP tools to external agents',
    _userType: GATE_OPS_FILTER_USER_TYPE,
    _namespaces: [namespace],
    _criteria: {
      _type: 'user_mcp_tool',
      _name: { $in: GATE_OPS_TOOL_NAMES }
    }
  }

  const existing = asList(await IafAISvc.getMcpToolFilters(
    { _userType: GATE_OPS_FILTER_USER_TYPE },
    ctx,
    { _pageSize: 20, _offset: 0 }
  ))
  const found = existing.find((item) => item._name === GATE_OPS_FILTER_NAME) || existing[0]
  if (found?._id && IafAISvc.updateMcpToolFilter) {
    await IafAISvc.updateMcpToolFilter(found._id, body, ctx)
    log(callback, `INFO: Updated MCP filter ${GATE_OPS_FILTER_NAME}`)
    return
  }

  await IafAISvc.createMcpToolFilters([body], ctx)
  log(callback, `INFO: Created MCP filter ${GATE_OPS_FILTER_NAME}`)
}

export async function setup(input, libraries, ctx, callback) {
  const IafItemSvc = libraries?.PlatformApi?.IafItemSvc
  if (!IafItemSvc) {
    throw new Error('IafItemSvc is unavailable; cannot finish the sample airports import')
  }

  const sitesCollection = await namedCollection(IafItemSvc, ctx, 'world_view_sites')
  const gatesCollection = await namedCollection(IafItemSvc, ctx, 'world_view_gates')
  if (!sitesCollection?._id) {
    throw new Error('Sites collection must already exist. Deploy the World View template package first.')
  }
  if (!gatesCollection?._id) {
    throw new Error('Gates collection was not created. This package creates it before setup runs.')
  }

  await dedupeByName(IafItemSvc, sitesCollection, ctx, callback, 'site')
  await dedupeByName(IafItemSvc, gatesCollection, ctx, callback, 'gate')

  const dtw = await alignDtwSite(IafItemSvc, sitesCollection, ctx, callback)
  if (dtw?._id) {
    await relateDtwGates(IafItemSvc, sitesCollection, gatesCollection, dtw, ctx, callback)
  }

  await ensureGateRoutes(libraries, input, ctx, callback)
  await upsertGateOperationsMcpFilter(libraries, input, ctx, callback)
}
