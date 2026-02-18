import { useState, type ReactNode } from 'react'
import './style.css'

interface SpoilerProps {
  children: ReactNode
}

export function Spoiler({ children }: SpoilerProps) {
  const [revealed, setRevealed] = useState(false)

  return (
    <span
      className={`spoiler ${revealed ? 'spoiler-revealed' : ''}`}
      onClick={() => setRevealed(true)}
    >
      {children}
    </span>
  )
}
