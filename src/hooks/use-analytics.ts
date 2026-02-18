import { useEffect, useRef } from 'react'
import { getSessionId } from '../utils/session'

export function useAnalytics() {
  const startTime = useRef(Date.now())

  useEffect(() => {
    const sessionId = getSessionId()

    fetch('/api/analytics/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        referrer: document.referrer,
        path: window.location.pathname,
      }),
    }).catch(() => {})

    const interval = setInterval(() => {
      const duration = Math.round((Date.now() - startTime.current) / 1000)
      fetch('/api/analytics/visit', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, duration }),
      }).catch(() => {})
    }, 30000)

    const onUnload = () => {
      const duration = Math.round((Date.now() - startTime.current) / 1000)
      navigator.sendBeacon(
        '/api/analytics/beacon',
        new Blob(
          [JSON.stringify({ sessionId, duration })],
          { type: 'application/json' }
        )
      )
    }
    window.addEventListener('beforeunload', onUnload)

    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', onUnload)
    }
  }, [])
}
