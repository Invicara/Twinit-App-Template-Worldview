const CARDINALS = [
  { id: 'N', deg: 0, label: 'Face north' },
  { id: 'E', deg: 90, label: 'Face east' },
  { id: 'S', deg: 180, label: 'Face south' },
  { id: 'W', deg: 270, label: 'Face west' }
]

function normalizeHeading(degrees) {
  if (!Number.isFinite(degrees)) return 0
  return ((degrees % 360) + 360) % 360
}

function headingDelta(a, b) {
  return Math.abs(((a - b + 540) % 360) - 180)
}

function tickPath(index) {
  const angle = (index * 10 * Math.PI) / 180
  const major = index % 9 === 0
  const mid = index % 3 === 0
  const inner = major ? 33 : mid ? 37.5 : 40.5
  const outer = 45.5
  const x1 = 50 + inner * Math.sin(angle)
  const y1 = 50 - inner * Math.cos(angle)
  const x2 = 50 + outer * Math.sin(angle)
  const y2 = 50 - outer * Math.cos(angle)
  return {
    d: `M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)}`,
    className: major ? 'hud-compass-tick-major' : mid ? 'hud-compass-tick-mid' : 'hud-compass-tick'
  }
}

const TICKS = Array.from({ length: 36 }, (_, index) => tickPath(index))

export default function Compass({ headingDegrees = 0, onHeading }) {
  const heading = normalizeHeading(headingDegrees)

  return (
    <div
      className="hud-compass"
      role="group"
      aria-label="Compass"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="hud-compass-bezel">
        <div className="hud-compass-lubber" aria-hidden="true" />
        <div
          className="hud-compass-rose"
          style={{ transform: `rotate(${-heading}deg)` }}
        >
          <svg className="hud-compass-ticks" viewBox="0 0 100 100" aria-hidden="true">
            <circle className="hud-compass-ring" cx="50" cy="50" r="46.5" />
            {TICKS.map((tick) => (
              <path key={tick.d} className={tick.className} d={tick.d} />
            ))}
            <polygon className="hud-compass-needle" points="50,31 47.2,38.4 52.8,38.4" />
          </svg>
          {CARDINALS.map((cardinal) => {
            const active = headingDelta(heading, cardinal.deg) < 12
            return (
              <button
                key={cardinal.id}
                type="button"
                className={`hud-compass-cardinal hud-compass-cardinal-${cardinal.id.toLowerCase()}${active ? ' hud-compass-cardinal-active' : ''}`}
                aria-label={cardinal.label}
                aria-pressed={active}
                title={cardinal.label.toUpperCase()}
                onClick={() => onHeading?.(cardinal.deg)}
              >
                <span style={{ transform: `rotate(${heading}deg)` }}>{cardinal.id}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
