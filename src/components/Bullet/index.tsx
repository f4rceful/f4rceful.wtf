import type { ReactNode } from 'react'
import './style.css'

interface BulletProps {
  children: ReactNode
}

export function Bullet({ children }: BulletProps) {
  return <span className="bullet">{children}</span>
}
