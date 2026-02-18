import { useRef, useCallback, type ReactNode } from 'react'
import { IconGitHub, IconTelegram, IconDiscord } from '../../components/icons'
import './style.css'

function LinkButton({ href, icon, children }: { href: string; icon: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLAnchorElement>(null)

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const nx = (e.clientX - rect.left) / rect.width - 0.5
    const ny = (e.clientY - rect.top) / rect.height - 0.5
    const x = Math.round(nx * 40)
    const y = Math.round(ny * -40)
    const sx = Math.round(-nx * 8)
    const sy = Math.round(-ny * 8)
    el.style.transition = 'transform 0.1s ease-out, box-shadow 0.1s ease-out'
    el.style.transform = `perspective(800px) rotateY(${x}deg) rotateX(${y}deg)`
    el.style.boxShadow = `${sx}px ${sy}px 0 0 var(--accent)`
  }, [])

  const onMouseLeave = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.transition = 'transform 0.4s ease-out, box-shadow 0.4s ease-out'
    el.style.transform = ''
    el.style.boxShadow = ''
  }, [])

  return (
    <a
      ref={ref}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="link-button"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <span className="link-button-icon">{icon}</span>
      <span className="link-button-text">{children}</span>
    </a>
  )
}

export function LinksSection() {
  return (
    <section>
      <h2>links</h2>
      <div className="links-grid">
        <LinkButton href="https://github.com/f4rceful" icon={<IconGitHub size={18} />}>
          GitHub
        </LinkButton>
        <LinkButton href="https://t.me/f4rceful" icon={<IconTelegram size={18} />}>
          Telegram
        </LinkButton>
        <LinkButton href="https://discord.com/users/1258882500533424184" icon={<IconDiscord size={18} />}>
          Discord
        </LinkButton>
      </div>
    </section>
  )
}
