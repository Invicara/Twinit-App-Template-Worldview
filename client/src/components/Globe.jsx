import { useEffect, useRef, useState } from 'react'
import * as Cesium from 'cesium'
import 'cesium/Build/Cesium/Widgets/widgets.css'

import AircraftCallout from './AircraftCallout'
import GateOpsCallout from './GateOpsCallout'
import { DEFAULT_WORLD_VIEW_CONFIG } from '../services/worldViewConfig'
import SpaceCallout from './SpaceCallout'
import { gateStatusMeta } from '../services/gateOpsFormat'

const MARKER_COLOR = Cesium.Color.fromCssColorString('#5CFF9A')
const MARKER_INK = Cesium.Color.fromCssColorString('#070B0E')
const MARKER_PANEL = Cesium.Color.fromCssColorString('#0E161C').withAlpha(0.88)
const AIRCRAFT_COLOR = Cesium.Color.fromCssColorString('#D4A017')
const AIRCRAFT_TRAIL_COLOR = Cesium.Color.fromCssColorString('#D4A017')
const AIRCRAFT_TRAIL_MAX = 24
const AIRCRAFT_ICON_SIZE = 22
const AIRCRAFT_ICON_SELECTED_SCALE = 1.8
const SPACE_COLOR = Cesium.Color.fromCssColorString('#7ECBFF')
const SPACE_TRAIL_COLOR = Cesium.Color.fromCssColorString('#7ECBFF')
const SPACE_TRAIL_MAX = 48
const SPACE_TRAIL_MIN_MOVE_METERS = 2000
const SPACE_ICON_SIZE = 22
const SPACE_FOLLOW_RANGE_METERS = 420000
const SPACE_CLUSTER_METERS = 12000
const SPACE_VIEW_FROM = new Cesium.Cartesian3(-180000, -220000, 110000)
const CAMERA_HUD_MS = 120
const CAMERA_MIN_HEIGHT_METERS = 200
const TILE_CHECK_MS = 400
const TILESET_CACHE_BYTES = 1024 * 1024 * 1024
const TILE_APPROACH_MARGIN = 1.15
const TILE_APPROACH_MIN_SIN_PITCH = 0.35
// globe.getHeight samples whatever terrain tile happens to be resident, which
// from orbit can be a placeholder reading tens of km off (DTW returned -14784).
// Anything outside the real range of Earth's solid surface is a bad sample.
const MIN_SURFACE_HEIGHT_METERS = -500
const MAX_SURFACE_HEIGHT_METERS = 9000

function isPlausibleSurfaceHeight(height) {
  return Number.isFinite(height)
    && height >= MIN_SURFACE_HEIGHT_METERS
    && height <= MAX_SURFACE_HEIGHT_METERS
}

function surfaceHeightOrZero(height) {
  return isPlausibleSurfaceHeight(height) ? height : 0
}
const FLY_SECONDS = 2.2
const APPROACH_FLY_SECONDS = 1.6
const DESCENT_FLY_SECONDS = 1.6

function photorealisticTilesetOptions() {
  return {
    enableCollision: false,
    skipLevelOfDetail: true,
    immediatelyLoadDesiredLevelOfDetail: false,
    loadSiblings: false,
    foveatedScreenSpaceError: true,
    foveatedConeSize: 0.55,
    foveatedTimeDelay: 0.15,
    cullRequestsWhileMoving: true,
    dynamicScreenSpaceError: true,
    dynamicScreenSpaceErrorFactor: 16,
    maximumScreenSpaceError: 16
  }
}
const TRAIL_MIN_MOVE_METERS = 80
const SITE_OVER_TILES_METERS = 4.0e4
const SITE_LABEL_MAX_METERS = 7.5e5
const GATE_OVER_TILES_METERS = Number.POSITIVE_INFINITY
const GATE_SURFACE_FALLBACK_METERS = 200
const PAN_DRAG_PX = 5
const _clampCarto = new Cesium.Cartographic()
const _clampWorld = new Cesium.Cartesian3()
const _clampLocal = new Cesium.Cartesian3()
const _clampInverse = new Cesium.Matrix4()
const _panGrab = new Cesium.Cartesian3()
const _panDelta = new Cesium.Cartesian3()
const _panNext = new Cesium.Cartesian3()

let aircraftIconCanvas = null

function getAircraftIcon() {
  if (aircraftIconCanvas) return aircraftIconCanvas
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.translate(size / 2, size / 2)
  ctx.fillStyle = '#D4A017'
  ctx.strokeStyle = '#070B0E'
  ctx.lineWidth = 2.2
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(0, -26)
  ctx.lineTo(5, -8)
  ctx.lineTo(26, 4)
  ctx.lineTo(26, 10)
  ctx.lineTo(5, 4)
  ctx.lineTo(3, 16)
  ctx.lineTo(12, 22)
  ctx.lineTo(12, 26)
  ctx.lineTo(0, 20)
  ctx.lineTo(-12, 26)
  ctx.lineTo(-12, 22)
  ctx.lineTo(-3, 16)
  ctx.lineTo(-5, 4)
  ctx.lineTo(-26, 10)
  ctx.lineTo(-26, 4)
  ctx.lineTo(-5, -8)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  aircraftIconCanvas = canvas
  return canvas
}

let spaceIconCanvas = null

function getSpaceIcon() {
  if (spaceIconCanvas) return spaceIconCanvas
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.translate(size / 2, size / 2)
  ctx.fillStyle = '#7ECBFF'
  ctx.strokeStyle = '#070B0E'
  ctx.lineWidth = 2
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.rect(-7, -9, 14, 18)
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(-28, -6)
  ctx.lineTo(-10, -4)
  ctx.lineTo(-10, 4)
  ctx.lineTo(-28, 6)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(28, -6)
  ctx.lineTo(10, -4)
  ctx.lineTo(10, 4)
  ctx.lineTo(28, 6)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  spaceIconCanvas = canvas
  return canvas
}

function viewBounds(viewer) {
  const rectangle = viewer.camera.computeViewRectangle(viewer.scene.globe.ellipsoid)
  if (!rectangle) return null
  return {
    south: Cesium.Math.toDegrees(rectangle.south),
    west: Cesium.Math.toDegrees(rectangle.west),
    north: Cesium.Math.toDegrees(rectangle.north),
    east: Cesium.Math.toDegrees(rectangle.east)
  }
}

function readCameraTelemetry(viewer) {
  const cartesian = viewer.camera.positionWC
  if (!Cesium.defined(cartesian)) return null
  const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
  if (!Cesium.defined(cartographic)) return null

  return {
    latitude: Cesium.Math.toDegrees(cartographic.latitude),
    longitude: Cesium.Math.toDegrees(cartographic.longitude),
    heightMeters: cartographic.height,
    headingDegrees: Cesium.Math.toDegrees(viewer.camera.heading),
    pitchDegrees: Cesium.Math.toDegrees(viewer.camera.pitch),
    view: viewBounds(viewer)
  }
}

function cameraDestination(aim) {
  return {
    destination: Cesium.Cartesian3.fromDegrees(
      aim.longitude,
      aim.latitude,
      aim.heightMeters
    ),
    orientation: {
      heading: Cesium.Math.toRadians(aim.headingDegrees ?? 0),
      pitch: Number.isFinite(aim.pitchDegrees)
        ? Cesium.Math.toRadians(aim.pitchDegrees)
        : Cesium.Math.toRadians(-90),
      roll: 0
    }
  }
}

function detachLookAtKeepPose(camera) {
  if (Cesium.Matrix4.equalsEpsilon(camera.transform, Cesium.Matrix4.IDENTITY, Cesium.Math.EPSILON8)) {
    return
  }
  const position = Cesium.Cartesian3.clone(camera.positionWC)
  const direction = Cesium.Cartesian3.clone(camera.directionWC)
  const up = Cesium.Cartesian3.clone(camera.upWC)
  // `right` has to come along: camera.heading and camera.pitch rebuild the
  // basis from it, and a stale one makes both getters return garbage.
  const right = Cesium.Cartesian3.clone(camera.rightWC)
  camera.lookAtTransform(Cesium.Matrix4.IDENTITY)
  camera.position = position
  camera.direction = direction
  camera.up = up
  camera.right = right
}

function setGlobeCollision(viewer, enabled) {
  if (!viewer || viewer.isDestroyed()) return
  viewer.scene.screenSpaceCameraController.enableCollisionDetection = enabled
}

const SITE_VIEW_RANGE_METERS = 2600

function siteOrbitOffset(site) {
  const heading = Cesium.Math.toRadians(Number.isFinite(site.headingDegrees) ? site.headingDegrees : 0)
  const pitch = Cesium.Math.clamp(
    Cesium.Math.toRadians(Number.isFinite(site.pitchDegrees) ? site.pitchDegrees : -90),
    Cesium.Math.toRadians(-89),
    Cesium.Math.toRadians(-8)
  )
  return new Cesium.HeadingPitchRange(heading, pitch, SITE_VIEW_RANGE_METERS)
}

