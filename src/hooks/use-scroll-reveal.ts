import { useEffect } from 'react'

export function useScrollReveal() {
  useEffect(() => {
    if (window.location.pathname === '/admin') return

    const elements = document.querySelectorAll<HTMLElement>('#app > section, #app > footer')

    elements.forEach(el => {
      el.classList.add('scroll-hidden')
    })

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.remove('scroll-hidden')
            entry.target.classList.add('scroll-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px',
      }
    )

    elements.forEach(el => observer.observe(el))

    return () => observer.disconnect()
  }, [])
}
