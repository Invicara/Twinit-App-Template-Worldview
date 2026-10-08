import { formatGateClock, formatGatePair, gateStatusMeta } from '../services/gateOpsFormat'

export default function GateOpsCallout({ gate, x, y, flip = false, onClose }) {
  const meta = gateStatusMeta(gate.status)
  const flight = gate.flight

  return (
    <aside
      className={`gate-ops-callout${flip ? ' gate-ops-callout-flip' : ''}`}
      style={{ left: `${x}px`, top: `${y}px` }}
      role="dialog"
      aria-label={`Gate ${gate.id}`}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <header className="aircraft-callout-head">
        <p className="hud-stamp">GATE {gate.id}</p>
        <button
          type="button"
          className="aircraft-callout-close"
          onClick={onClose}
          aria-label="Dismiss gate details"
        >
          ×
        </button>
      </header>
      <h2 className="gate-ops-callout-status" style={{ color: meta.color }}>
        {meta.label}
      </h2>
      <dl className="aircraft-callout-grid">
        <div>
          <dt>FLIGHT</dt>
          <dd>{flight?.ident ?? '—'}</dd>
        </div>
        <div>
          <dt>PAIR</dt>
          <dd>{formatGatePair(flight)}</dd>
        </div>
        <div>
          <dt>AIRCRAFT</dt>
          <dd>{flight?.aircraft ?? '—'}</dd>
        </div>
        <div>
          <dt>SCHED IN</dt>
          <dd>{formatGateClock(gate.scheduledArrival)}</dd>
        </div>
        <div>
          <dt>EST IN</dt>
          <dd>{formatGateClock(gate.estimatedArrival)}</dd>
        </div>
        <div>
          <dt>SCHED OUT</dt>
          <dd>{formatGateClock(gate.scheduledDeparture)}</dd>
        </div>
        <div>
          <dt>EST OUT</dt>
          <dd>{formatGateClock(gate.estimatedDeparture)}</dd>
        </div>
        <div>
          <dt>DELAY</dt>
          <dd className={gate.delayMinutes > 0 ? 'aircraft-callout-alert' : undefined}>
            {gate.delayMinutes > 0 ? `${gate.delayMinutes} MIN` : 'NONE'}
          </dd>
        </div>
        <div>
          <dt>UPDATED</dt>
          <dd>{formatGateClock(gate.updatedAt)}</dd>
        </div>
      </dl>
      <p className="aircraft-callout-hint">ESC · CLICK MAP · ×</p>
    </aside>
  )
}