// Re-centers the orbit origin on a refined surface point. Omitting the offset
// makes lookAtTransform swap the reference frame while preserving the camera's
// world pose, so the camera cannot move: no range or pitch is recomputed.
function recenterOrbit(camera, target) {
  camera.lookAtTransform(Cesium.Transforms.eastNorthUpToFixedFrame(target))
}

function lookAtCartesian(camera, target, rangeOverride) {
  if (!Cesium.defined(target)) return
  const heading = camera.heading
  const pitch = Cesium.Math.clamp(camera.pitch, Cesium.Math.toRadians(-85), Cesium.Math.toRadians(-8))
  const range = Math.max(
    800,
    Number.isFinite(rangeOverride)
      ? rangeOverride
      : Cesium.Cartesian3.distance(camera.positionWC, target)
  )
  detachLookAtKeepPose(camera)
  camera.lookAt(target, new Cesium.HeadingPitchRange(heading, pitch, range))
}

function flyToLookAt(camera, target, offset, duration) {
  camera.cancelFlight()
  detachLookAtKeepPose(camera)
  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      resolve()
    }
    camera.flyToBoundingSphere(new Cesium.BoundingSphere(target, 1), {
      duration,
      offset,
      complete: finish,
      cancel: finish
    })
  })
}

// Approach range whose camera height stays above the 3D tile threshold, so the
// long leg of the flight runs on imagery alone. The pitch floor keeps shallow
// views from pulling the approach absurdly far back. Returns null when staging
// would not help — including when the camera is already inside the tile band,
// where climbing out and back would discard tiles that are already loaded.
function approachOffset(camera, offset, config) {
  const enableBelow = config?.tilesEnableHeightMeters
    ?? DEFAULT_WORLD_VIEW_CONFIG.tilesEnableHeightMeters
  const cartographic = Cesium.Cartographic.fromCartesian(camera.positionWC)
  if (!Cesium.defined(cartographic) || cartographic.height <= enableBelow) return null
  const sinPitch = Math.max(Math.abs(Math.sin(offset.pitch)), TILE_APPROACH_MIN_SIN_PITCH)
  const range = (enableBelow * TILE_APPROACH_MARGIN) / sinPitch
  if (range <= offset.range) return null
  return new Cesium.HeadingPitchRange(offset.heading, offset.pitch, range)
}

function flyToLookAtStaged(camera, target, offset, config, stillCurrent) {
  const approach = approachOffset(camera, offset, config)
  if (!approach) return flyToLookAt(camera, target, offset, FLY_SECONDS)
  return flyToLookAt(camera, target, approach, APPROACH_FLY_SECONDS).then(() => {
    if (stillCurrent && !stillCurrent()) return undefined
    return flyToLookAt(camera, target, offset, DESCENT_FLY_SECONDS)
  })
}

function captureOrbitRestore(camera, orbitRestoreRef) {
  if (orbitRestoreRef.current) return
  orbitRestoreRef.current = Cesium.Matrix4.clone(camera.transform)
}

function clampCameraAboveSurface(scene, minHeight = CAMERA_MIN_HEIGHT_METERS) {
  const camera = scene.camera
  const ellipsoid = scene.globe.ellipsoid
  const cartographic = ellipsoid.cartesianToCartographic(camera.positionWC, _clampCarto)
  if (!Cesium.defined(cartographic)) return

  let floor = minHeight
  const terrainHeight = scene.globe.getHeight(cartographic)
  if (isPlausibleSurfaceHeight(terrainHeight)) {
    floor = Math.max(floor, terrainHeight + minHeight)
  }
  if (cartographic.height >= floor) return

  cartographic.height = floor
  const clamped = ellipsoid.cartographicToCartesian(cartographic, _clampWorld)
  if (Cesium.Matrix4.equalsEpsilon(camera.transform, Cesium.Matrix4.IDENTITY, Cesium.Math.EPSILON8)) {
    camera.position = clamped
    return
  }
  const inverse = Cesium.Matrix4.inverseTransformation(camera.transform, _clampInverse)
  camera.position = Cesium.Matrix4.multiplyByPoint(inverse, clamped, _clampLocal)
}

function restoreOrbit(camera, orbitRestoreRef) {
  if (!orbitRestoreRef.current) return
  orbitRestoreRef.current = null
  detachLookAtKeepPose(camera)
}

function siteSurfaceCartesian(scene, site) {
  if (!Number.isFinite(site?.latitude) || !Number.isFinite(site?.longitude)) return null
  const carto = Cesium.Cartographic.fromDegrees(site.longitude, site.latitude)
  carto.height = surfaceHeightOrZero(scene?.globe?.getHeight(carto))
  return Cesium.Cartographic.toCartesian(carto)
}

async function sampleSiteCartesians(scene, sites) {
  const usable = sites.filter((site) => Number.isFinite(site.latitude) && Number.isFinite(site.longitude))
  const cartos = usable.map((site) => {
    const carto = Cesium.Cartographic.fromDegrees(site.longitude, site.latitude)
    carto.height = surfaceHeightOrZero(scene.globe.getHeight(carto))
    return carto
  })
  if (cartos.length > 0 && typeof scene.sampleHeightMostDetailed === 'function') {
    try {
      await scene.sampleHeightMostDetailed(cartos)
    } catch {
      // Keep globe / ellipsoid heights.
    }
  }
  const positions = new Map()
  usable.forEach((site, index) => {
    const carto = cartos[index]
    if (!carto || !isPlausibleSurfaceHeight(carto.height)) return
    positions.set(site.id, Cesium.Cartographic.toCartesian(carto))
  })
  return positions
}

function applySitePositions(dataSource, positions) {
  if (!dataSource) return
  for (const [id, cartesian] of positions) {
    const entity = dataSource.entities.getById(siteEntityId(id))
    if (entity) entity.position = cartesian
  }
}

function siteLookAtTarget(site, scene) {
  return siteSurfaceCartesian(scene, site)
}

function aircraftLookAtTarget(track) {
  if (!Number.isFinite(track?.latitude) || !Number.isFinite(track?.longitude)) return null
  const altitude = Number.isFinite(track.altitudeMeters) ? track.altitudeMeters : 8000
  return Cesium.Cartesian3.fromDegrees(track.longitude, track.latitude, altitude)
}

function applyNorthAmericaView(viewer, config) {
  const camera = config?.camera ?? DEFAULT_WORLD_VIEW_CONFIG.camera
  viewer.camera.setView(cameraDestination({
    longitude: camera.longitude,
    latitude: camera.latitude,
    heightMeters: camera.heightMeters,
    headingDegrees: camera.headingDegrees,
    pitchDegrees: camera.pitchDegrees
  }))
}

const ADDRESS_HEIGHT_METERS = 1500

function isGeocodeRectangle(value) {
  return Boolean(
    value
    && Number.isFinite(value.west)
    && Number.isFinite(value.south)
    && Number.isFinite(value.east)
    && Number.isFinite(value.north)
  )
}

function mapGeocodeHit(result, index) {
  const dest = result.destination
  const displayName = result.displayName || `HIT ${index + 1}`
  const id = `geo:${index}`

  if (isGeocodeRectangle(dest)) {
    const center = Cesium.Rectangle.center(dest)
    return {
      id,
      displayName,
      latitude: Cesium.Math.toDegrees(center.latitude),
      longitude: Cesium.Math.toDegrees(center.longitude),
      rectangle: {
        west: Cesium.Math.toDegrees(dest.west),
        south: Cesium.Math.toDegrees(dest.south),
        east: Cesium.Math.toDegrees(dest.east),
        north: Cesium.Math.toDegrees(dest.north)
      }
    }
  }

  const cartographic = Cesium.Cartographic.fromCartesian(dest)
  return {
    id,
    displayName,
    latitude: Cesium.Math.toDegrees(cartographic.latitude),
    longitude: Cesium.Math.toDegrees(cartographic.longitude),
    heightMeters: Math.max(cartographic.height, ADDRESS_HEIGHT_METERS)
  }
}

function flyCameraTo(camera, options) {
  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      resolve()
    }
    camera.flyTo({
      ...options,
      complete: finish,
      cancel: finish
    })
  })
}

function applyAimView(viewer, aim) {
  if (aim.rectangle && isGeocodeRectangle(aim.rectangle)) {
    const destination = Cesium.Rectangle.fromDegrees(
      aim.rectangle.west,
      aim.rectangle.south,
      aim.rectangle.east,
      aim.rectangle.north
    )
    if (aim.fly) {
      viewer.camera.flyTo({ destination, duration: 2.2 })
      return
    }
    viewer.camera.setView({ destination })
    return
  }

  const view = cameraDestination({
    ...aim,
    pitchDegrees: Number.isFinite(aim.pitchDegrees)
      ? aim.pitchDegrees
      : Cesium.Math.toDegrees(viewer.camera.pitch)
  })

  if (aim.fly) {
    viewer.camera.flyTo({ ...view, duration: 2.2 })
    return
  }

  viewer.camera.setView(view)
}

