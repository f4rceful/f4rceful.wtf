import type { ReactNode, ButtonHTMLAttributes } from 'react'
import './style.css'

interface CoolButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode
  children: ReactNode
}

export function CoolButton({ icon, children, ...props }: CoolButtonProps) {
  return (
    <button className="cool-button" {...props}>
      {icon && <span className="cool-button-icon">{icon}</span>}
      <span>{children}</span>
    </button>
  )
}
