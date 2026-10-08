async function optionsScript() {
  return { ok: true }
}

async function listGateOperations(input, libraries, ctx) {
  try {
    var request = (input && typeof input === 'object') ? input : {}
    var params = (request.params && typeof request.params === 'object') ? request.params : request
    var airport = String(params.airport || request.airport || 'DTW').trim().toUpperCase()
    if (airport && airport !== 'DTW') {
      throw new Error('Gate operations are only available for DTW')
    }

    var minuteMs = 60000
    var airlines = ['DL', 'WS', 'AF', 'KL']
    var aircraftTypes = ['A319', 'A321', 'B739', 'A333', 'A359', 'B752', 'E175']
    var cities = ['ATL', 'LAX', 'MSP', 'LGA', 'BOS', 'MCO', 'FLL', 'SEA', 'SLC', 'ORD', 'DFW', 'PHX', 'LAS', 'RDU', 'TPA', 'DCA', 'BWI', 'JFK', 'SFO', 'SAN']
    var phasesNormal = [
      { status: 'OPEN', minutes: 22 },
      { status: 'INBOUND', minutes: 8 },
      { status: 'ON_BLOCK', minutes: 12 },
      { status: 'TURNAROUND', minutes: 20 },
      { status: 'BOARDING', minutes: 18 },
      { status: 'DEPARTING', minutes: 8 }
    ]
    var phasesDelayed = [
      { status: 'OPEN', minutes: 18 },
      { status: 'INBOUND', minutes: 8 },
      { status: 'ON_BLOCK', minutes: 12 },
      { status: 'TURNAROUND', minutes: 16 },
      { status: 'DELAYED', minutes: 22 },
      { status: 'BOARDING', minutes: 12 },
      { status: 'DEPARTING', minutes: 8 }
    ]

    var IafItemSvc = libraries && libraries.PlatformApi && libraries.PlatformApi.IafItemSvc
    if (!IafItemSvc) throw new Error('Item Service is unavailable')

    var asList = function (result) {
      if (Array.isArray(result)) return result
      return (result && result._list) ? result._list : []
    }
    var propVal = function (properties, key) {
      var value = properties && properties[key]
      if (value == null) return null
      if (typeof value === 'object' && value.val != null) return value.val
      return value
    }
    var namedCollection = async function (userType) {
      var found = await IafItemSvc.getNamedUserItems({ query: { _userType: userType } }, ctx)
      return asList(found)[0] || null
    }
    var relatedIds = function (relations) {
      var ids = []
      var seen = {}
      for (var r = 0; r < relations.length; r += 1) {
        var toIds = relations[r]._relatedToIds || []
        for (var t = 0; t < toIds.length; t += 1) {
          if (!seen[toIds[t]]) {
            seen[toIds[t]] = true
            ids.push(toIds[t])
          }
        }
      }
      return ids
    }
    var toGateDef = function (item) {
      var properties = item.properties || {}
      return {
        id: item._name,
        concourse: String(propVal(properties, 'concourse') || ''),
        latitude: Number(propVal(properties, 'latitude')),
        longitude: Number(propVal(properties, 'longitude'))
      }
    }

    var gatesCollection = await namedCollection('world_view_gates')
    if (!gatesCollection || !gatesCollection._id) {
      var missingNow = Date.now ? Date.now() : new Date().getTime()
      return {
        available: false,
        time: Math.floor(missingNow / 1000),
        generatedAt: new Date(missingNow).toISOString(),
        attribution: '© OpenStreetMap contributors',
        airport: { icao: 'KDTW', iata: 'DTW', terminal: 'McNamara' },
        camera: null,
        summary: null,
        gates: []
      }
    }

    var sitesCollection = await namedCollection('world_view_sites')
    var gateItems = []
    try {
      if (sitesCollection && sitesCollection._id) {
        var sites = asList(await IafItemSvc.getRelatedItems(
          sitesCollection._id,
          { query: {} },
          ctx,
          { page: { _pageSize: 200, _offset: 0 } }
        ))
        var site = null
        for (var s = 0; s < sites.length; s += 1) {
          var siteName = String(sites[s]._name || '').toUpperCase()
          if (siteName.indexOf(airport) === 0) {
            site = sites[s]
            break
          }
        }
        if (site && site._id) {
          var relations = asList(await IafItemSvc.getRelations(
            sitesCollection._id,
            { query: { _relatedFromId: site._id } },
            ctx
          ))
          var gateItemIds = relatedIds(relations)
          if (gateItemIds.length > 0) {
            gateItems = asList(await IafItemSvc.getRelatedItems(
              gatesCollection._id,
              { query: { _id: { $in: gateItemIds } } },
              ctx,
              { page: { _pageSize: 1000, _offset: 0 }, sort: { _name: 1 } }
            ))
          }
        }
      }
    } catch (relErr) {
      gateItems = []
    }
    if (gateItems.length === 0) {
      gateItems = asList(await IafItemSvc.getRelatedItems(
        gatesCollection._id,
        { query: {} },
        ctx,
        { page: { _pageSize: 1000, _offset: 0 }, sort: { _name: 1 } }
      ))
    }

    var gateDefs = []
    for (var d = 0; d < gateItems.length; d += 1) {
      var def = toGateDef(gateItems[d])
      if (!def.id || !isFinite(def.latitude) || !isFinite(def.longitude)) continue
      gateDefs.push(def)
    }
    if (gateDefs.length === 0) {
      throw new Error('No gate items found for ' + airport)
    }

    var pad = function (n) {
      return n < 10 ? '0' + n : String(n)
    }
    var isoFrom = function (ms) {
      var date = new Date(Number(ms))
      return date.getUTCFullYear()
        + '-' + pad(date.getUTCMonth() + 1)
        + '-' + pad(date.getUTCDate())
        + 'T' + pad(date.getUTCHours())
        + ':' + pad(date.getUTCMinutes())
        + ':' + pad(date.getUTCSeconds())
        + 'Z'
    }
    var hash32 = function (text) {
      var hash = 2166136261
      var value = String(text)
      for (var i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i)
        hash = (hash * 16777619) | 0
      }
      return hash >>> 0
    }
    var cycleLengthMs = function (phases) {
      var sum = 0
      for (var i = 0; i < phases.length; i += 1) {
        sum += phases[i].minutes * minuteMs
      }
      return sum
    }
    var locatePhase = function (pos, phases) {
      var cursor = 0
      for (var i = 0; i < phases.length; i += 1) {
        var duration = phases[i].minutes * minuteMs
        if (pos < cursor + duration) {
          return phases[i]
        }
        cursor += duration
      }
      return phases[phases.length - 1]
    }
    var phaseStart = function (phases, status) {
      var cursor = 0
      for (var i = 0; i < phases.length; i += 1) {
        if (phases[i].status === status) return cursor
        cursor += phases[i].minutes * minuteMs
      }
      return 0
    }
    var nowMs = Date.now ? Date.now() : new Date().getTime()
    var summary = {
      open: 0,
      inbound: 0,
      onBlock: 0,
      turnaround: 0,
      boarding: 0,
      delayed: 0,
      departing: 0,
      closed: 0
    }
    var summaryKeys = {
      OPEN: 'open',
      INBOUND: 'inbound',
      ON_BLOCK: 'onBlock',
      TURNAROUND: 'turnaround',
      BOARDING: 'boarding',
      DELAYED: 'delayed',
      DEPARTING: 'departing',
      CLOSED: 'closed'
    }
    var gates = []
    for (var g = 0; g < gateDefs.length; g += 1) {
      var gate = gateDefs[g]
      var seed = hash32(gate.id)
      var closed = seed % 23 === 0
      var delayMinutes = seed % 8 === 0 ? 18 + (seed % 25) : 0
      var delayed = delayMinutes > 0
      var updatedAt = isoFrom(nowMs - (seed % 120000))
      var record
      if (closed) {
        record = {
          id: gate.id,
          concourse: gate.concourse,
          latitude: gate.latitude,
          longitude: gate.longitude,
          status: 'CLOSED',
          flight: null,
          scheduledArrival: null,
          estimatedArrival: null,
          scheduledDeparture: null,
          estimatedDeparture: null,
          delayMinutes: 0,
          updatedAt: updatedAt
        }
      } else {
        var phases = delayed ? phasesDelayed : phasesNormal
        var cycleMs = cycleLengthMs(phases)
        var offset = seed % cycleMs
        var pos = (nowMs + offset) % cycleMs
        var phase = locatePhase(pos, phases)
        var cycleStart = nowMs - pos
        var inboundAt = cycleStart + phaseStart(phases, 'INBOUND')
        var departAt = cycleStart + phaseStart(phases, 'DEPARTING')
        var estimatedDeparture = delayed ? departAt + delayMinutes * minuteMs : departAt
        var inbound = phase.status === 'OPEN' || phase.status === 'INBOUND'
        var airline = airlines[seed % airlines.length]
        var ident = airline + String(1000 + (seed % 8000))
        record = {
          id: gate.id,
          concourse: gate.concourse,
          latitude: gate.latitude,
          longitude: gate.longitude,
          status: phase.status,
          flight: {
            ident: ident,
            origin: inbound ? cities[(seed >>> 8) % cities.length] : 'DTW',
            destination: inbound ? 'DTW' : cities[(seed >>> 16) % cities.length],
            aircraft: aircraftTypes[(seed >>> 4) % aircraftTypes.length]
          },
          scheduledArrival: isoFrom(inboundAt),
          estimatedArrival: isoFrom(inboundAt),
          scheduledDeparture: isoFrom(departAt),
          estimatedDeparture: isoFrom(estimatedDeparture),
          delayMinutes: delayMinutes,
          updatedAt: updatedAt
        }
      }
      var key = summaryKeys[record.status]
      if (key) summary[key] += 1
      gates.push(record)
    }

    return {
      available: true,
      time: Math.floor(nowMs / 1000),
      generatedAt: isoFrom(nowMs),
      attribution: '© OpenStreetMap contributors',
      airport: { icao: 'KDTW', iata: 'DTW', terminal: 'McNamara' },
      camera: {
        latitude: 42.208611,
        longitude: -83.358367,
        heightMeters: 2800,
        headingDegrees: 28,
        pitchDegrees: -62
      },
      summary: summary,
      gates: gates
    }
  } catch (err) {
    var detail = err && err.message ? err.message : String(err)
    throw new Error('listGateOperations: ' + detail)
  }
}

