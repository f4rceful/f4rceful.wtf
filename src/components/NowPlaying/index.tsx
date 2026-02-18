import { useState, useEffect } from 'react'
import { useInterval } from '../../hooks/use-interval'
import './style.css'

interface SpotifyData {
  isPlaying: boolean
  title?: string
  artist?: string
  album?: string
  albumArt?: string
  songUrl?: string
  progress?: number
  duration?: number
}

export function NowPlaying() {
  const [data, setData] = useState<SpotifyData | null>(null)

  const fetchNowPlaying = async () => {
    try {
      const res = await fetch('/api/spotify/now-playing')
      const json: SpotifyData = await res.json()
      setData(json)
    } catch {
      setData({ isPlaying: false })
    }
  }

  useEffect(() => { fetchNowPlaying() }, [])
  useInterval(fetchNowPlaying, 5000) // Update every 5s

  if (!data) return null

  if (!data.isPlaying) {
    return (
      <div className="now-playing">
        <div className="now-playing-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>
        <div className="now-playing-info">
          <span className="now-playing-status">not listening</span>
        </div>
      </div>
    )
  }

  const progressPercent = data.progress && data.duration
    ? (data.progress / data.duration) * 100
    : 0

  return (
    <a
      href={data.songUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="now-playing now-playing--active"
    >
      <div className="now-playing-equalizer">
        <span className="now-playing-bar" />
        <span className="now-playing-bar" />
        <span className="now-playing-bar" />
      </div>

      {data.albumArt && (
        <img
          src={data.albumArt}
          alt={data.album}
          className="now-playing-cover"
        />
      )}

      <div className="now-playing-info">
        <div className="now-playing-title">{data.title}</div>
        <div className="now-playing-artist">{data.artist}</div>
      </div>

      <div className="now-playing-progress">
        <div
          className="now-playing-progress-bar"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="now-playing-spotify-icon">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
      </div>
    </a>
  )
}
