export const GATE_STATUS_ORDER = [
  'OPEN',
  'INBOUND',
  'ON_BLOCK',
  'TURNAROUND',
  'BOARDING',
  'DELAYED',
  'DEPARTING',
  'CLOSED'
]

export const GATE_STATUS_META = {
  OPEN: { label: 'Open', color: '#5CFF9A' },
  INBOUND: { label: 'Inbound', color: '#7ECBFF' },
  ON_BLOCK: { label: 'On Block', color: '#9BB8FF' },
  TURNAROUND: { label: 'Turnaround', color: '#D4A017' },
  BOARDING: { label: 'Boarding', color: '#B6FF7A' },
  DELAYED: { label: 'Delayed', color: '#FF3B3B' },
  DEPARTING: { label: 'Departing', color: '#E8C04A' },
  CLOSED: { label: 'Closed', color: '#6A7380' }
}

export function gateStatusMeta(status) {
  return GATE_STATUS_META[status] ?? GATE_STATUS_META.OPEN
}

export function formatGateClock(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toISOString().slice(11, 19) + 'Z'
}

export function formatGatePair(flight) {
  if (!flight) return '—'
  const origin = flight.origin || '—'
  const destination = flight.destination || '—'
  return `${origin} → ${destination}`
}