const GATE_STATUS_VALUES = [
  'OPEN',
  'INBOUND',
  'ON_BLOCK',
  'TURNAROUND',
  'BOARDING',
  'DELAYED',
  'DEPARTING',
  'CLOSED'
]

function gateOpsParams(input) {
  const request = (input && typeof input === 'object') ? input : {}
  if (request.params && typeof request.params === 'object') return { ...request, ...request.params }
  return request
}

function asUpper(value) {
  return String(value ?? '').trim().toUpperCase()
}

function isDelayedOnly(value) {
  return value === true || value === 'true' || value === 1 || value === '1'
}

function summarizeGates(gates) {
  const summary = {
    open: 0,
    inbound: 0,
    onBlock: 0,
    turnaround: 0,
    boarding: 0,
    delayed: 0,
    departing: 0,
    closed: 0
  }
  const keys = {
    OPEN: 'open',
    INBOUND: 'inbound',
    ON_BLOCK: 'onBlock',
    TURNAROUND: 'turnaround',
    BOARDING: 'boarding',
    DELAYED: 'delayed',
    DEPARTING: 'departing',
    CLOSED: 'closed'
  }
  for (const gate of gates) {
    const key = keys[gate.status]
    if (key) summary[key] += 1
  }
  return summary
}

function filterGateRecords(gates, params) {
  const concourse = asUpper(params.concourse)
  const status = asUpper(params.status)
  const flightIdent = asUpper(params.flightIdent || params.flight)
  const origin = asUpper(params.origin)
  const destination = asUpper(params.destination)
  const delayedOnly = isDelayedOnly(params.delayedOnly)
  return gates.filter((gate) => {
    if (concourse && asUpper(gate.concourse) !== concourse) return false
    if (status && asUpper(gate.status) !== status) return false
    if (delayedOnly && !(Number(gate.delayMinutes) > 0)) return false
    if (flightIdent && asUpper(gate.flight?.ident).indexOf(flightIdent) === -1) return false
    if (origin && asUpper(gate.flight?.origin) !== origin) return false
    if (destination && asUpper(gate.flight?.destination) !== destination) return false
    return true
  })
}