function compassLookAtTarget(viewer, {
  selectedSpaceRef,
  spaceDataSourceRef,
  selectedAircraftRef,
  aircraftRef,
  selectedSiteRef,
  sitesRef
}) {
  const tracked = viewer.trackedEntity
  if (Cesium.defined(tracked?.position)) {
    const target = tracked.position.getValue(viewer.clock.currentTime)
    if (Cesium.defined(target)) return { target, retrack: tracked }
  }

  if (!Cesium.Matrix4.equalsEpsilon(viewer.camera.transform, Cesium.Matrix4.IDENTITY, Cesium.Math.EPSILON8)) {
    return {
      target: Cesium.Matrix4.getTranslation(viewer.camera.transform, new Cesium.Cartesian3()),
      retrack: undefined
    }
  }

  const spaceId = selectedSpaceRef.current
  if (spaceId) {
    const entity = spaceDataSourceRef.current?.entities.getById(spaceEntityId(spaceId))
    const target = entity?.position?.getValue(viewer.clock.currentTime)
    if (Cesium.defined(target)) return { target, retrack: entity }
  }

  const icao24 = selectedAircraftRef.current
  if (icao24) {
    const track = aircraftRef.current.find((item) => item.icao24 === icao24)
    const target = aircraftLookAtTarget(track)
    if (target) return { target, retrack: undefined }
  }

  const siteId = selectedSiteRef.current
  if (siteId) {
    const site = sitesRef.current.find((item) => item.id === siteId)
    const target = siteLookAtTarget(site, viewer.scene)
    if (target) return { target, retrack: undefined }
  }

  return null
}

function applyCompassHeading(viewer, headingDegrees, ctx) {
  const camera = viewer.camera
  camera.cancelFlight()
  ctx.siteOrbitNonceRef.current += 1
  ctx.followNonceRef.current += 1

  const heading = Cesium.Math.toRadians(normalizeCompassHeading(headingDegrees))
  const pitch = camera.pitch
  const duration = 0.5
  const locked = compassLookAtTarget(viewer, ctx)

  if (locked?.target) {
    const range = Math.max(800, Cesium.Cartesian3.distance(camera.positionWC, locked.target))
    if (Cesium.defined(locked.retrack)) viewer.trackedEntity = undefined
    detachLookAtKeepPose(camera)
    camera.flyToBoundingSphere(new Cesium.BoundingSphere(locked.target, 1), {
      duration,
      offset: new Cesium.HeadingPitchRange(heading, pitch, range),
      complete: () => {
        if (viewer.isDestroyed()) return
        if (locked.retrack && ctx.selectedSpaceRef.current) {
          viewer.trackedEntity = locked.retrack
        }
      },
      cancel: () => {
        if (viewer.isDestroyed()) return
        if (locked.retrack && ctx.selectedSpaceRef.current) {
          viewer.trackedEntity = locked.retrack
        }
      }
    })
    return
  }

  camera.flyTo({
    destination: Cesium.Cartesian3.clone(camera.positionWC),
    orientation: { heading, pitch, roll: 0 },
    duration
  })
}

function normalizeCompassHeading(degrees) {
  if (!Number.isFinite(degrees)) return 0
  return ((degrees % 360) + 360) % 360
}

function throttleOnCamera(viewer, onTick, intervalMs) {
  let last = 0
  let timeout = null
  const run = () => {
    last = Date.now()
    timeout = null
    onTick()
  }
  const onChanged = () => {
    const wait = intervalMs - (Date.now() - last)
    if (wait <= 0) {
      run()
      return
    }
    if (!timeout) timeout = setTimeout(run, wait)
  }
  const removeChanged = viewer.camera.changed.addEventListener(onChanged)
  const removeEnd = viewer.camera.moveEnd.addEventListener(run)
  return () => {
    removeChanged()
    removeEnd()
    if (timeout) clearTimeout(timeout)
  }
}

function siteEntityId(siteId) {
  return `site:${siteId}`
}

function gateEntityId(gateId) {
  return `gate:${gateId}`
}

function gatePointColor(status) {
  return Cesium.Color.fromCssColorString(gateStatusMeta(status).color)
}

function gateSurfaceCartesian(scene, gate) {
  const latitude = Number(gate?.latitude)
  const longitude = Number(gate?.longitude)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  const carto = Cesium.Cartographic.fromDegrees(longitude, latitude)
  const globeHeight = scene?.globe?.getHeight(carto)
  carto.height = Number.isFinite(globeHeight) && globeHeight > 50
    ? globeHeight
    : GATE_SURFACE_FALLBACK_METERS
  return Cesium.Cartographic.toCartesian(carto)
}

function applyGatePositions(dataSource, positions) {
  if (!dataSource) return
  for (const [id, cartesian] of positions) {
    const entity = dataSource.entities.getById(gateEntityId(id))
    if (entity) entity.position = cartesian
  }
}

function syncGateEntities(dataSource, gates, selectedGateId, scene) {
  if (!dataSource) return
  dataSource.entities.removeAll()
  for (const gate of gates) {
    const latitude = Number(gate.latitude)
    const longitude = Number(gate.longitude)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue
    const selected = gate.id === selectedGateId
    const color = gatePointColor(gate.status)
    const position = gateSurfaceCartesian(scene, { latitude, longitude })
      ?? Cesium.Cartesian3.fromDegrees(longitude, latitude, GATE_SURFACE_FALLBACK_METERS)
    dataSource.entities.add({
      id: gateEntityId(gate.id),
      name: gate.id,
      position,
      point: {
        pixelSize: selected ? 18 : 14,
        color,
        outlineColor: MARKER_INK,
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.NONE,
        disableDepthTestDistance: GATE_OVER_TILES_METERS,
        scaleByDistance: new Cesium.NearFarScalar(600, 1.15, 3500, 0.75)
      },
      label: {
        text: String(gate.id),
        font: '12px "IBM Plex Mono", monospace',
        fillColor: color,
        showBackground: true,
        backgroundColor: MARKER_PANEL,
        pixelOffset: new Cesium.Cartesian2(0, -16),
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        heightReference: Cesium.HeightReference.NONE,
        disableDepthTestDistance: GATE_OVER_TILES_METERS,
        scaleByDistance: new Cesium.NearFarScalar(600, 1.05, 3500, 0.7)
      }
    })
  }
}

function applyGateSelection(dataSource, selectedGateId) {
  if (!dataSource) return
  dataSource.entities.values.forEach((entity) => {
    if (!entity.point) return
    const selected = entity.id === gateEntityId(selectedGateId)
    entity.point.pixelSize = selected ? 18 : 14
  })
}

function projectGateCallout(viewer, gate) {
  if (!viewer || viewer.isDestroyed() || !gate) return null
  if (!Number.isFinite(gate.latitude) || !Number.isFinite(gate.longitude)) return null
  const position = Cesium.Cartesian3.fromDegrees(gate.longitude, gate.latitude)
  const occluder = new Cesium.EllipsoidalOccluder(
    viewer.scene.globe.ellipsoid,
    viewer.camera.positionWC
  )
  if (!occluder.isPointVisible(position)) return null
  const windowPos = viewer.scene.cartesianToCanvasCoordinates(position)
  if (!Cesium.defined(windowPos)) return null
  return { x: Math.round(windowPos.x), y: Math.round(windowPos.y) }
}

const LABEL_LINE_PX = 26
const LABEL_BASE_Y = -18
const PAIR_GAP_X = 14

function siteCoordKey(site) {
  return `${site.latitude.toFixed(5)},${site.longitude.toFixed(5)}`
}

function clusterPlacementBySiteId(sites) {
  const groups = new Map()
  for (const site of sites) {
    if (!Number.isFinite(site.latitude) || !Number.isFinite(site.longitude)) continue
    const key = siteCoordKey(site)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(site.id)
  }

  const placement = new Map()
  for (const ids of groups.values()) {
    ids.forEach((id, index) => {
      placement.set(id, { index, size: ids.length })
    })
  }
  return placement
}

function labelPlacement(indexInCluster, clusterSize) {
  if (clusterSize === 2) {
    const isLeft = indexInCluster === 0
    return {
      pixelOffset: new Cesium.Cartesian2(isLeft ? -PAIR_GAP_X : PAIR_GAP_X, -10),
      horizontalOrigin: isLeft
        ? Cesium.HorizontalOrigin.RIGHT
        : Cesium.HorizontalOrigin.LEFT,
      verticalOrigin: Cesium.VerticalOrigin.CENTER
    }
  }

  if (clusterSize > 2) {
    return {
      pixelOffset: new Cesium.Cartesian2(0, LABEL_BASE_Y - indexInCluster * LABEL_LINE_PX),
      horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM
    }
  }

  return {
    pixelOffset: new Cesium.Cartesian2(0, -22),
    horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
    verticalOrigin: Cesium.VerticalOrigin.CENTER
  }
}

