import { useState, useEffect } from 'react'
import './style.css'

interface WakaTimeStats {
  human_readable_total: string
  languages: {
    name: string
    percent: number
    text: string
  }[]
}

export function WakaTime() {
  const [stats, setStats] = useState<WakaTimeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/wakatime/stats')
        if (!response.ok) throw new Error()
        setStats(await response.json())
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  useEffect(() => {
    if (stats) {
      requestAnimationFrame(() => setVisible(true))
    }
  }, [stats])

  if (loading || !stats) return null

  return (
    <div className={`wakatime ${visible ? 'wakatime--visible' : ''}`}>
      <div className="wakatime-header">
        <span className="wakatime-label">last 7 days</span>
        <span className="wakatime-total">{stats.human_readable_total}</span>
      </div>
      <div className="wakatime-languages">
        {stats.languages.map((lang, i) => (
          <div
            key={lang.name}
            className="wakatime-lang"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="wakatime-lang-info">
              <span className="wakatime-lang-name">{lang.name.toLowerCase()}</span>
              <span className="wakatime-lang-pct">{lang.text}</span>
            </div>
            <div className="wakatime-bar-track">
              <div
                className="wakatime-bar-fill"
                style={{
                  '--target-width': `${lang.percent}%`,
                  animationDelay: `${i * 0.1 + 0.2}s`,
                } as React.CSSProperties}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