async function gatedOperationsSnapshot(input, libraries, ctx) {
  const snapshot = await listGateOperations(input, libraries, ctx)
  if (snapshot.available === false) {
    return {
      available: false,
      time: snapshot.time,
      generatedAt: snapshot.generatedAt,
      attribution: snapshot.attribution,
      airport: snapshot.airport,
      camera: snapshot.camera,
      summary: null,
      matchCount: 0,
      gates: []
    }
  }
  const params = gateOpsParams(input)
  const gates = filterGateRecords(snapshot.gates || [], params)
  return {
    time: snapshot.time,
    generatedAt: snapshot.generatedAt,
    attribution: snapshot.attribution,
    airport: snapshot.airport,
    camera: snapshot.camera,
    summary: summarizeGates(gates),
    matchCount: gates.length,
    gates
  }
}

async function getGateOperations(input, libraries, ctx) {
  return gatedOperationsSnapshot(input, libraries, ctx)
}

async function getGateOperationsSummary(input, libraries, ctx) {
  const snapshot = await gatedOperationsSnapshot(input, libraries, ctx)
  return {
    time: snapshot.time,
    generatedAt: snapshot.generatedAt,
    airport: snapshot.airport,
    matchCount: snapshot.matchCount,
    summary: snapshot.summary
  }
}

