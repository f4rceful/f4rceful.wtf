import type { ReactNode } from 'react'
import { IconExternalLink } from '../icons'
import './style.css'

interface BulletLinkProps {
  href: string
  children: ReactNode
}

export function BulletLink({ href, children }: BulletLinkProps) {
  return (
    <a className="bullet-link" href={href} target="_blank" rel="noopener noreferrer">
      <span>{children}</span>
      <IconExternalLink />
    </a>
  )
}
