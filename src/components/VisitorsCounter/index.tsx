import { useState, useEffect } from 'react'
import { useInterval } from '../../hooks/use-interval'
import './style.css'

interface CounterData {
  total: number
  live: number
}

function AnimatedDigit({ value }: { value: string }) {
  return (
    <span className="counter-digit">
      {value}
    </span>
  )
}

export function VisitorsCounter() {
  const [data, setData] = useState<CounterData | null>(null)
  const [prevTotal, setPrevTotal] = useState<number>(0)

  const fetchCounter = async () => {
    try {
      const res = await fetch('/api/analytics/counter')
      if (res.ok) {
        const newData: CounterData = await res.json()
        if (data) setPrevTotal(data.total)
        setData(newData)
      }
    } catch {}
  }

  useEffect(() => { fetchCounter() }, [])
  useInterval(fetchCounter, 10000) // Update every 10s

  if (!data) return null

  const totalStr = data.total.toString().padStart(6, '0')
  const hasIncreased = data.total > prevTotal

  return (
    <div className="visitors-counter">
      <div className="counter-display">
        <span className="counter-label">visitors:</span>
        <div className={`counter-number ${hasIncreased ? 'counter-number--bump' : ''}`}>
          {totalStr.split('').map((digit, i) => (
            <AnimatedDigit key={i} value={digit} />
          ))}
        </div>
        {data.live > 0 && (
          <>
            <span className="counter-separator">·</span>
            <div className="counter-live">
              <span className="counter-live-dot" />
              <span className="counter-live-text">{data.live} online</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
