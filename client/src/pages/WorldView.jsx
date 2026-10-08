import { useEffect, useRef, useState } from 'react'

import Globe from '../components/Globe'
import Hud from '../components/Hud'
import SaveSiteDialog from '../components/SaveSiteDialog'
import SitesPanel from '../components/SitesPanel'
import AircraftPanel from '../components/AircraftPanel'
import SpacePanel from '../components/SpacePanel'
import UsersDialog from '../components/UsersDialog'
import ArchitectureDialog from '../components/ArchitectureDialog'
import GateOpsPrompt from '../components/GateOpsPrompt'
import GateOpsLegend from '../components/GateOpsLegend'
import { logout } from '../auth/auth'
import { useProject } from '../context/ProjectContext'
import { aircraftViewAllowed, bboxFromCamera } from '../services/aircraftBounds'
import { isDtwSite, GATE_OPS_MAX_HEIGHT_METERS } from '../services/gateOpsBounds'
import { useAircraft } from '../services/useAircraft'
import { isGateOpsUnavailable, useGateOperations } from '../services/useGateOperations'
import { useSpaceCatalog } from '../services/useSpaceCatalog'
import { useSpaceTracks } from '../services/useSpaceTracks'
import { catalogObjectId } from '../services/spacePropagate'
import { useCreateSite, useDeleteSite, useSites, useUpdateSite } from '../services/useSites'
import {
  useAddUser,
  useCancelInvite,
  useInviteUser,
  useRemoveUser,
  useUserRoster
} from '../services/useUsers'
import { useWorldViewConfig } from '../services/useWorldViewConfig'
import { DEFAULT_WORLD_VIEW_CONFIG } from '../services/worldViewConfig'

