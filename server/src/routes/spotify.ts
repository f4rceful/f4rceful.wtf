import { Router } from 'express'

const router = Router()

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || ''
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || ''
const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN || ''

const BASIC_AUTH = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')

async function getAccessToken(): Promise<string | null> {
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    return null
  }

  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${BASIC_AUTH}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: REFRESH_TOKEN,
      }),
    })

    if (!res.ok) return null

    const data = await res.json()
    return data.access_token
  } catch {
    return null
  }
}

router.get('/spotify/now-playing', async (_req, res) => {
  const accessToken = await getAccessToken()

  if (!accessToken) {
    res.json({ isPlaying: false })
    return
  }

  try {
    const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    if (response.status === 204 || response.status > 400) {
      res.json({ isPlaying: false })
      return
    }

    const data = await response.json()

    if (!data || !data.item) {
      res.json({ isPlaying: false })
      return
    }

    res.json({
      isPlaying: data.is_playing,
      title: data.item.name,
      artist: data.item.artists.map((a: any) => a.name).join(', '),
      album: data.item.album.name,
      albumArt: data.item.album.images[0]?.url,
      songUrl: data.item.external_urls.spotify,
      progress: data.progress_ms,
      duration: data.item.duration_ms,
    })
  } catch {
    res.json({ isPlaying: false })
  }
})

export default router
