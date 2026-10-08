import { useEffect, useMemo, useState } from 'react'

import { propagateCatalog } from './spacePropagate'

const TICK_MS = 1000

export function useSpaceTracks(objects, enabled) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!enabled) return undefined
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), TICK_MS)
    return () => window.clearInterval(timer)
  }, [enabled])

  return useMemo(() => {
    if (!enabled) return []
    return propagateCatalog(objects, new Date(now))
  }, [enabled, objects, now])
}
