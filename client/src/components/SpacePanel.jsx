import { formatOrbitAltitude, formatOrbitVelocity } from '../services/spaceFormat'

function SpaceGlyph() {
  return (
    <svg className="space-glyph" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3.2 10.2h5.2l1.1-1.6h5l1.1 1.6h5.2v3.6h-5.2l-1.1 1.6h-5l-1.1-1.6H3.2zm8.1-5.4 1.3 3.2h-2.6zm0 14.4-1.3-3.2h2.6z"
      />
    </svg>
  )
}

export default function SpacePanel({
  tracks,
  selectedId = null,
  loading,
  error,
  collapsed,
  layerVisible = false,
  fetchedAt = null,
  onToggle,
  onLayerVisibleChange,
  onSelect
}) {
  return (
    <aside className={`sites-panel space-panel${collapsed ? ' sites-panel-collapsed' : ''}`}>
      <div className="sites-header">
        <label className="intel-layer" title="Space intel layer">
          <input
            type="checkbox"
            className="intel-layer-check intel-layer-check-orbit"
            checked={layerVisible}
            onChange={(event) => onLayerVisibleChange(event.target.checked)}
            aria-label="Space intel layer"
          />
        </label>
        <button type="button" className="sites-toggle" onClick={onToggle}>
          <span>SPACE</span>
          <span className="sites-count">{layerVisible ? tracks.length : 0}</span>
          <span aria-hidden="true">{collapsed ? '▸' : '▾'}</span>
        </button>
      </div>

      {collapsed || !layerVisible ? null : (
        <div className="sites-body">
          {loading && tracks.length === 0 ? (
            <p className="sites-empty">WAITING ON SPACE CATALOG</p>
          ) : null}
          {error ? <p className="sites-empty sites-error">{error}</p> : null}
          {!loading && !error && tracks.length === 0 ? (
            <p className="sites-empty">NO CACHED STATIONS. THE CELESTRAK WORKFLOW HAS NOT WRITTEN A CATALOG YET.</p>
          ) : null}
          <ul className="sites-list">
            {tracks.map((track) => (
              <li key={track.id} className="sites-row">
                <button
                  type="button"
                  className={`sites-item${track.id === selectedId ? ' sites-item-selected' : ''}`}
                  onClick={() => onSelect(track)}
                >
                  <span className="space-marker" aria-hidden="true">
                    <SpaceGlyph />
                  </span>
                  <span className="sites-item-copy">
                    <span className="sites-item-name">{track.name}</span>
                    <span className="sites-item-meta">
                      {formatOrbitAltitude(track.altitudeMeters)}
                      {' · '}
                      {formatOrbitVelocity(track.velocityMps)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {fetchedAt ? (
            <p className="sites-empty space-fetched">
              GP {new Date(fetchedAt).toISOString().replace('.000Z', 'Z')}
            </p>
          ) : null}
        </div>
      )}
    </aside>
  )
}
