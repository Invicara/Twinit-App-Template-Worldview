import { useEffect } from 'react'

import { ARCHITECTURE_HTML } from '../services/architectureBrief'

export default function ArchitectureDialog({ onClose }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function handleBodyClick(event) {
    const link = event.target.closest('a')
    if (!link) return
    const href = link.getAttribute('href') ?? ''
    if (/^https?:\/\//i.test(href)) {
      link.setAttribute('target', '_blank')
      link.setAttribute('rel', 'noopener noreferrer')
      return
    }
    event.preventDefault()
  }

  return (
    <div className="site-dialog-backdrop" onClick={onClose}>
      <div
        className="site-dialog architecture-dialog"
        role="dialog"
        aria-labelledby="architecture-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="architecture-head">
          <p id="architecture-title" className="hud-stamp">ARCHITECTURE BRIEF</p>
          <button
            type="button"
            className="hud-help-close"
            onClick={onClose}
            aria-label="Close architecture brief"
          >
            ×
          </button>
        </header>
        <article
          className="architecture-body"
          onClick={handleBodyClick}
          dangerouslySetInnerHTML={{ __html: ARCHITECTURE_HTML }}
        />
      </div>
    </div>
  )
}
