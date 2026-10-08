export default function GateOpsPrompt({ onShow, error = null }) {
  return (
    <div className="gate-ops-prompt">
      <p className="hud-stamp">DTW // MCNAMARA</p>
      <p className="gate-ops-prompt-copy">GATE OPERATIONS AVAILABLE</p>
      {error ? <p className="gate-ops-error">{error}</p> : null}
      <button type="button" className="hud-button hud-button-primary" onClick={onShow}>
        SHOW GATE OPERATIONS
      </button>
    </div>
  )
}
