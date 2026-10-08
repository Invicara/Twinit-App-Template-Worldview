import { formatLatLon } from '../services/aircraftFormat'
import { formatInclination, formatOrbitAltitude, formatOrbitVelocity } from '../services/spaceFormat'

export default function SpaceCallout({ track, x, y, flip = false, onClose }) {
  return (
    <aside
      className={`aircraft-callout space-callout${flip ? ' aircraft-callout-flip' : ''}`}
      style={{ left: `${x}px`, top: `${y}px` }}
      role="dialog"
      aria-label={`Space object ${track.name}`}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <header className="aircraft-callout-head">
        <p className="hud-stamp">STATION</p>
        <button
          type="button"
          className="aircraft-callout-close space-callout-close"
          onClick={onClose}
          aria-label="Stop following"
        >
          ×
        </button>
      </header>
      <h2 className="aircraft-callout-callsign space-callout-name">{track.name}</h2>
      <dl className="aircraft-callout-grid">
        <div>
          <dt>NORAD</dt>
          <dd>{track.id}</dd>
        </div>
        <div>
          <dt>LAT</dt>
          <dd>{formatLatLon(track.latitude, 'lat')}</dd>
        </div>
        <div>
          <dt>LON</dt>
          <dd>{formatLatLon(track.longitude, 'lon')}</dd>
        </div>
        <div>
          <dt>ALTITUDE</dt>
          <dd>{formatOrbitAltitude(track.altitudeMeters)}</dd>
        </div>
        <div>
          <dt>VELOCITY</dt>
          <dd>{formatOrbitVelocity(track.velocityMps)}</dd>
        </div>
        <div>
          <dt>INCL</dt>
          <dd>{formatInclination(track.inclinationDegrees)}</dd>
        </div>
      </dl>
      <p className="aircraft-callout-hint">FOLLOWING · ESC · CLICK MAP · ×</p>
    </aside>
  )
}
