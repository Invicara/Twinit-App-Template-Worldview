import { useEffect, useRef } from 'react'

function displaySiteName(name) {
  return String(name || '').toUpperCase()
}

export default function SitesPanel({
  sites,
  selectedId = null,
  loading,
  error,
  collapsed,
  layerVisible = true,
  onToggle,
  onLayerVisibleChange,
  onSelect,
  onEdit
}) {
  const selectedRef = useRef(null)

  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'nearest' })
  }, [selectedId, collapsed])

  return (
    <aside className={`sites-panel${collapsed ? ' sites-panel-collapsed' : ''}`}>
      <div className="sites-header">
        <label className="intel-layer">
          <input
            type="checkbox"
            className="intel-layer-check"
            checked={layerVisible}
            onChange={(event) => onLayerVisibleChange(event.target.checked)}
            aria-label="Sites intel layer"
          />
        </label>
        <button type="button" className="sites-toggle" onClick={onToggle}>
          <span>SITES</span>
          <span className="sites-count">{sites.length}</span>
          <span aria-hidden="true">{collapsed ? '▸' : '▾'}</span>
        </button>
      </div>

      {collapsed ? null : (
        <div className="sites-body">
          {loading ? <p className="sites-empty">ACQUIRING SITE LIST</p> : null}
          {error ? <p className="sites-empty sites-error">{error}</p> : null}
          {!loading && !error && sites.length === 0 ? (
            <p className="sites-empty">NO SAVED SITES. RIGHT-CLICK THE GLOBE TO MARK ONE.</p>
          ) : null}
          <ul className="sites-list">
            {sites.map((site) => (
              <li key={site.id} className="sites-row">
                <button
                  type="button"
                  ref={site.id === selectedId ? selectedRef : null}
                  className={`sites-item${site.id === selectedId ? ' sites-item-selected' : ''}`}
                  aria-pressed={site.id === selectedId}
                  onClick={() => onSelect(site)}
                >
                  <span className="sites-marker" aria-hidden="true" />
                  <span className="sites-item-copy">
                    <span className="sites-item-name">{displaySiteName(site.name)}</span>
                    <span className="sites-item-meta">
                      {Number.isFinite(site.latitude) ? site.latitude.toFixed(2) : '—'}°,
                      {' '}
                      {Number.isFinite(site.longitude) ? site.longitude.toFixed(2) : '—'}°
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className="hud-button sites-edit"
                  aria-label={`Edit ${displaySiteName(site.name)}`}
                  onClick={() => onEdit(site)}
                >
                  EDIT
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  )
}
