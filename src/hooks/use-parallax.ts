import { useEffect } from 'react'

export function useParallax() {
  useEffect(() => {
    if (window.location.pathname === '/admin') return

    const onScroll = () => {
      const scrollY = window.scrollY
      const sections = document.querySelectorAll<HTMLElement>('#app > .scroll-visible')

      sections.forEach((el, i) => {
        const speed = 0.05 + i * 0.015
        const offset = scrollY * speed
        el.style.setProperty('--parallax-y', `${-offset}px`)
      })
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
}
