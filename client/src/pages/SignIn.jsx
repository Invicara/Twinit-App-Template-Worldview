import { initiateAuth } from '../auth/auth'

export default function SignIn({ error }) {
  return (
    <div className="gate">
      <div className="gate-scanlines" aria-hidden="true" />
      <div className="gate-vignette" aria-hidden="true" />
      <div className="gate-panel">
        <p className="hud-stamp">WORLD VIEW // ORBITAL RECON</p>
        <h1>ACCESS CONTROL</h1>
        <p className="gate-copy">Authenticate to Twinit to acquire the sensor feed.</p>
        {error ? <p className="gate-error">{error}</p> : null}
        <button type="button" className="hud-button hud-button-primary" onClick={initiateAuth}>
          AUTHENTICATE
        </button>
      </div>
    </div>
  )
}
