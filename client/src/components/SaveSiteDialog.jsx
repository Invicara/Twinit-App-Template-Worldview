import { useState } from 'react'

function defaultName(draft) {
  if (draft?.name) return draft.name
  const lat = Number.isFinite(draft?.latitude) ? draft.latitude.toFixed(2) : '—'
  const lon = Number.isFinite(draft?.longitude) ? draft.longitude.toFixed(2) : '—'
  return `SITE ${lat}, ${lon}`
}

export default function SaveSiteDialog({
  draft,
  mode = 'create',
  saving,
  error,
  canCapture = false,
  onCancel,
  onSave,
  onDelete,
  onCaptureView
}) {
  const [name, setName] = useState(() => defaultName(draft))
  const editing = mode === 'edit'

  return (
    <div className="site-dialog-backdrop">
      <form
        className="site-dialog"
        onSubmit={(event) => {
          event.preventDefault()
          const trimmed = name.trim()
          if (!trimmed) return
          onSave(trimmed)
        }}
      >
        <p className="hud-stamp">{editing ? 'SITE RECORD' : 'MARK SITE'}</p>
        <h2>{editing ? 'EDIT SITE' : 'SAVE LOCATION'}</h2>
        <p className="gate-copy">
          {Number.isFinite(draft?.latitude) ? draft.latitude.toFixed(4) : '—'}° ,
          {' '}
          {Number.isFinite(draft?.longitude) ? draft.longitude.toFixed(4) : '—'}°
        </p>
        <label className="hud-field">
          <span>DESIGNATION</span>
          <input
            value={name}
            autoFocus
            spellCheck="false"
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        {canCapture ? (
          <button
            type="button"
            className="hud-button site-capture"
            onClick={onCaptureView}
            disabled={saving}
          >
            UPDATE FROM CURRENT VIEW
          </button>
        ) : null}
        {error ? <p className="gate-error">{error}</p> : null}
        <div className="site-dialog-actions">
          {editing ? (
            <button
              type="button"
              className="hud-button hud-button-danger"
              onClick={onDelete}
              disabled={saving}
            >
              DELETE
            </button>
          ) : null}
          <button type="button" className="hud-button" onClick={onCancel} disabled={saving}>
            CANCEL
          </button>
          <button type="submit" className="hud-button hud-button-primary" disabled={saving || !name.trim()}>
            {saving ? 'WRITING…' : editing ? 'SAVE CHANGES' : 'SAVE SITE'}
          </button>
        </div>
      </form>
    </div>
  )
}
