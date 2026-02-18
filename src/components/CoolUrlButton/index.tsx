import type { ReactNode, AnchorHTMLAttributes } from 'react'
import '../CoolButton/style.css'

interface CoolUrlButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  icon?: ReactNode
  children: ReactNode
}

export function CoolUrlButton({ icon, children, ...props }: CoolUrlButtonProps) {
  return (
    <a className="cool-button" target="_blank" rel="noopener noreferrer" {...props}>
      {icon && <span className="cool-button-icon">{icon}</span>}
      <span>{children}</span>
    </a>
  )
}
