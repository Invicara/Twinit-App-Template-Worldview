import {
  displayCallsign,
  formatAltitude,
  formatHeading,
  formatIcao24,
  formatKnots,
  formatLatLon,
  formatSquawk,
  formatVerticalRate,
  isEmergencySquawk
} from '../services/aircraftFormat'

export default function AircraftCallout({ track, x, y, flip = false, onClose }) {
  const squawk = formatSquawk(track.squawk)

  return (
    <aside
      className={`aircraft-callout${flip ? ' aircraft-callout-flip' : ''}`}
      style={{ left: `${x}px`, top: `${y}px` }}
      role="dialog"
      aria-label={`Aircraft ${displayCallsign(track)}`}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <header className="aircraft-callout-head">
        <p className="hud-stamp">TRACK</p>
        <button
          type="button"
          className="aircraft-callout-close"
          onClick={onClose}
          aria-label="Dismiss aircraft details"
        >
          ×
        </button>
      </header>
      <h2 className="aircraft-callout-callsign">{displayCallsign(track)}</h2>
      <dl className="aircraft-callout-grid">
        <div>
          <dt>ICAO</dt>
          <dd>{formatIcao24(track.icao24)}</dd>
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
          <dd>{formatAltitude(track.altitudeMeters)}</dd>
        </div>
        <div>
          <dt>TRACK</dt>
          <dd>{formatHeading(track.headingDegrees)}</dd>
        </div>
        <div>
          <dt>GROUND SPEED</dt>
          <dd>{formatKnots(track.velocityMps)}</dd>
        </div>
        <div>
          <dt>VERTICAL</dt>
          <dd>{formatVerticalRate(track.verticalRateMps)}</dd>
        </div>
        <div>
          <dt>SQUAWK</dt>
          <dd className={isEmergencySquawk(track.squawk) ? 'aircraft-callout-alert' : undefined}>
            {squawk}
          </dd>
        </div>
      </dl>
      <p className="aircraft-callout-hint">ESC · CLICK MAP · ×</p>
    </aside>
  )
}