function suppressBrowserMenu(event) {
  event.preventDefault()
  event.stopPropagation()
}

function pickSurfacePosition(viewer, windowPosition) {
  const scene = viewer.scene
  let cartesian
  if (scene.pickPositionSupported) {
    cartesian = scene.pickPosition(windowPosition)
  }
  if (!Cesium.defined(cartesian)) {
    const ray = scene.camera.getPickRay(windowPosition)
    if (ray) cartesian = scene.globe.pick(ray, scene)
  }
  if (!Cesium.defined(cartesian)) {
    cartesian = scene.camera.pickEllipsoid(windowPosition, scene.globe.ellipsoid)
  }
  return cartesian
}

function pickGlobePosition(viewer, windowPosition) {
  const scene = viewer.scene
  const ray = scene.camera.getPickRay(windowPosition)
  if (ray) {
    const cartesian = scene.globe.pick(ray, scene)
    if (Cesium.defined(cartesian)) return cartesian
  }
  return scene.camera.pickEllipsoid(windowPosition, scene.globe.ellipsoid)
}

function panCameraToGrab(viewer, grab, windowPosition) {
  const picked = pickGlobePosition(viewer, windowPosition)
  if (!Cesium.defined(picked)) return
  Cesium.Cartesian3.subtract(grab, picked, _panDelta)
  Cesium.Cartesian3.add(viewer.camera.position, _panDelta, _panNext)
  viewer.camera.position = _panNext
}

function syncSiteEntities(dataSource, sites, scene) {
  dataSource.entities.removeAll()
  const placement = clusterPlacementBySiteId(sites)

  sites.forEach((site) => {
    if (!Number.isFinite(site.latitude) || !Number.isFinite(site.longitude)) return

    const cluster = placement.get(site.id) ?? { index: 0, size: 1 }
    const labelLayout = labelPlacement(cluster.index, cluster.size)
    const position = siteSurfaceCartesian(scene, site)
      ?? Cesium.Cartesian3.fromDegrees(site.longitude, site.latitude)

    dataSource.entities.add({
      id: siteEntityId(site.id),
      name: site.name,
      position,
      point: {
        pixelSize: 14,
        color: MARKER_COLOR,
        outlineColor: MARKER_INK,
        outlineWidth: 2,
        heightReference: Cesium.HeightReference.NONE,
        disableDepthTestDistance: SITE_OVER_TILES_METERS,
        scaleByDistance: new Cesium.NearFarScalar(1.0e3, 1.2, 2.0e7, 0.45)
      },
      label: {
        text: String(site.name || '').toUpperCase(),
        font: '12px "IBM Plex Mono", monospace',
        fillColor: MARKER_COLOR,
        showBackground: true,
        backgroundColor: MARKER_PANEL,
        pixelOffset: labelLayout.pixelOffset,
        horizontalOrigin: labelLayout.horizontalOrigin,
        verticalOrigin: labelLayout.verticalOrigin,
        heightReference: Cesium.HeightReference.NONE,
        disableDepthTestDistance: SITE_OVER_TILES_METERS,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, SITE_LABEL_MAX_METERS),
        scaleByDistance: new Cesium.NearFarScalar(1.0e3, 1.0, 2.0e7, 0.35)
      }
    })
  })
}

function aircraftEntityId(icao24) {
  return `ac:${icao24}`
}

function aircraftTrailId(icao24) {
  return `ac-trail:${icao24}`
}

function headingFromTrail(fromCartesian, toCartesian) {
  const from = Cesium.Cartographic.fromCartesian(fromCartesian)
  const to = Cesium.Cartographic.fromCartesian(toCartesian)
  const dLon = to.longitude - from.longitude
  const y = Math.sin(dLon) * Math.cos(to.latitude)
  const x = Math.cos(from.latitude) * Math.sin(to.latitude)
    - Math.sin(from.latitude) * Math.cos(to.latitude) * Math.cos(dLon)
  if (Math.abs(x) < 1e-12 && Math.abs(y) < 1e-12) return null
  return Cesium.Math.toDegrees(Math.atan2(y, x))
}

function aircraftHeadingDegrees(track, history) {
  if (history.length >= 2) {
    const fromTrail = headingFromTrail(history[history.length - 2], history[history.length - 1])
    if (Number.isFinite(fromTrail)) return fromTrail
  }
  return Number.isFinite(track.headingDegrees) ? track.headingDegrees : 0
}

function aircraftBillboardScale(selected) {
  return selected ? AIRCRAFT_ICON_SELECTED_SCALE : 1
}

function applyAircraftSelection(dataSource, selectedIcao24) {
  if (!dataSource) return
  dataSource.entities.values.forEach((entity) => {
    if (!entity.billboard) return
    const selected = entity.id === aircraftEntityId(selectedIcao24)
    entity.billboard.scale = aircraftBillboardScale(selected)
  })
}

function projectAircraftCallout(viewer, track) {
  if (!viewer || viewer.isDestroyed() || !track) return null
  if (!Number.isFinite(track.latitude) || !Number.isFinite(track.longitude)) return null
  const altitude = Number.isFinite(track.altitudeMeters) ? track.altitudeMeters : 8000
  const position = Cesium.Cartesian3.fromDegrees(track.longitude, track.latitude, altitude)
  const occluder = new Cesium.EllipsoidalOccluder(
    viewer.scene.globe.ellipsoid,
    viewer.camera.positionWC
  )
  if (!occluder.isPointVisible(position)) return null
  const windowPos = viewer.scene.cartesianToCanvasCoordinates(position)
  if (!Cesium.defined(windowPos)) return null
  return { x: Math.round(windowPos.x), y: Math.round(windowPos.y) }
}

function syncAircraftEntities(dataSource, trailCollection, aircraft, trailMap, selectedIcao24) {
  dataSource.entities.removeAll()
  trailCollection.removeAll()
  const seen = new Set()

  aircraft.forEach((track) => {
    if (!Number.isFinite(track.latitude) || !Number.isFinite(track.longitude)) return
    const altitude = Number.isFinite(track.altitudeMeters) ? track.altitudeMeters : 8000
    const position = Cesium.Cartesian3.fromDegrees(track.longitude, track.latitude, altitude)
    const history = trailMap.get(track.icao24) ?? []
    const previous = history[history.length - 1]
    if (!previous || Cesium.Cartesian3.distance(previous, position) >= TRAIL_MIN_MOVE_METERS) {
      history.push(Cesium.Cartesian3.clone(position))
      if (history.length > AIRCRAFT_TRAIL_MAX) history.shift()
      trailMap.set(track.icao24, history)
    }
    seen.add(track.icao24)

    const heading = aircraftHeadingDegrees(track, history)
    const selected = track.icao24 === selectedIcao24
    dataSource.entities.add({
      id: aircraftEntityId(track.icao24),
      name: track.callsign,
      position,
      billboard: {
        image: getAircraftIcon(),
        width: AIRCRAFT_ICON_SIZE,
        height: AIRCRAFT_ICON_SIZE,
        scale: aircraftBillboardScale(selected),
        // Image nose is canvas-up. UNIT_Z aligns image-up to north; Cesium rotation is CCW.
        rotation: -Cesium.Math.toRadians(heading),
        alignedAxis: Cesium.Cartesian3.UNIT_Z,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: new Cesium.NearFarScalar(1.0e4, 1.25, 8.0e6, 0.4)
      },
      label: {
        text: String(track.callsign || track.icao24 || '').toUpperCase(),
        font: '11px "IBM Plex Mono", monospace',
        fillColor: AIRCRAFT_COLOR,
        showBackground: true,
        backgroundColor: MARKER_PANEL,
        pixelOffset: new Cesium.Cartesian2(0, -20),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 1.6e6),
        scaleByDistance: new Cesium.NearFarScalar(1.0e4, 1.0, 1.5e6, 0.4)
      }
    })

    if (history.length > 1) {
      trailCollection.add({
        id: aircraftTrailId(track.icao24),
        positions: history.map((point) => Cesium.Cartesian3.clone(point)),
        width: 4,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        material: Cesium.Material.fromType('PolylineGlow', {
          color: AIRCRAFT_TRAIL_COLOR,
          glowPower: 0.2,
          taperPower: 0.45
        })
      })
    }
  })

  for (const icao24 of [...trailMap.keys()]) {
    if (!seen.has(icao24)) trailMap.delete(icao24)
  }
}

function spaceEntityId(id) {
  return `space:${id}`
}

function spaceTrailId(id) {
  return `space-trail:${id}`
}

function spaceBillboardScale(selected) {
  return selected ? AIRCRAFT_ICON_SELECTED_SCALE : 1
}

