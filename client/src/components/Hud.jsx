import { useEffect, useRef, useState } from 'react'

import Compass from './Compass'
import { draftFromCamera, parseAimDraft } from './hudTelemetry'

const HELP_DISMISSED_KEY = 'world-view-help-dismissed'

function helpWasDismissed() {
  try {
    return window.localStorage.getItem(HELP_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

function rememberHelpDismissed() {
  try {
    window.localStorage.setItem(HELP_DISMISSED_KEY, '1')
  } catch {
    /* private mode / blocked storage */
  }
}

function TelemetryField({ id, label, value, invalid, onChange, onFocus, onBlur }) {
  return (
    <label className="hud-telemetry-field">
      <span>{label}</span>
      <input
        id={id}
        value={value}
        aria-invalid={invalid}
        spellCheck="false"
        autoComplete="off"
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    </label>
  )
}

function formatPlaceMeta(hit) {
  const lat = Number.isFinite(hit.latitude) ? hit.latitude.toFixed(2) : '—'
  const lon = Number.isFinite(hit.longitude) ? hit.longitude.toFixed(2) : '—'
  return `${lat}°, ${lon}°`
}

export default function Hud({
  config,
  camera,
  projects,
  project,
  onSelectProject,
  onResetView,
  onAim,
  onSetHeading,
  onSignOut,
  onOpenUsers,
  onOpenArchitecture,
  ionReady,
  locateOpen = false,
  locateQuery = '',
  locateStatus = 'idle',
  placeHits = [],
  placeListOpen = false,
  activePlaceId = null,
  onToggleLocate,
  onLocateQueryChange,
  onLocateSearch,
  onSelectPlace,
  onHidePlaceList,
  blTop = null
}) {
  const [draft, setDraft] = useState(() => draftFromCamera(camera))
  const [focusedField, setFocusedField] = useState(null)
  const [invalid, setInvalid] = useState(false)
  const [helpOpen, setHelpOpen] = useState(() => !helpWasDismissed())
  const locateInputRef = useRef(null)

  function closeHelp() {
    setHelpOpen(false)
    rememberHelpDismissed()
  }

  useEffect(() => {
    if (!helpOpen) return undefined
    function onKeyDown(event) {
      if (event.key === 'Escape') closeHelp()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [helpOpen])

  useEffect(() => {
    if (!locateOpen) return
    locateInputRef.current?.focus()
  }, [locateOpen])

  useEffect(() => {
    const live = draftFromCamera(camera)
    setDraft((current) => {
      if (!focusedField) return live
      return { ...live, [focusedField]: current[focusedField] }
    })
    if (!focusedField) setInvalid(false)
  }, [camera, focusedField])

  function updateField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }))
    setInvalid(false)
  }

  function commitAim() {
    const parsed = parseAimDraft(draft)
    if (!parsed.valid) {
      setInvalid(true)
      return
    }

    onAim({
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      heightMeters: parsed.heightMeters,
      headingDegrees: parsed.headingDegrees,
      pitchDegrees: camera?.pitchDegrees
    })
  }

  const showPlaceList = ionReady && placeListOpen && placeHits.length > 1
  const locateMessage = locateStatus === 'querying'
    ? 'QUERYING…'
    : locateStatus === 'empty'
      ? 'NO FIX'
      : locateStatus === 'error'
        ? 'QUERY FAILED'
        : null

  return (
    <div className="hud" aria-hidden="false">
      <div className="hud-frame hud-frame-tl">
        <div className="hud-reticle" aria-hidden="true" />
        <p className="hud-stamp">{config?.hudStamp ?? 'WORLD VIEW // ORBITAL RECON'}</p>
        <p className="hud-meta">SENSOR PLATFORM ONLINE</p>
      </div>

      <div className="hud-frame hud-frame-tr">
        <label className="hud-field">
          <span>PROJECT</span>
          <select
            value={project?._id ?? ''}
            onChange={(event) => {
              const next = projects.find((item) => item._id === event.target.value)
              if (next) onSelectProject(next)
            }}
          >
            {projects.map((item) => (
              <option key={item._id} value={item._id}>
                {item._name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="hud-button hud-icon-button"
          aria-label="User management"
          title="PERSONNEL"
          onClick={onOpenUsers}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="8" r="3.2" />
            <path d="M5.5 19.2c.8-3.4 3.4-5.2 6.5-5.2s5.7 1.8 6.5 5.2" />
          </svg>
        </button>
        <button type="button" className="hud-button" onClick={onSignOut}>
          SIGN OUT
        </button>
        <button
          type="button"
          className="hud-button hud-icon-button"
          aria-label="Architecture brief"
          title="ARCHITECTURE"
          onClick={onOpenArchitecture}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M12 10.6v5.4" />
            <circle className="hud-icon-dot" cx="12" cy="8.1" r="0.85" />
          </svg>
        </button>
      </div>

      <div className="hud-bl-stack">
        {blTop}
        {showPlaceList ? (
          <div className="hud-locate-results">
            <div className="hud-locate-results-head">
              <p className="hud-stamp">FIX CANDIDATES</p>
              <span className="hud-locate-count">{placeHits.length}</span>
              <button
                type="button"
                className="hud-button hud-locate-hide"
                onClick={onHidePlaceList}
              >
                HIDE
              </button>
            </div>
            <ul className="hud-locate-list">
              {placeHits.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    className={`hud-locate-item${hit.id === activePlaceId ? ' hud-locate-item-active' : ''}`}
                    onClick={() => onSelectPlace(hit)}
                  >
                    <span className="hud-locate-item-name">{hit.displayName}</span>
                    <span className="hud-locate-item-meta">{formatPlaceMeta(hit)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {ionReady ? (
          <div className={`hud-locate${locateOpen ? ' hud-locate-open' : ''}`}>
            <form
              className="hud-locate-panel"
              onSubmit={(event) => {
                event.preventDefault()
                onLocateSearch()
              }}
            >
              <label className="hud-field hud-locate-field">
                <span>SEARCH</span>
                <input
                  ref={locateInputRef}
                  value={locateQuery}
                  spellCheck="false"
                  autoComplete="off"
                  placeholder="CITY OR ADDRESS"
                  onChange={(event) => onLocateQueryChange(event.target.value)}
                />
              </label>
              {locateMessage ? (
                <p className={`hud-locate-status${locateStatus === 'querying' ? '' : ' hud-locate-status-alert'}`}>
                  {locateMessage}
                </p>
              ) : null}
            </form>
          </div>
        ) : null}

        <form
          className="hud-frame hud-frame-bl"
          onSubmit={(event) => {
            event.preventDefault()
            commitAim()
          }}
        >
          {ionReady ? (
            <button
              type="button"
              className="hud-button hud-locate-toggle"
              aria-label="Place search"
              aria-expanded={locateOpen}
              title="SEARCH"
              onClick={() => {
                closeHelp()
                onToggleLocate()
              }}
            >
              SEARCH
            </button>
          ) : null}
          <button
            type="button"
            className="hud-button hud-help-button"
            aria-label="Globe controls"
            aria-expanded={helpOpen}
            title="CONTROLS"
            onClick={() => {
              setHelpOpen((open) => {
                if (open) rememberHelpDismissed()
                return !open
              })
            }}
          >
            <span aria-hidden="true">?</span>
          </button>
          {helpOpen ? (
            <div className="hud-help-panel" role="dialog" aria-labelledby="hud-help-title">
              <header className="hud-help-head">
                <p id="hud-help-title" className="hud-stamp">PLATFORM CONTROLS</p>
                <button
                  type="button"
                  className="hud-help-close"
                  onClick={closeHelp}
                  aria-label="Close controls"
                >
                  ×
                </button>
              </header>
              <dl className="hud-help-list">
                <div>
                  <dt>L-DRAG</dt>
                  <dd>ROTATE</dd>
                </div>
                <div>
                  <dt>R-DRAG</dt>
                  <dd>PAN</dd>
                </div>
                <div>
                  <dt>SCROLL</dt>
                  <dd>ZOOM</dd>
                </div>
                <div>
                  <dt>CTRL+L-DRAG</dt>
                  <dd>TILT</dd>
                </div>
                <div>
                  <dt>R-CLICK</dt>
                  <dd>MARK SITE</dd>
                </div>
                <div>
                  <dt>COMPASS</dt>
                  <dd>N E S W FACE</dd>
                </div>
              </dl>
            </div>
          ) : null}
          <div className="hud-telemetry">
            <TelemetryField
              id="hud-lat"
              label="LAT"
              value={draft.latitude}
              invalid={invalid}
              onChange={(value) => updateField('latitude', value)}
              onFocus={() => setFocusedField('latitude')}
              onBlur={() => setFocusedField(null)}
            />
            <TelemetryField
              id="hud-lon"
              label="LON"
              value={draft.longitude}
              invalid={invalid}
              onChange={(value) => updateField('longitude', value)}
              onFocus={() => setFocusedField('longitude')}
              onBlur={() => setFocusedField(null)}
            />
            <TelemetryField
              id="hud-alt"
              label="ALT"
              value={draft.altitude}
              invalid={invalid}
              onChange={(value) => updateField('altitude', value)}
              onFocus={() => setFocusedField('altitude')}
              onBlur={() => setFocusedField(null)}
            />
            <TelemetryField
              id="hud-hdg"
              label="HDG"
              value={draft.heading}
              invalid={invalid}
              onChange={(value) => updateField('heading', value)}
              onFocus={() => setFocusedField('heading')}
              onBlur={() => setFocusedField(null)}
            />
          </div>
          {invalid ? <p className="hud-telemetry-error">INVALID COORDINATES</p> : null}
          <button
            type="button"
            className="hud-button"
            onClick={() => {
              setFocusedField(null)
              setInvalid(false)
              onResetView()
            }}
          >
            RESET VIEW
          </button>
        </form>
      </div>

      <div className="hud-compass-dock">
        <Compass headingDegrees={camera?.headingDegrees} onHeading={onSetHeading} />
        <div className="hud-frame hud-frame-br">
          <p className={ionReady ? 'hud-status' : 'hud-status hud-status-warn'}>
            {ionReady ? '3D TILES ARMED' : '3D TILES OFFLINE — AWAITING ION TOKEN'}
          </p>
          <p className="hud-credit">{config?.attribution}</p>
        </div>
      </div>
    </div>
  )
}
