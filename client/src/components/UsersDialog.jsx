import { useState } from 'react'

export default function UsersDialog({
  roster,
  loading,
  error,
  busy,
  onClose,
  onAdd,
  onInvite,
  onRemove,
  onCancelInvite
}) {
  const [email, setEmail] = useState('')
  const users = roster?.users ?? []
  const invites = roster?.invites ?? []
  const currentUserId = roster?.currentUserId
  const trimmed = email.trim()

  async function run(action) {
    if (!trimmed) return
    try {
      await action(trimmed)
      setEmail('')
    } catch {
      // Surface via personnelError from the mutation hooks.
    }
  }

  return (
    <div className="site-dialog-backdrop">
      <div className="site-dialog personnel-dialog" role="dialog" aria-labelledby="personnel-title">
        <p className="hud-stamp">ACCESS CONTROL</p>
        <h2 id="personnel-title">PERSONNEL</h2>
        <p className="gate-copy">
          {roster?.group?.name ?? 'WORLD VIEW USERS'}
          {roster?.projectName ? ` // ${roster.projectName}` : ''}
        </p>

        <form
          className="personnel-add"
          onSubmit={(event) => {
            event.preventDefault()
            run(onAdd)
          }}
        >
          <label className="hud-field hud-field-email">
            <span>EMAIL</span>
            <input
              type="email"
              value={email}
              autoComplete="off"
              spellCheck="false"
              placeholder="user@domain"
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <button
            type="submit"
            className="hud-button"
            disabled={busy || !trimmed}
          >
            ADD
          </button>
        </form>

        {error ? <p className="gate-error">{error}</p> : null}

        <section className="personnel-section">
          <h3>GROUP MEMBERS</h3>
          {loading ? <p className="personnel-empty">ACQUIRING ROSTER</p> : null}
          {!loading && users.length === 0 ? (
            <p className="personnel-empty">NO USERS IN GROUP</p>
          ) : null}
          {!loading && users.length > 0 ? (
            <ul className="personnel-list">
              {users.map((user) => (
                <li key={user.id} className="personnel-row">
                  <span className="personnel-row-copy">
                    <span className="personnel-row-name">{user.name}</span>
                    <span className="personnel-row-meta">{user.email}</span>
                  </span>
                  <button
                    type="button"
                    className="hud-button"
                    disabled={busy || user.id === currentUserId}
                    onClick={() => {
                      onRemove(user.id).catch(() => {})
                    }}
                  >
                    {user.id === currentUserId ? 'YOU' : 'REMOVE'}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="personnel-section">
          <h3>PENDING INVITES</h3>
          {!loading && invites.length === 0 ? (
            <p className="personnel-empty">NO PENDING INVITES</p>
          ) : null}
          {!loading && invites.length > 0 ? (
            <ul className="personnel-list">
              {invites.map((invite) => (
                <li key={invite.id} className="personnel-row">
                  <span className="personnel-row-copy">
                    <span className="personnel-row-name">{invite.email}</span>
                    <span className="personnel-row-meta">{invite.status}</span>
                  </span>
                  <button
                    type="button"
                    className="hud-button"
                    disabled={busy}
                    onClick={() => {
                      onCancelInvite(invite.id).catch(() => {})
                    }}
                  >
                    DELETE
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <div className="site-dialog-actions">
          <button type="button" className="hud-button" onClick={onClose} disabled={busy}>
            CLOSE
          </button>
        </div>
      </div>
    </div>
  )
}
