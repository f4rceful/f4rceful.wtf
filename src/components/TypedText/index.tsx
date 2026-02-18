import { useState, useEffect } from 'react'
import './style.css'

interface TypedTextProps {
  text: string
  delay?: number
  speed?: number
  className?: string
}

export function TypedText({ text, delay = 0, speed = 50, className = '' }: TypedTextProps) {
  const [displayed, setDisplayed] = useState('')
  const [started, setStarted] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  useEffect(() => {
    if (!started) return

    let i = 0
    const interval = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(interval)
        setDone(true)
      }
    }, speed)

    return () => clearInterval(interval)
  }, [started, text, speed])

  if (!started) return <span className={`typed-text ${className}`}>&nbsp;</span>

  return (
    <span className={`typed-text ${className}`}>
      {displayed}
      <span className={`typed-cursor ${done ? 'typed-cursor--blink' : ''}`}>_</span>
    </span>
  )
}