async function getGate(input, libraries, ctx) {
  const params = gateOpsParams(input)
  const gateId = asUpper(params.gateId || params.id)
  if (!gateId) {
    throw new Error('gateId is required')
  }
  const snapshot = await listGateOperations(input, libraries, ctx)
  if (snapshot.available === false) {
    throw new Error('Gates collection is not deployed')
  }
  const gate = (snapshot.gates || []).find((item) => asUpper(item.id) === gateId)
  if (!gate) {
    throw new Error('Gate not found: ' + gateId)
  }
  return {
    generatedAt: snapshot.generatedAt,
    airport: snapshot.airport,
    gate
  }
}

async function queryGates(input, libraries, ctx) {
  const params = gateOpsParams(input)
  let limit = Number(params.limit)
  if (!Number.isFinite(limit) || limit <= 0) limit = 50
  if (limit > 200) limit = 200
  const snapshot = await gatedOperationsSnapshot(input, libraries, ctx)
  const status = asUpper(params.status)
  if (status && GATE_STATUS_VALUES.indexOf(status) === -1) {
    throw new Error('status must be one of ' + GATE_STATUS_VALUES.join(', '))
  }
  return {
    generatedAt: snapshot.generatedAt,
    airport: snapshot.airport,
    matchCount: snapshot.matchCount,
    returnedCount: Math.min(limit, snapshot.gates.length),
    summary: snapshot.summary,
    gates: snapshot.gates.slice(0, limit)
  }
}
