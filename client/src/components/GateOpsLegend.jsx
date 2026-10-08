import { GATE_STATUS_ORDER, gateStatusMeta, formatGateClock } from '../services/gateOpsFormat'

export default function GateOpsLegend({
  generatedAt,
  summary,
  attribution,
  loading = false,
  error = null,
  activeStatus = null,
  onToggleStatus,
  onHide
}) {
  return (
    <aside className="gate-ops-legend">
      <div className="gate-ops-legend-head">
        <p className="hud-stamp">DTW // MCNAMARA GATE OPS</p>
        <button type="button" className="hud-button" onClick={onHide}>
          HIDE
        </button>
      </div>
      {error ? <p className="gate-ops-error">{error}</p> : null}
      {loading ? <p className="gate-ops-legend-clock">ACQUIRING GATES</p> : (
        <p className="gate-ops-legend-clock">AS OF {formatGateClock(generatedAt)}</p>
      )}
      <ul className="gate-ops-legend-list">
        {GATE_STATUS_ORDER.map((status) => {
          const meta = gateStatusMeta(status)
          const key = status === 'ON_BLOCK'
            ? 'onBlock'
            : status.toLowerCase()
          const count = summary?.[key] ?? 0
          const active = activeStatus === status
          const muted = Boolean(activeStatus) && !active
          return (
            <li key={status}>
              <button
                type="button"
                className={`gate-ops-legend-filter${active ? ' gate-ops-legend-filter-active' : ''}${muted ? ' gate-ops-legend-filter-muted' : ''}`}
                aria-pressed={active}
                title={active ? 'Show all gate statuses' : `Show ${meta.label} gates only`}
                onClick={() => onToggleStatus?.(status)}
              >
                <span className="gate-ops-swatch" style={{ background: meta.color }} />
                <span>{meta.label}</span>
                <span className="gate-ops-count">{count}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <p className="gate-ops-legend-attr">{attribution}</p>
    </aside>
  )
}
