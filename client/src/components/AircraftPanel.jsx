import { displayCallsign, formatFlightLevel, formatKnots } from '../services/aircraftFormat'

function AircraftGlyph() {
  return (
    <svg className="aircraft-glyph" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2.2 14.2 8.6 21.5 12.2 21.5 14.4 14.2 12.6 13.4 17.4 16.6 19.4 16.6 21 12 19.2 7.4 21 7.4 19.4 10.6 17.4 9.8 12.6 2.5 14.4 2.5 12.2 9.8 8.6Z"
      />
    </svg>
  )
}

export default function AircraftPanel({
  aircraft,
  selectedIcao24 = null,
  loading,
  error,
  collapsed,
  layerVisible = false,
  layerAllowed = false,
  onToggle,
  onLayerVisibleChange,
  onSelect
}) {
  return (
    <aside className={`sites-panel aircraft-panel${collapsed ? ' sites-panel-collapsed' : ''}`}>
      <div className="sites-header">
        <label
          className={`intel-layer${layerAllowed ? '' : ' intel-layer-disabled'}`}
          title={layerAllowed ? 'Aircraft intel layer' : 'Zoom in to a view of 25 sq° or less'}
        >
          <input
            type="checkbox"
            className="intel-layer-check intel-layer-check-amber"
            checked={layerVisible && layerAllowed}
            disabled={!layerAllowed}
            onChange={(event) => onLayerVisibleChange(event.target.checked)}
            aria-label="Aircraft intel layer"
          />
        </label>
        <button type="button" className="sites-toggle" onClick={onToggle}>
          <span>AIRCRAFT</span>
          <span className="sites-count">{layerVisible && layerAllowed ? aircraft.length : 0}</span>
          <span aria-hidden="true">{collapsed ? '▸' : '▾'}</span>
        </button>
      </div>

      {collapsed ? null : !layerAllowed ? (
        <div className="sites-body">
          <p className="sites-empty">ZOOM IN UNTIL THE VIEW IS 25 SQ° OR LESS TO ENABLE AIRCRAFT.</p>
        </div>
      ) : !layerVisible ? null : (
        <div className="sites-body">
          {loading && aircraft.length === 0 ? (
            <p className="sites-empty">ACQUIRING AIRBORNE TRACKS</p>
          ) : null}
          {error ? <p className="sites-empty sites-error">{error}</p> : null}
          {!loading && !error && aircraft.length === 0 ? (
            <p className="sites-empty">NO AIRBORNE TRACKS IN VIEW. ZOOM TO A REGION WITH TRAFFIC.</p>
          ) : null}
          <ul className="sites-list">
            {aircraft.map((track) => (
              <li key={track.id} className="sites-row">
                <button
                  type="button"
                  className={`sites-item${track.icao24 === selectedIcao24 ? ' sites-item-selected' : ''}`}
                  onClick={() => onSelect(track)}
                >
                  <span className="aircraft-marker" aria-hidden="true">
                    <AircraftGlyph />
                  </span>
                  <span className="sites-item-copy">
                    <span className="sites-item-name">{displayCallsign(track)}</span>
                    <span className="sites-item-meta">
                      {formatFlightLevel(track.altitudeMeters)}
                      {' · '}
                      {formatKnots(track.velocityMps)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  )
}