export default function WorldView() {
  const { projects, project, namespace, loading, error, selectProject } = useProject()
  const configQuery = useWorldViewConfig(namespace)
  const sitesQuery = useSites(namespace)
  const createSite = useCreateSite(namespace)
  const updateSite = useUpdateSite(namespace)
  const deleteSite = useDeleteSite(namespace)
  const [camera, setCamera] = useState(null)
  const [resetNonce, setResetNonce] = useState(0)
  const [aim, setAim] = useState(null)
  const [compassHeading, setCompassHeading] = useState(null)
  const [sitesCollapsed, setSitesCollapsed] = useState(true)
  const [intelLayers, setIntelLayers] = useState({ sites: true, aircraft: false, space: false })
  const [aircraftCollapsed, setAircraftCollapsed] = useState(true)
  const [spaceCollapsed, setSpaceCollapsed] = useState(true)
  const [selectedAircraftIcao24, setSelectedAircraftIcao24] = useState(null)
  const [selectedSpaceId, setSelectedSpaceId] = useState(null)
  const [selectedSiteId, setSelectedSiteId] = useState(null)
  const [gateOpsOpen, setGateOpsOpen] = useState(false)
  const [selectedGateId, setSelectedGateId] = useState(null)
  const [gateStatusFilter, setGateStatusFilter] = useState(null)
  const [siteEditor, setSiteEditor] = useState(null)
  const [usersOpen, setUsersOpen] = useState(false)
  const [architectureOpen, setArchitectureOpen] = useState(false)
  const [locateOpen, setLocateOpen] = useState(false)
  const [locateQuery, setLocateQuery] = useState('')
  const [geocodeRequest, setGeocodeRequest] = useState(null)
  const [placeHits, setPlaceHits] = useState([])
  const [placeListOpen, setPlaceListOpen] = useState(false)
  const [placeStatus, setPlaceStatus] = useState('idle')
  const [activePlaceId, setActivePlaceId] = useState(null)
  const geocodeNonceRef = useRef(0)
  const rosterQuery = useUserRoster(namespace, usersOpen)
  const addUser = useAddUser(namespace)
  const removeUser = useRemoveUser(namespace)
  const inviteUser = useInviteUser(namespace)
  const cancelInvite = useCancelInvite(namespace)
  const personnelError = rosterQuery.isError
    ? (rosterQuery.error?.message ?? 'UNABLE TO READ PERSONNEL')
    : addUser.error?.message
      ?? removeUser.error?.message
      ?? inviteUser.error?.message
      ?? cancelInvite.error?.message
      ?? null
  const personnelBusy = addUser.isPending
    || removeUser.isPending
    || inviteUser.isPending
    || cancelInvite.isPending
  const config = configQuery.data ?? DEFAULT_WORLD_VIEW_CONFIG
  const ionReady = Boolean(import.meta.env.VITE_CESIUM_ION_TOKEN)
  const sites = sitesQuery.data ?? []
  const aircraftAllowed = aircraftViewAllowed(camera)
  const aircraftEnabled = intelLayers.aircraft && aircraftAllowed
  const aircraftBbox = aircraftEnabled ? bboxFromCamera(camera) : null
  const aircraftQuery = useAircraft(namespace, aircraftBbox, aircraftEnabled)
  const aircraft = aircraftQuery.data ?? []
  const spaceEnabled = intelLayers.space
  const spaceCatalogQuery = useSpaceCatalog(namespace, spaceEnabled)
  const spaceObjects = spaceCatalogQuery.data?.objects ?? []
  const spaceTracks = useSpaceTracks(spaceObjects, spaceEnabled)
  const selectedSite = sites.find((site) => site.id === selectedSiteId) ?? null
  const dtwSelected = isDtwSite(selectedSite)
  const gateOpsFetchEnabled = dtwSelected
  const gateOpsQuery = useGateOperations(namespace, gateOpsFetchEnabled)
  const gateOpsMissing = gateOpsQuery.data?.available === false
    || isGateOpsUnavailable(gateOpsQuery.error)
  const gates = gateOpsQuery.data?.gates ?? []
  const visibleGates = gateStatusFilter
    ? gates.filter((gate) => gate.status === gateStatusFilter)
    : gates
  const gatesNear = Number.isFinite(camera?.heightMeters)
    && camera.heightMeters <= GATE_OPS_MAX_HEIGHT_METERS
  const gatesVisible = gateOpsOpen && gatesNear && !gateOpsMissing

  useEffect(() => {
    if (!aircraftAllowed && intelLayers.aircraft) {
      setIntelLayers((current) => ({ ...current, aircraft: false }))
      setSelectedAircraftIcao24(null)
    }
  }, [aircraftAllowed, intelLayers.aircraft])

  useEffect(() => {
    if (!aircraftEnabled) {
      setSelectedAircraftIcao24(null)
      return
    }
    if (
      selectedAircraftIcao24
      && !aircraftQuery.isFetching
      && !aircraft.some((track) => track.icao24 === selectedAircraftIcao24)
    ) {
      setSelectedAircraftIcao24(null)
    }
  }, [
    aircraft,
    aircraftEnabled,
    aircraftQuery.isFetching,
    selectedAircraftIcao24
  ])

  useEffect(() => {
    if (intelLayers.sites) return
    setSelectedSiteId(null)
    setGateOpsOpen(false)
    setSelectedGateId(null)
    setGateStatusFilter(null)
  }, [intelLayers.sites])

  useEffect(() => {
    if (dtwSelected && !gateOpsMissing) return
    setGateOpsOpen(false)
    setSelectedGateId(null)
    setGateStatusFilter(null)
  }, [dtwSelected, gateOpsMissing])

  useEffect(() => {
    if (gateOpsOpen) return
    setSelectedGateId(null)
    setGateStatusFilter(null)
  }, [gateOpsOpen])

  useEffect(() => {
    if (gatesVisible) return
    setSelectedGateId(null)
  }, [gatesVisible])

  useEffect(() => {
    if (!selectedGateId || !gateStatusFilter) return
    if (gates.some((gate) => gate.id === selectedGateId && gate.status === gateStatusFilter)) return
    setSelectedGateId(null)
  }, [selectedGateId, gateStatusFilter, gates])

  useEffect(() => {
    if (spaceEnabled) return
    setSelectedSpaceId(null)
  }, [spaceEnabled])

  useEffect(() => {
    if (!spaceEnabled) return
    if (
      selectedSpaceId
      && !spaceCatalogQuery.isFetching
      && !spaceObjects.some((omm) => catalogObjectId(omm) === selectedSpaceId)
    ) {
      setSelectedSpaceId(null)
    }
  }, [
    spaceCatalogQuery.isFetching,
    spaceEnabled,
    spaceObjects,
    selectedSpaceId
  ])

  const siteBusy = createSite.isPending || updateSite.isPending || deleteSite.isPending
  const siteError = createSite.error?.message
    ?? updateSite.error?.message
    ?? deleteSite.error?.message
    ?? null

  function sitePose(source) {
    return {
      latitude: source.latitude,
      longitude: source.longitude,
      heightMeters: source.heightMeters,
      headingDegrees: source.headingDegrees,
      pitchDegrees: source.pitchDegrees
    }
  }

  function closeSiteEditor() {
    createSite.reset()
    updateSite.reset()
    deleteSite.reset()
    setSiteEditor(null)
  }

  function selectSite(site) {
    const next = site?.id ?? null
    const deselecting = Boolean(selectedSiteId && selectedSiteId === next)
    setSelectedAircraftIcao24(null)
    setSelectedSpaceId(null)
    setSelectedSiteId((current) => (current && current === next ? null : next))
    if (deselecting || !isDtwSite(site)) {
      setGateOpsOpen(false)
      setSelectedGateId(null)
      setGateStatusFilter(null)
    }
    if (next && next !== selectedSiteId) setSitesCollapsed(false)
  }

  function selectAircraft(track) {
    const next = track?.icao24 ?? null
    setSelectedSiteId(null)
    setSelectedSpaceId(null)
    setGateOpsOpen(false)
    setSelectedGateId(null)
    setGateStatusFilter(null)
    setSelectedAircraftIcao24((current) => (current && current === next ? null : next))
  }

  function selectSpace(track) {
    const next = track?.id ?? null
    setSelectedSiteId(null)
    setSelectedAircraftIcao24(null)
    setGateOpsOpen(false)
    setSelectedGateId(null)
    setGateStatusFilter(null)
    setSelectedSpaceId((current) => (current && current === next ? null : next))
  }

  function openGateOps() {
    setSelectedGateId(null)
    setGateStatusFilter(null)
    setGateOpsOpen(true)
  }

  function closeGateOps() {
    setGateOpsOpen(false)
    setSelectedGateId(null)
    setGateStatusFilter(null)
  }

  function toggleGateStatusFilter(status) {
    setGateStatusFilter((current) => (current === status ? null : status))
  }

  function selectGate(gate) {
    const next = gate?.id ?? null
    setSelectedGateId((current) => (current && current === next ? null : next))
  }

  function flyToPlace(hit) {
    setSelectedSiteId(null)
    setSelectedAircraftIcao24(null)
    setSelectedSpaceId(null)
    setGateOpsOpen(false)
    setSelectedGateId(null)
    setGateStatusFilter(null)
    setActivePlaceId(hit.id)
    setAim({
      latitude: hit.latitude,
      longitude: hit.longitude,
      heightMeters: hit.heightMeters,
      headingDegrees: 0,
      pitchDegrees: -90,
      rectangle: hit.rectangle,
      fly: true,
      nonce: Date.now()
    })
  }

  function handleGeocodeResults({ nonce, hits = [], error } = {}) {
    if (nonce !== geocodeNonceRef.current) return
    if (error) {
      setPlaceStatus('error')
      setPlaceHits([])
      setPlaceListOpen(false)
      return
    }
    if (hits.length === 0) {
      setPlaceStatus('empty')
      setPlaceHits([])
      setPlaceListOpen(false)
      return
    }
    setPlaceStatus('idle')
    setPlaceHits(hits)
    if (hits.length === 1) {
      setPlaceListOpen(false)
      flyToPlace(hits[0])
      return
    }
    setPlaceListOpen(true)
  }

  function submitLocate() {
    const query = locateQuery.trim()
    if (!query) return
    const nonce = Date.now()
    geocodeNonceRef.current = nonce
    setPlaceStatus('querying')
    setGeocodeRequest({ query, nonce })
  }

  if (loading) {
    return (
      <div className="gate">
        <div className="gate-scanlines" aria-hidden="true" />
        <p className="hud-stamp">ACQUIRING PROJECT LINK</p>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="gate">
        <div className="gate-scanlines" aria-hidden="true" />
        <div className="gate-panel">
          <p className="hud-stamp">LINK FAILURE</p>
          <p className="gate-error">{error ?? 'No accessible project'}</p>
          <button type="button" className="hud-button" onClick={logout}>
            SIGN OUT
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="world-view"
      onContextMenu={(event) => {
        const tag = event.target?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        event.preventDefault()
      }}
    >
      <Globe
        config={config}
        onCameraChange={setCamera}
        resetNonce={resetNonce}
        aim={aim}
        compassHeading={compassHeading}
        sites={sites}
        sitesVisible={intelLayers.sites}
        aircraft={aircraft}
        aircraftVisible={aircraftEnabled}
        selectedAircraftIcao24={selectedAircraftIcao24}
        selectedSiteId={selectedSiteId}
        spaceTracks={spaceTracks}
        spaceVisible={spaceEnabled}
        selectedSpaceId={selectedSpaceId}
        gates={visibleGates}
        gatesVisible={gatesVisible}
        selectedGateId={selectedGateId}
        gateOpsOpen={gateOpsOpen}
        geocodeRequest={geocodeRequest}
        onGeocodeResults={handleGeocodeResults}
        onSelectSite={selectSite}
        onSelectAircraft={selectAircraft}
        onSelectSpace={selectSpace}
        onSelectGate={selectGate}
        onCloseGateOps={closeGateOps}
        onRequestSaveSite={(draft) => {
          createSite.reset()
          updateSite.reset()
          deleteSite.reset()
          setSiteEditor({ mode: 'create', ...draft })
        }}
      />
      <div className="world-scanlines" aria-hidden="true" />
      <div className="world-vignette" aria-hidden="true" />
      <Hud
        config={config}
        camera={camera}
        projects={projects}
        project={project}
        onSelectProject={selectProject}
        onResetView={() => {
          setSelectedSiteId(null)
          setSelectedAircraftIcao24(null)
          setSelectedSpaceId(null)
          setGateOpsOpen(false)
          setSelectedGateId(null)
          setGateStatusFilter(null)
          setResetNonce((n) => n + 1)
        }}
        onAim={(next) => setAim({ ...next, nonce: Date.now() })}
        onSetHeading={(headingDegrees) => setCompassHeading({ headingDegrees, nonce: Date.now() })}
        onSignOut={logout}
        onOpenUsers={() => {
          addUser.reset()
          removeUser.reset()
          inviteUser.reset()
          cancelInvite.reset()
          setUsersOpen(true)
        }}
        onOpenArchitecture={() => setArchitectureOpen(true)}
        ionReady={ionReady}
        locateOpen={locateOpen}
        locateQuery={locateQuery}
        locateStatus={placeStatus}
        placeHits={placeHits}
        placeListOpen={placeListOpen}
        activePlaceId={activePlaceId}
        onToggleLocate={() => setLocateOpen((open) => !open)}
        onLocateQueryChange={setLocateQuery}
        onLocateSearch={submitLocate}
        onSelectPlace={flyToPlace}
        onHidePlaceList={() => setPlaceListOpen(false)}
        blTop={gatesVisible ? (
          <GateOpsLegend
            generatedAt={gateOpsQuery.data?.generatedAt}
            summary={gateOpsQuery.data?.summary}
            attribution={gateOpsQuery.data?.attribution ?? '© OpenStreetMap contributors'}
            loading={gateOpsQuery.isLoading && !gateOpsQuery.data}
            error={gateOpsQuery.isError ? (gateOpsQuery.error?.message ?? 'UNABLE TO READ GATE OPERATIONS') : null}
            activeStatus={gateStatusFilter}
            onToggleStatus={toggleGateStatusFilter}
            onHide={closeGateOps}
          />
        ) : null}
      />
      <div className="intel-stack">
      <SitesPanel
        sites={sites}
        selectedId={selectedSiteId}
        loading={sitesQuery.isLoading}
        error={sitesQuery.isError ? 'UNABLE TO READ SITES FROM TWINIT' : null}
        collapsed={sitesCollapsed}
        layerVisible={intelLayers.sites}
        onToggle={() => setSitesCollapsed((value) => !value)}
        onLayerVisibleChange={(visible) => {
          setIntelLayers((current) => ({ ...current, sites: visible }))
        }}
        onSelect={selectSite}
        onEdit={(site) => {
          createSite.reset()
          updateSite.reset()
          deleteSite.reset()
          setSiteEditor({ mode: 'edit', ...site })
        }}
      />
      <AircraftPanel
        aircraft={aircraft}
        selectedIcao24={selectedAircraftIcao24}
        loading={aircraftQuery.isFetching}
        error={aircraftQuery.isError ? (aircraftQuery.error?.message ?? 'UNABLE TO ACQUIRE AIRCRAFT').toUpperCase() : null}
        collapsed={aircraftCollapsed}
        layerVisible={aircraftEnabled}
        layerAllowed={aircraftAllowed}
        onToggle={() => setAircraftCollapsed((value) => !value)}
        onLayerVisibleChange={(visible) => {
          if (visible && !aircraftAllowed) return
          setIntelLayers((current) => ({ ...current, aircraft: visible }))
          if (visible) setAircraftCollapsed(false)
          else setSelectedAircraftIcao24(null)
        }}
        onSelect={selectAircraft}
      />
      <SpacePanel
        tracks={spaceTracks}
        selectedId={selectedSpaceId}
        loading={spaceCatalogQuery.isFetching}
        error={spaceCatalogQuery.isError ? (spaceCatalogQuery.error?.message ?? 'UNABLE TO READ SPACE CATALOG').toUpperCase() : null}
        collapsed={spaceCollapsed}
        layerVisible={spaceEnabled}
        fetchedAt={spaceCatalogQuery.data?.fetchedAt ?? null}
        onToggle={() => setSpaceCollapsed((value) => !value)}
        onLayerVisibleChange={(visible) => {
          setIntelLayers((current) => ({ ...current, space: visible }))
          if (visible) setSpaceCollapsed(false)
          else setSelectedSpaceId(null)
        }}
        onSelect={selectSpace}
      />
      </div>
      {dtwSelected && gatesNear && !gateOpsOpen && !gateOpsMissing && (gateOpsQuery.isSuccess || gateOpsQuery.isError) ? (
        <GateOpsPrompt
          onShow={openGateOps}
          error={gateOpsQuery.isError ? (gateOpsQuery.error?.message ?? 'UNABLE TO READ GATE OPERATIONS') : null}
        />
      ) : null}
      {architectureOpen ? (
        <ArchitectureDialog onClose={() => setArchitectureOpen(false)} />
      ) : null}
      {usersOpen ? (
        <UsersDialog
          roster={rosterQuery.data}
          loading={rosterQuery.isLoading}
          error={personnelError}
          busy={personnelBusy}
          onClose={() => setUsersOpen(false)}
          onAdd={async (email) => {
            inviteUser.reset()
            removeUser.reset()
            cancelInvite.reset()
            await addUser.mutateAsync(email)
          }}
          onInvite={async (email) => {
            addUser.reset()
            removeUser.reset()
            cancelInvite.reset()
            await inviteUser.mutateAsync(email)
          }}
          onRemove={async (userId) => {
            addUser.reset()
            inviteUser.reset()
            cancelInvite.reset()
            await removeUser.mutateAsync(userId)
          }}
          onCancelInvite={async (inviteId) => {
            addUser.reset()
            inviteUser.reset()
            removeUser.reset()
            await cancelInvite.mutateAsync(inviteId)
          }}
        />
      ) : null}
      {siteEditor ? (
        <SaveSiteDialog
          key={siteEditor.id ?? 'new-site'}
          draft={siteEditor}
          mode={siteEditor.mode}
          saving={siteBusy}
          error={siteError ? siteError.toUpperCase() : null}
          canCapture={Boolean(camera)}
          onCaptureView={() => {
            if (!camera) return
            setSiteEditor((current) => current ? { ...current, ...sitePose(camera) } : current)
          }}
          onCancel={closeSiteEditor}
          onSave={async (name) => {
            const payload = { name, ...sitePose(siteEditor) }
            if (siteEditor.mode === 'edit') {
              await updateSite.mutateAsync({ id: siteEditor.id, ...payload })
            } else {
              await createSite.mutateAsync(payload)
            }
            closeSiteEditor()
          }}
          onDelete={siteEditor.mode === 'edit' ? async () => {
            await deleteSite.mutateAsync(siteEditor.id)
            closeSiteEditor()
          } : undefined}
        />
      ) : null}
    </div>
  )
}
