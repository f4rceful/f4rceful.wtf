import { Router } from 'express'
import { pool } from '../db.js'
import { requireAuth } from '../middleware/auth.js'
import { fetchGeo } from '../utils/geo.js'

const router = Router()

router.post('/analytics/visit', async (req, res) => {
  const { sessionId, referrer, path } = req.body
  if (!sessionId || typeof sessionId !== 'string') {
    res.status(400).json({ error: 'sessionId required' })
    return
  }

  const ip = req.ip || req.headers['x-forwarded-for'] as string || 'unknown'
  const userAgent = req.headers['user-agent'] || 'unknown'
  const geo = await fetchGeo(ip)

  await pool.query(
    `INSERT INTO visits (session_id, ip, user_agent, geo, referrer, path)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [sessionId, ip, userAgent, geo, referrer || '', path || '/']
  )

  res.json({ ok: true })
})

router.patch('/analytics/visit', async (req, res) => {
  const { sessionId, duration } = req.body
  if (!sessionId) {
    res.status(400).json({ error: 'sessionId required' })
    return
  }

  await pool.query(
    `UPDATE visits SET duration = $1 WHERE session_id = $2 AND id = (
       SELECT id FROM visits WHERE session_id = $3 ORDER BY created_at DESC LIMIT 1
     )`,
    [duration || 0, sessionId, sessionId]
  )

  res.json({ ok: true })
})

router.post('/analytics/beacon', async (req, res) => {
  const { sessionId, duration } = req.body
  if (!sessionId) {
    res.status(400).json({ error: 'sessionId required' })
    return
  }

  await pool.query(
    `UPDATE visits SET duration = $1 WHERE session_id = $2 AND id = (
       SELECT id FROM visits WHERE session_id = $3 ORDER BY created_at DESC LIMIT 1
     )`,
    [duration || 0, sessionId, sessionId]
  )

  res.json({ ok: true })
})

router.get('/analytics/counter', async (_req, res) => {
  const { rows: [{ total }] } = await pool.query(
    `SELECT COUNT(*) as total FROM visits`
  )

  const { rows: [{ live }] } = await pool.query(
    `SELECT COUNT(DISTINCT session_id) as live FROM visits WHERE created_at >= NOW() - INTERVAL '5 minutes'`
  )

  res.json({ total: parseInt(total), live: parseInt(live) })
})

router.get('/admin/analytics', requireAuth, async (_req, res) => {
  const { rows: [{ total }] } = await pool.query(
    `SELECT COUNT(*) as total FROM visits`
  )

  const { rows: [{ unique: uniqueCount }] } = await pool.query(
    `SELECT COUNT(DISTINCT ip) as "unique" FROM visits`
  )

  const { rows: [{ today }] } = await pool.query(
    `SELECT COUNT(*) as today FROM visits WHERE created_at >= NOW() - INTERVAL '1 day'`
  )

  const { rows: [{ live }] } = await pool.query(
    `SELECT COUNT(DISTINCT session_id) as live FROM visits WHERE created_at >= NOW() - INTERVAL '5 minutes'`
  )

  const { rows: [{ avgduration }] } = await pool.query(
    `SELECT COALESCE(AVG(duration), 0) as avgduration FROM visits WHERE duration > 0`
  )

  const { rows: [{ bounces }] } = await pool.query(
    `SELECT COUNT(*) as bounces FROM visits WHERE duration < 5`
  )
  const totalNum = parseInt(total)
  const bounceRate = totalNum > 0 ? Math.round((parseInt(bounces) / totalNum) * 100) : 0

  const { rows: dailyVisits } = await pool.query(
    `SELECT created_at::date as day, COUNT(*) as count
     FROM visits
     WHERE created_at >= NOW() - INTERVAL '7 days'
     GROUP BY created_at::date
     ORDER BY day ASC`
  )

  const { rows: hourlyVisits } = await pool.query(
    `SELECT TO_CHAR(created_at, 'HH24') as hour, COUNT(*) as count
     FROM visits
     WHERE created_at >= NOW() - INTERVAL '1 day'
     GROUP BY TO_CHAR(created_at, 'HH24')
     ORDER BY hour ASC`
  )

  const { rows: topReferrers } = await pool.query(
    `SELECT referrer, COUNT(*) as count FROM visits
     WHERE referrer != '' AND referrer IS NOT NULL
     GROUP BY referrer ORDER BY count DESC LIMIT 5`
  )

  const { rows: topPages } = await pool.query(
    `SELECT path, COUNT(*) as count FROM visits
     GROUP BY path ORDER BY count DESC LIMIT 5`
  )

  const { rows: deviceRows } = await pool.query(
    `SELECT
       CASE WHEN user_agent ~* 'mobile|android|iphone|ipad' THEN 'mobile' ELSE 'desktop' END AS device,
       COUNT(*) AS count
     FROM visits WHERE user_agent IS NOT NULL
     GROUP BY device`
  )
  const devices: Record<string, number> = { mobile: 0, desktop: 0 }
  for (const row of deviceRows) devices[row.device] = parseInt(row.count)

  const { rows: countries } = await pool.query(
    `SELECT (geo::json->>'country') AS country, COUNT(*) AS count
     FROM visits
     WHERE geo IS NOT NULL AND geo != '{}' AND (geo::json->>'country') IS NOT NULL
     GROUP BY country ORDER BY count DESC LIMIT 5`
  )

  const { rows: topBrowsers } = await pool.query(
    `SELECT
       CASE
         WHEN user_agent ~* 'firefox' THEN 'Firefox'
         WHEN user_agent ~* 'edg' THEN 'Edge'
         WHEN user_agent ~* 'chrome|chromium|crios' THEN 'Chrome'
         WHEN user_agent ~* 'safari' THEN 'Safari'
         WHEN user_agent ~* 'opera|opr' THEN 'Opera'
         ELSE 'Other'
       END AS browser,
       COUNT(*) AS count
     FROM visits WHERE user_agent IS NOT NULL
     GROUP BY browser ORDER BY count DESC LIMIT 5`
  )

  res.json({
    total: totalNum, unique: parseInt(uniqueCount), today: parseInt(today), live: parseInt(live),
    avgDuration: Math.round(parseFloat(avgduration)),
    bounceRate,
    dailyVisits: dailyVisits.map(r => ({ day: r.day, count: parseInt(r.count) })),
    hourlyVisits: hourlyVisits.map(r => ({ hour: r.hour, count: parseInt(r.count) })),
    topReferrers: topReferrers.map(r => ({ referrer: r.referrer, count: parseInt(r.count) })),
    topPages: topPages.map(r => ({ path: r.path, count: parseInt(r.count) })),
    devices,
    countries: countries.map(r => ({ country: r.country, count: parseInt(r.count) })),
    topBrowsers: topBrowsers.map(r => ({ browser: r.browser, count: parseInt(r.count) })),
  })
})

export default router