function spacePositionCartesian(track) {
  const altitude = Number.isFinite(track.altitudeMeters) ? track.altitudeMeters : 400000
  return Cesium.Cartesian3.fromDegrees(track.longitude, track.latitude, altitude)
}

function clusterSpaceTracks(tracks) {
  const clusters = []
  const assigned = new Set()
  for (const track of tracks) {
    if (assigned.has(track.id)) continue
    if (!Number.isFinite(track.latitude) || !Number.isFinite(track.longitude)) continue
    const origin = spacePositionCartesian(track)
    const group = [track]
    assigned.add(track.id)
    for (const other of tracks) {
      if (assigned.has(other.id)) continue
      if (!Number.isFinite(other.latitude) || !Number.isFinite(other.longitude)) continue
      if (Cesium.Cartesian3.distance(origin, spacePositionCartesian(other)) <= SPACE_CLUSTER_METERS) {
        group.push(other)
        assigned.add(other.id)
      }
    }
    clusters.push(group)
  }
  return clusters
}

function pickSpaceClusterAnchor(group, selectedId) {
  const selected = group.find((track) => track.id === selectedId)
  if (selected) return selected
  const zarya = group.find((track) => /^ISS \(ZARYA\)$/i.test(track.name))
  if (zarya) return zarya
  const tianhe = group.find((track) => /^CSS \(TIANHE\)$/i.test(track.name))
  if (tianhe) return tianhe
  const station = group.find((track) => /^(ISS|CSS)\b/i.test(track.name))
  if (station) return station
  return group[0]
}

function spaceClusterAppearance(tracks, selectedId) {
  const appearance = new Map()
  for (const group of clusterSpaceTracks(tracks)) {
    const anchor = pickSpaceClusterAnchor(group, selectedId)
    for (const track of group) {
      appearance.set(track.id, {
        anchor: track.id === anchor.id,
        show: track.id === anchor.id || track.id === selectedId,
        label: track.id === anchor.id && track.id !== selectedId,
        selected: track.id === selectedId
      })
    }
  }
  return appearance
}

function applySpaceAppearance(dataSource, tracks, selectedId) {
  if (!dataSource) return
  const appearance = spaceClusterAppearance(tracks, selectedId)
  dataSource.entities.values.forEach((entity) => {
    if (!entity.id?.startsWith('space:')) return
    const next = appearance.get(entity.id.slice(6))
    if (!next) return
    if (entity.billboard) {
      entity.billboard.show = next.show
      entity.billboard.scale = spaceBillboardScale(next.selected)
    }
    if (entity.label) entity.label.show = next.label
  })
}

function projectSpaceCallout(viewer, track) {
  if (!viewer || viewer.isDestroyed() || !track) return null
  if (!Number.isFinite(track.latitude) || !Number.isFinite(track.longitude)) return null
  const altitude = Number.isFinite(track.altitudeMeters) ? track.altitudeMeters : 400000
  const position = Cesium.Cartesian3.fromDegrees(track.longitude, track.latitude, altitude)
  const occluder = new Cesium.EllipsoidalOccluder(
    viewer.scene.globe.ellipsoid,
    viewer.camera.positionWC
  )
  if (!occluder.isPointVisible(position)) return null
  const windowPos = Cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, position)
  if (!Cesium.defined(windowPos)) return null
  return { x: Math.round(windowPos.x), y: Math.round(windowPos.y) }
}

function syncSpaceEntities(dataSource, trailCollection, tracks, trailMap, positionMap, selectedId) {
  trailCollection.removeAll()
  const seen = new Set()
  const appearance = spaceClusterAppearance(tracks, selectedId)

  tracks.forEach((track) => {
    if (!Number.isFinite(track.latitude) || !Number.isFinite(track.longitude)) return
    const position = spacePositionCartesian(track)
    positionMap.set(track.id, position)
    const history = trailMap.get(track.id) ?? []
    const previous = history[history.length - 1]
    if (!previous || Cesium.Cartesian3.distance(previous, position) >= SPACE_TRAIL_MIN_MOVE_METERS) {
      history.push(Cesium.Cartesian3.clone(position))
      if (history.length > SPACE_TRAIL_MAX) history.shift()
      trailMap.set(track.id, history)
    }
    seen.add(track.id)

    const heading = aircraftHeadingDegrees(track, history)
    const look = appearance.get(track.id) ?? {
      show: true,
      label: true,
      selected: track.id === selectedId,
      anchor: true
    }
    const labelText = String(track.name || track.id || '').toUpperCase()
    const id = spaceEntityId(track.id)
    let entity = dataSource.entities.getById(id)
    if (!entity) {
      const trackId = track.id
      entity = dataSource.entities.add({
        id,
        name: track.name,
        position: new Cesium.CallbackProperty(() => positionMap.get(trackId), false),
        viewFrom: SPACE_VIEW_FROM,
        billboard: {
          image: getSpaceIcon(),
          width: SPACE_ICON_SIZE,
          height: SPACE_ICON_SIZE,
          show: look.show,
          scale: spaceBillboardScale(look.selected),
          rotation: -Cesium.Math.toRadians(heading),
          alignedAxis: Cesium.Cartesian3.UNIT_Z,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new Cesium.NearFarScalar(1.0e5, 1.2, 2.0e7, 0.45)
        },
        label: {
          text: labelText,
          font: '11px "IBM Plex Mono", monospace',
          fillColor: SPACE_COLOR,
          show: look.label,
          showBackground: true,
          backgroundColor: MARKER_PANEL,
          pixelOffset: new Cesium.Cartesian2(0, -20),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 2.4e7),
          scaleByDistance: new Cesium.NearFarScalar(1.0e5, 1.0, 1.8e7, 0.4)
        }
      })
    } else {
      entity.name = track.name
      if (entity.billboard) {
        entity.billboard.show = look.show
        entity.billboard.rotation = -Cesium.Math.toRadians(heading)
        entity.billboard.scale = spaceBillboardScale(look.selected)
      }
      if (entity.label) {
        const currentText = entity.label.text?.getValue?.(Cesium.JulianDate.now())
        if (currentText !== labelText) entity.label.text = labelText
        entity.label.show = look.label
      }
    }

    if (look.anchor && history.length > 1) {
      trailCollection.add({
        id: spaceTrailId(track.id),
        positions: history.map((point) => Cesium.Cartesian3.clone(point)),
        width: 3,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        material: Cesium.Material.fromType('PolylineGlow', {
          color: SPACE_TRAIL_COLOR,
          glowPower: 0.22,
          taperPower: 0.4
        })
      })
    }
  })

  for (const entity of [...dataSource.entities.values]) {
    if (!entity.id?.startsWith('space:')) continue
    const trackId = entity.id.slice(6)
    if (!seen.has(trackId)) {
      dataSource.entities.remove(entity)
      positionMap.delete(trackId)
    }
  }
  for (const id of [...trailMap.keys()]) {
    if (!seen.has(id)) trailMap.delete(id)
  }
}

