import { Router } from 'express'

const router = Router()

const WAKATIME_API_KEY = process.env.WAKATIME_API_KEY || ''

router.get('/wakatime/stats', async (_req, res) => {
  if (!WAKATIME_API_KEY) {
    res.status(503).json({ error: 'WakaTime API key not configured' })
    return
  }

  try {
    const auth = Buffer.from(WAKATIME_API_KEY).toString('base64')
    const response = await fetch('https://wakatime.com/api/v1/users/current/stats/last_7_days', {
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    })

    if (!response.ok) {
      throw new Error(`WakaTime API responded with status ${response.status}`)
    }

    const data = await response.json()

    res.json({
      human_readable_total: data.data.human_readable_total,
      languages: data.data.languages?.slice(0, 5).map((l: any) => ({
        name: l.name,
        percent: l.percent,
        text: l.text,
      })) || [],
    })
  } catch {
    res.status(500).json({ error: 'Failed to fetch WakaTime stats' })
  }
})

export default router
