import { useEffect, useState } from 'react'
import './style.css'

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '1', '2', '3', '4']

interface RollingDigitProps {
  delay?: number
}

export function RollingDigit({ delay = 0 }: RollingDigitProps) {
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <span className="rolling-digit-wrapper">
      <span className={`rolling-digit-track ${started ? 'rolling' : ''}`}>
        {DIGITS.map((d, i) => (
          <span key={i} className="rolling-digit-item">{d}</span>
        ))}
      </span>
    </span>
  )
}