export default function Globe({
  config,
  onCameraChange,
  resetNonce = 0,
  aim = null,
  compassHeading = null,
  geocodeRequest = null,
  onGeocodeResults,
  sites = [],
  sitesVisible = true,
  aircraft = [],
  aircraftVisible = false,
  selectedAircraftIcao24 = null,
  selectedSiteId = null,
  spaceTracks = [],
  spaceVisible = false,
  selectedSpaceId = null,
  gates = [],
  gatesVisible = false,
  selectedGateId = null,
  gateOpsOpen = false,
  onSelectSite,
  onSelectAircraft,
  onSelectSpace,
  onSelectGate,
  onCloseGateOps,
  onRequestSaveSite
}) {
  const containerRef = useRef(null)
  const viewerRef = useRef(null)
  const geocoderRef = useRef(null)
  const tilesetRef = useRef(null)
  const loadingTilesRef = useRef(false)
  const sitesDataSourceRef = useRef(null)
  const gatesDataSourceRef = useRef(null)
  const aircraftDataSourceRef = useRef(null)
  const aircraftTrailPrimitiveRef = useRef(null)
  const aircraftTrailRef = useRef(new Map())
  const spaceDataSourceRef = useRef(null)
  const spaceTrailPrimitiveRef = useRef(null)
  const spaceTrailRef = useRef(new Map())
  const spacePositionRef = useRef(new Map())
  const followNonceRef = useRef(0)
  const siteOrbitNonceRef = useRef(0)
  const orbitRestoreRef = useRef(null)
  const onCameraChangeRef = useRef(onCameraChange)
  const onGeocodeResultsRef = useRef(onGeocodeResults)
  const onSelectSiteRef = useRef(onSelectSite)
  const onSelectAircraftRef = useRef(onSelectAircraft)
  const onSelectSpaceRef = useRef(onSelectSpace)
  const onSelectGateRef = useRef(onSelectGate)
  const onCloseGateOpsRef = useRef(onCloseGateOps)
  const onRequestSaveSiteRef = useRef(onRequestSaveSite)
  const sitesRef = useRef(sites)
  const aircraftRef = useRef(aircraft)
  const selectedAircraftRef = useRef(selectedAircraftIcao24)
  const selectedSiteRef = useRef(selectedSiteId)
  const spaceTracksRef = useRef(spaceTracks)
  const selectedSpaceRef = useRef(selectedSpaceId)
  const gatesRef = useRef(gates)
  const selectedGateRef = useRef(selectedGateId)
  const gatesVisibleRef = useRef(gatesVisible)
  const gateOpsOpenRef = useRef(gateOpsOpen)
  const configRef = useRef(config)
  const calloutPosRef = useRef(null)
  const [calloutPos, setCalloutPos] = useState(null)

  onCameraChangeRef.current = onCameraChange
  onGeocodeResultsRef.current = onGeocodeResults
  onSelectSiteRef.current = onSelectSite
  onSelectAircraftRef.current = onSelectAircraft
  onSelectSpaceRef.current = onSelectSpace
  onSelectGateRef.current = onSelectGate
  onCloseGateOpsRef.current = onCloseGateOps
  onRequestSaveSiteRef.current = onRequestSaveSite
  sitesRef.current = sites
  aircraftRef.current = aircraft
  selectedAircraftRef.current = selectedAircraftIcao24
  selectedSiteRef.current = selectedSiteId
  spaceTracksRef.current = spaceTracks
  selectedSpaceRef.current = selectedSpaceId
  gatesRef.current = gates
  selectedGateRef.current = selectedGateId
  gatesVisibleRef.current = gatesVisible
  gateOpsOpenRef.current = gateOpsOpen
  configRef.current = config

  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined

    const ionToken = import.meta.env.VITE_CESIUM_ION_TOKEN
    Cesium.Ion.defaultAccessToken = ionToken || ''

    const viewer = new Cesium.Viewer(container, {
      animation: false,
      timeline: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      sceneModePicker: false,
      selectionIndicator: false,
      navigationHelpButton: false,
      baseLayerPicker: false,
      terrain: ionToken ? Cesium.Terrain.fromWorldTerrain() : undefined,
      baseLayer: new Cesium.ImageryLayer(
        new Cesium.UrlTemplateImageryProvider({
          url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          maximumLevel: 19,
          credit: 'Esri, Maxar, Earthstar Geographics'
        })
      )
    })

    if (viewer.cesiumWidget.creditContainer) {
      viewer.cesiumWidget.creditContainer.style.display = 'none'
    }
    viewer.scene.globe.enableLighting = true
    viewer.scene.fog.enabled = true
    viewer.scene.skyAtmosphere.show = true
    viewer.scene.globe.atmosphereLightIntensity = 20
    viewer.scene.globe.showGroundAtmosphere = true
    viewer.scene.globe.depthTestAgainstTerrain = false
    viewer.scene.globe.maximumScreenSpaceError = 4
    viewer.scene.globe.tileCacheSize = 200
    viewer.scene.globe.preloadSiblings = true
    viewer.scene.globe.preloadFlightDestinations = true
    viewer.scene.screenSpaceCameraController.minimumZoomDistance = CAMERA_MIN_HEIGHT_METERS
    viewer.scene.screenSpaceCameraController.enableCollisionDetection = true
    viewer.scene.screenSpaceCameraController.zoomEventTypes = [
      Cesium.CameraEventType.WHEEL,
      Cesium.CameraEventType.PINCH
    ]

    const sitesDataSource = new Cesium.CustomDataSource('sites')
    viewer.dataSources.add(sitesDataSource)
    sitesDataSourceRef.current = sitesDataSource
    syncSiteEntities(sitesDataSource, sitesRef.current, viewer.scene)
    sitesDataSource.show = sitesVisible

    const gatesDataSource = new Cesium.CustomDataSource('gates')
    viewer.dataSources.add(gatesDataSource)
    gatesDataSourceRef.current = gatesDataSource
    syncGateEntities(gatesDataSource, [], null, viewer.scene)
    gatesDataSource.show = false

    const aircraftDataSource = new Cesium.CustomDataSource('aircraft')
    viewer.dataSources.add(aircraftDataSource)
    aircraftDataSourceRef.current = aircraftDataSource
    const trailCollection = viewer.scene.primitives.add(new Cesium.PolylineCollection())
    aircraftTrailPrimitiveRef.current = trailCollection
    syncAircraftEntities(
      aircraftDataSource,
      trailCollection,
      aircraftRef.current,
      aircraftTrailRef.current,
      selectedAircraftRef.current
    )
    aircraftDataSource.show = aircraftVisible
    trailCollection.show = aircraftVisible

    const spaceDataSource = new Cesium.CustomDataSource('space')
    viewer.dataSources.add(spaceDataSource)
    spaceDataSourceRef.current = spaceDataSource
    const spaceTrails = viewer.scene.primitives.add(new Cesium.PolylineCollection())
    spaceTrailPrimitiveRef.current = spaceTrails
    syncSpaceEntities(
      spaceDataSource,
      spaceTrails,
      spaceTracksRef.current,
      spaceTrailRef.current,
      spacePositionRef.current,
      selectedSpaceRef.current
    )
    spaceDataSource.show = spaceVisible
    spaceTrails.show = spaceVisible

    applyNorthAmericaView(viewer, config)
    viewerRef.current = viewer
    geocoderRef.current = ionToken
      ? new Cesium.IonGeocoderService({
        scene: viewer.scene,
        accessToken: ionToken,
        geocodeProviderType: Cesium.IonGeocodeProviderType.GOOGLE
      })
      : null

    const publishTelemetry = () => {
      const telemetry = readCameraTelemetry(viewer)
      if (telemetry) onCameraChangeRef.current?.(telemetry)
    }

    publishTelemetry()
    const removeCameraListener = throttleOnCamera(viewer, publishTelemetry, CAMERA_HUD_MS)

    const publishCallout = () => {
      const spaceId = selectedSpaceRef.current
      const spaceTrack = spaceId
        ? spaceTracksRef.current.find((item) => item.id === spaceId)
        : null
      if (spaceDataSource.show && spaceTrack) {
        const next = projectSpaceCallout(viewer, spaceTrack)
        const prev = calloutPosRef.current
        if (!next && !prev) return
        if (next && prev && next.x === prev.x && next.y === prev.y) return
        calloutPosRef.current = next
        setCalloutPos(next)
        return
      }
      const gateId = selectedGateRef.current
      const gate = gateId && gatesVisibleRef.current
        ? gatesRef.current.find((item) => item.id === gateId)
        : null
      if (gate) {
        const next = projectGateCallout(viewer, gate)
        const prev = calloutPosRef.current
        if (!next && !prev) return
        if (next && prev && next.x === prev.x && next.y === prev.y) return
        calloutPosRef.current = next
        setCalloutPos(next)
        return
      }
      const icao24 = selectedAircraftRef.current
      const track = icao24
        ? aircraftRef.current.find((item) => item.icao24 === icao24)
        : null
      const next = aircraftDataSource.show && track
        ? projectAircraftCallout(viewer, track)
        : null
      const prev = calloutPosRef.current
      if (!next && !prev) return
      if (next && prev && next.x === prev.x && next.y === prev.y) return
      calloutPosRef.current = next
      setCalloutPos(next)
    }
    const removeCalloutListener = viewer.scene.postRender.addEventListener(publishCallout)
    const removeUndergroundClamp = viewer.scene.preRender.addEventListener(() => {
      clampCameraAboveSurface(viewer.scene, CAMERA_MIN_HEIGHT_METERS)
    })

    container.addEventListener('contextmenu', suppressBrowserMenu, true)
    viewer.scene.canvas.addEventListener('contextmenu', suppressBrowserMenu, true)

    const pan = {
      active: false,
      dragged: false,
      startX: 0,
      startY: 0
    }
    const canvas = viewer.scene.canvas
    const endPan = () => {
      pan.active = false
      canvas.style.cursor = ''
    }

    viewer.screenSpaceEventHandler.setInputAction((click) => {
      const grabbed = pickGlobePosition(viewer, click.position)
      if (!Cesium.defined(grabbed)) {
        endPan()
        return
      }
      Cesium.Cartesian3.clone(grabbed, _panGrab)
      pan.active = true
      pan.dragged = false
      pan.startX = click.position.x
      pan.startY = click.position.y
    }, Cesium.ScreenSpaceEventType.RIGHT_DOWN)

    viewer.screenSpaceEventHandler.setInputAction((movement) => {
      if (!pan.active) return
      const dx = movement.endPosition.x - pan.startX
      const dy = movement.endPosition.y - pan.startY
      if (!pan.dragged && (dx * dx + dy * dy) < PAN_DRAG_PX * PAN_DRAG_PX) return
      if (!pan.dragged) {
        detachLookAtKeepPose(viewer.camera)
        viewer.trackedEntity = undefined
      }
      pan.dragged = true
      canvas.style.cursor = 'grabbing'
      panCameraToGrab(viewer, _panGrab, movement.endPosition)
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

    viewer.screenSpaceEventHandler.setInputAction(endPan, Cesium.ScreenSpaceEventType.RIGHT_UP)
    window.addEventListener('mouseup', endPan)

    viewer.screenSpaceEventHandler.setInputAction((click) => {
      const picked = viewer.scene.pick(click.position)
      const entity = picked?.id
      const entityId = typeof entity?.id === 'string' ? entity.id : null
      if (entityId?.startsWith('space:')) {
        const spaceId = entityId.slice(6)
        const track = spaceTracksRef.current.find((item) => item.id === spaceId)
        if (track) onSelectSpaceRef.current?.(track)
        return
      }
      if (entityId?.startsWith('ac:')) {
        const icao24 = entityId.slice(3)
        const track = aircraftRef.current.find((item) => item.icao24 === icao24)
        if (track) onSelectAircraftRef.current?.(track)
        return
      }
      if (entityId?.startsWith('gate:')) {
        const gateId = entityId.slice(5)
        const gate = gatesRef.current.find((item) => item.id === gateId)
        if (gate) onSelectGateRef.current?.(gate)
        return
      }
      if (entityId?.startsWith('site:')) {
        const site = sitesRef.current.find((item) => siteEntityId(item.id) === entityId)
        if (site) onSelectSiteRef.current?.(site)
        return
      }
      if (gatesVisibleRef.current || gateOpsOpenRef.current) {
        onSelectGateRef.current?.(null)
        return
      }
      onSelectSiteRef.current?.(null)
      onSelectAircraftRef.current?.(null)
      onSelectSpaceRef.current?.(null)
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    viewer.screenSpaceEventHandler.setInputAction((click) => {
      if (pan.dragged) return
      const cartesian = pickSurfacePosition(viewer, click.position)
      if (!cartesian) return

      const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
      const telemetry = readCameraTelemetry(viewer)
      onRequestSaveSiteRef.current?.({
        latitude: Cesium.Math.toDegrees(cartographic.latitude),
        longitude: Cesium.Math.toDegrees(cartographic.longitude),
        heightMeters: telemetry?.heightMeters,
        headingDegrees: telemetry?.headingDegrees,
        pitchDegrees: telemetry?.pitchDegrees
      })
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK)

    return () => {
      removeCameraListener()
      removeCalloutListener()
      removeUndergroundClamp()
      calloutPosRef.current = null
      setCalloutPos(null)
      window.removeEventListener('mouseup', endPan)
      canvas.style.cursor = ''
      container.removeEventListener('contextmenu', suppressBrowserMenu, true)
      viewer.scene.canvas.removeEventListener('contextmenu', suppressBrowserMenu, true)
      tilesetRef.current = null
      loadingTilesRef.current = false
      sitesDataSourceRef.current = null
      aircraftDataSourceRef.current = null
      const trails = aircraftTrailPrimitiveRef.current
      if (trails && !trails.isDestroyed?.()) {
        viewer.scene.primitives.remove(trails)
      }
      aircraftTrailPrimitiveRef.current = null
      aircraftTrailRef.current = new Map()
      spaceDataSourceRef.current = null
      const spaceTrails = spaceTrailPrimitiveRef.current
      if (spaceTrails && !spaceTrails.isDestroyed?.()) {
        viewer.scene.primitives.remove(spaceTrails)
      }
      spaceTrailPrimitiveRef.current = null
      spaceTrailRef.current = new Map()
      spacePositionRef.current = new Map()
      geocoderRef.current = null
      viewer.destroy()
      viewerRef.current = null
    }
    // Viewer is created once; camera defaults apply on first paint.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const viewer = viewerRef.current
    const dataSource = sitesDataSourceRef.current
    if (!dataSource) return
    syncSiteEntities(dataSource, sites, viewer?.scene)
    dataSource.show = sitesVisible
    if (viewer && !viewer.isDestroyed()) {
      sampleSiteCartesians(viewer.scene, sites).then((positions) => {
        if (viewer.isDestroyed()) return
        applySitePositions(dataSource, positions)
      })
    }
  }, [sites, sitesVisible])

  useEffect(() => {
    const viewer = viewerRef.current
    const dataSource = gatesDataSourceRef.current
    if (!dataSource) return
    if (!gatesVisible) {
      dataSource.entities.removeAll()
      dataSource.show = false
      return
    }
    syncGateEntities(dataSource, gates, selectedGateId, viewer?.scene)
    dataSource.show = true
    if (viewer && !viewer.isDestroyed() && gates.length > 0) {
      sampleSiteCartesians(viewer.scene, gates).then((positions) => {
        if (viewer.isDestroyed()) return
        applyGatePositions(dataSource, positions)
      })
    }
  }, [gates, gatesVisible, selectedGateId])

  useEffect(() => {
    applyGateSelection(gatesDataSourceRef.current, selectedGateId)
  }, [selectedGateId])

  useEffect(() => {
    const dataSource = aircraftDataSourceRef.current
    const trails = aircraftTrailPrimitiveRef.current
    if (!dataSource || !trails) return
    if (!aircraftVisible) {
      dataSource.entities.removeAll()
      trails.removeAll()
      aircraftTrailRef.current.clear()
      dataSource.show = false
      trails.show = false
      return
    }
    syncAircraftEntities(
      dataSource,
      trails,
      aircraft,
      aircraftTrailRef.current,
      selectedAircraftRef.current
    )
    dataSource.show = true
    trails.show = true
  }, [aircraft, aircraftVisible])

  useEffect(() => {
    applyAircraftSelection(aircraftDataSourceRef.current, selectedAircraftIcao24)
  }, [selectedAircraftIcao24])

  useEffect(() => {
    const dataSource = spaceDataSourceRef.current
    const trails = spaceTrailPrimitiveRef.current
    if (!dataSource || !trails) return
    if (!spaceVisible) {
      dataSource.entities.removeAll()
      trails.removeAll()
      spaceTrailRef.current.clear()
      spacePositionRef.current.clear()
      dataSource.show = false
      trails.show = false
      const viewer = viewerRef.current
      if (viewer && !viewer.isDestroyed()) {
        viewer.trackedEntity = undefined
        if (!selectedAircraftRef.current && !selectedSiteRef.current) {
          setGlobeCollision(viewer, true)
          restoreOrbit(viewer.camera, orbitRestoreRef)
        }
      }
      return
    }
    syncSpaceEntities(
      dataSource,
      trails,
      spaceTracks,
      spaceTrailRef.current,
      spacePositionRef.current,
      selectedSpaceRef.current
    )
    dataSource.show = true
    trails.show = true
  }, [spaceTracks, spaceVisible])

  useEffect(() => {
    applySpaceAppearance(spaceDataSourceRef.current, spaceTracksRef.current, selectedSpaceId)
  }, [selectedSpaceId])

  const followReady = Boolean(
    selectedSpaceId
    && spaceVisible
    && spaceTracks.some((track) => track.id === selectedSpaceId)
  )

  useEffect(() => {
    const viewer = viewerRef.current
    const dataSource = spaceDataSourceRef.current
    if (!viewer || viewer.isDestroyed() || !dataSource) return undefined

    if (!followReady || !selectedSpaceId) {
      viewer.trackedEntity = undefined
      if (!selectedAircraftIcao24 && !selectedSiteId) {
        setGlobeCollision(viewer, true)
        restoreOrbit(viewer.camera, orbitRestoreRef)
      }
      return undefined
    }

    const entity = dataSource.entities.getById(spaceEntityId(selectedSpaceId))
    if (!entity) return undefined

    captureOrbitRestore(viewer.camera, orbitRestoreRef)
    setGlobeCollision(viewer, false)
    const nonce = Date.now()
    followNonceRef.current = nonce
    viewer.trackedEntity = undefined
    viewer.camera.cancelFlight()
    detachLookAtKeepPose(viewer.camera)
    viewer.flyTo(entity, {
      duration: 2.2,
      offset: new Cesium.HeadingPitchRange(
        0,
        Cesium.Math.toRadians(-28),
        SPACE_FOLLOW_RANGE_METERS
      )
    }).then(() => {
      if (viewer.isDestroyed()) return
      if (followNonceRef.current !== nonce) return
      if (selectedSpaceRef.current !== selectedSpaceId) return
      viewer.trackedEntity = entity
    })

    return () => {
      followNonceRef.current = nonce + 1
      if (!viewer.isDestroyed()) viewer.camera.cancelFlight()
    }
  }, [followReady, selectedSpaceId, selectedAircraftIcao24, selectedSiteId])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || viewer.isDestroyed()) return
    if (!selectedAircraftIcao24) return
    const track = aircraft.find((item) => item.icao24 === selectedAircraftIcao24)
    const target = aircraftLookAtTarget(track)
    if (!target) return
    captureOrbitRestore(viewer.camera, orbitRestoreRef)
    setGlobeCollision(viewer, false)
    viewer.trackedEntity = undefined
    lookAtCartesian(viewer.camera, target)
  }, [selectedAircraftIcao24, aircraft])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || viewer.isDestroyed()) return undefined
    if (!selectedSiteId) {
      if (!selectedAircraftIcao24 && !selectedSpaceId) {
        setGlobeCollision(viewer, true)
        restoreOrbit(viewer.camera, orbitRestoreRef)
      }
      return undefined
    }

    const site = sitesRef.current.find((item) => item.id === selectedSiteId)
    const target = siteLookAtTarget(site, viewer.scene)
    if (!target) return undefined

    captureOrbitRestore(viewer.camera, orbitRestoreRef)
    setGlobeCollision(viewer, false)
    viewer.trackedEntity = undefined
    const nonce = Date.now()
    siteOrbitNonceRef.current = nonce
    const offset = siteOrbitOffset(site)
    const stillCurrent = () => (
      !viewer.isDestroyed()
      && siteOrbitNonceRef.current === nonce
      && selectedSiteRef.current === selectedSiteId
    )
    flyToLookAtStaged(viewer.camera, target, offset, configRef.current, stillCurrent).then(async () => {
      if (!stillCurrent()) return
      viewer.camera.lookAt(target, offset)
      const sampled = await sampleSiteCartesians(viewer.scene, [site])
      const refined = sampled.get(site.id)
      if (!refined) return
      if (!stillCurrent()) return
      applySitePositions(sitesDataSourceRef.current, sampled)
      recenterOrbit(viewer.camera, refined)
    })

    return () => {
      siteOrbitNonceRef.current = nonce + 1
      if (!viewer.isDestroyed()) viewer.camera.cancelFlight()
    }
  }, [selectedSiteId, selectedAircraftIcao24, selectedSpaceId])

  useEffect(() => {
    if (!selectedAircraftIcao24 && !selectedSpaceId && !selectedSiteId && !gateOpsOpen) {
      return undefined
    }
    const onKey = (event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      if (selectedGateRef.current) {
        onSelectGateRef.current?.(null)
        return
      }
      if (gateOpsOpenRef.current) {
        onCloseGateOpsRef.current?.()
        return
      }
      onSelectSiteRef.current?.(null)
      onSelectAircraftRef.current?.(null)
      onSelectSpaceRef.current?.(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedAircraftIcao24, selectedSpaceId, selectedSiteId, gateOpsOpen])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || viewer.isDestroyed()) return undefined

    const ionToken = import.meta.env.VITE_CESIUM_ION_TOKEN
    const assetId = config?.photorealisticTilesAssetId
      ?? DEFAULT_WORLD_VIEW_CONFIG.photorealisticTilesAssetId
    const enableBelow = config?.tilesEnableHeightMeters
      ?? DEFAULT_WORLD_VIEW_CONFIG.tilesEnableHeightMeters

    const ensureTileset = async () => {
      if (tilesetRef.current) return tilesetRef.current
      if (!ionToken || loadingTilesRef.current) return null
      loadingTilesRef.current = true
      try {
        const tileset = await Cesium.Cesium3DTileset.fromIonAssetId(
          assetId,
          photorealisticTilesetOptions()
        )
        if (viewer.isDestroyed()) return null
        tileset.preloadWhenHidden = true
        tileset.cacheBytes = TILESET_CACHE_BYTES
        tileset.show = false
        tilesetRef.current = viewer.scene.primitives.add(tileset)
        return tileset
      } catch (error) {
        console.warn('Photorealistic 3D tiles unavailable', error)
        return null
      } finally {
        loadingTilesRef.current = false
      }
    }

    const syncTiles = async () => {
      const tileset = await ensureTileset()
      if (!tileset || viewer.isDestroyed()) return
      const telemetry = readCameraTelemetry(viewer)
      const shouldShow = Boolean(telemetry) && telemetry.heightMeters <= enableBelow
      const wasHidden = !tileset.show
      tileset.show = shouldShow
      if (!shouldShow || !wasHidden) return
      // Markers settle onto the tiles; the camera is left alone. Site selection
      // owns the camera, and this resolves at an unpredictable point mid-flight.
      sampleSiteCartesians(viewer.scene, sitesRef.current).then((positions) => {
        if (viewer.isDestroyed()) return
        applySitePositions(sitesDataSourceRef.current, positions)
      })
      if (gatesVisibleRef.current && gatesRef.current.length > 0) {
        sampleSiteCartesians(viewer.scene, gatesRef.current).then((positions) => {
          if (viewer.isDestroyed()) return
          applyGatePositions(gatesDataSourceRef.current, positions)
        })
      }
    }

    syncTiles()
    const removeListener = throttleOnCamera(viewer, () => {
      syncTiles()
    }, TILE_CHECK_MS)
    return () => removeListener()
  }, [config])

  useEffect(() => {
    if (!resetNonce) return
    const viewer = viewerRef.current
    if (!viewer || viewer.isDestroyed()) return
    viewer.trackedEntity = undefined
    orbitRestoreRef.current = null
    setGlobeCollision(viewer, true)
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY)
    applyNorthAmericaView(viewer, configRef.current)
    const telemetry = readCameraTelemetry(viewer)
    if (telemetry) onCameraChangeRef.current?.(telemetry)
  }, [resetNonce])

  useEffect(() => {
    if (!aim?.nonce) return
    const viewer = viewerRef.current
    if (!viewer || viewer.isDestroyed()) return
    viewer.trackedEntity = undefined
    if (!selectedSiteRef.current && !selectedAircraftRef.current && !selectedSpaceRef.current) {
      setGlobeCollision(viewer, true)
      restoreOrbit(viewer.camera, orbitRestoreRef)
    }
    applyAimView(viewer, aim)
    const telemetry = readCameraTelemetry(viewer)
    if (telemetry) onCameraChangeRef.current?.(telemetry)
  }, [aim])

  useEffect(() => {
    if (!compassHeading?.nonce) return
    const viewer = viewerRef.current
    if (!viewer || viewer.isDestroyed()) return
    applyCompassHeading(viewer, compassHeading.headingDegrees, {
      siteOrbitNonceRef,
      followNonceRef,
      selectedSpaceRef,
      spaceDataSourceRef,
      selectedAircraftRef,
      aircraftRef,
      selectedSiteRef,
      sitesRef
    })
  }, [compassHeading])

  useEffect(() => {
    if (!geocodeRequest?.nonce) return undefined
    const geocoder = geocoderRef.current
    const nonce = geocodeRequest.nonce
    const query = geocodeRequest.query?.trim()

    if (!geocoder || !query) {
      onGeocodeResultsRef.current?.({ nonce, hits: [], error: geocoder ? null : 'offline' })
      return undefined
    }

    let cancelled = false
    geocoder.geocode(query).then((results) => {
      if (cancelled) return
      onGeocodeResultsRef.current?.({
        nonce,
        hits: (results ?? []).map(mapGeocodeHit)
      })
    }).catch((error) => {
      if (cancelled) return
      console.warn('Place search failed', error)
      onGeocodeResultsRef.current?.({ nonce, hits: [], error: 'failed' })
    })

    return () => {
      cancelled = true
    }
  }, [geocodeRequest])

  const selectedTrack = aircraft.find((item) => item.icao24 === selectedAircraftIcao24) ?? null
  const selectedSpace = spaceTracks.find((item) => item.id === selectedSpaceId) ?? null
  const selectedGate = gatesVisible
    ? (gates.find((item) => item.id === selectedGateId) ?? null)
    : null
  const calloutFlip = Boolean(calloutPos && calloutPos.x > window.innerWidth * 0.62)

  return (
    <div className="globe-shell">
      <div
        ref={containerRef}
        className="globe"
        onContextMenu={suppressBrowserMenu}
      />
      {selectedSpace && calloutPos ? (
        <SpaceCallout
          track={selectedSpace}
          x={calloutPos.x}
          y={calloutPos.y}
          flip={calloutFlip}
          onClose={() => onSelectSpace?.(null)}
        />
      ) : selectedGate && calloutPos ? (
        <GateOpsCallout
          gate={selectedGate}
          x={calloutPos.x}
          y={calloutPos.y}
          flip={calloutFlip}
          onClose={() => onSelectGate?.(null)}
        />
      ) : selectedTrack && calloutPos ? (
        <AircraftCallout
          track={selectedTrack}
          x={calloutPos.x}
          y={calloutPos.y}
          flip={calloutFlip}
          onClose={() => onSelectAircraft?.(null)}
        />
      ) : null}
    </div>
  )
}
