import { useEffect, useRef } from 'react'

export function useRotatingTitle(title: string) {
  const titleRef = useRef(title)

  useEffect(() => {
    const isBot = /bot|google|baidu|bing|msn|duckduckbot|teoma|slurp|yandex|crawler|spider|robot|crawling/i.test(navigator.userAgent)
    if (isBot) {
      document.title = title.trim()
      return
    }

    const interval = setInterval(() => {
      const current = titleRef.current
      titleRef.current = current.slice(1) + current[0]
      document.title = titleRef.current
    }, 500)

    return () => clearInterval(interval)
  }, [title])
}
