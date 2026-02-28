import { Router } from 'express'
import { pool } from '../db.js'
import { requireBotAuth } from '../middleware/bot-auth.js'

interface MessageRow {
  id: number
  text: string
  answer: string | null
  banned: boolean
  pinned: boolean
  admin_liked: boolean
  created_at: string
}

const router = Router()

router.use('/bot', requireBotAuth)

router.get('/bot/status', async (_req, res) => {
  await pool.query('SELECT 1')

  res.json({
    ok: true,
    uptimeSec: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  })
})

router.get('/bot/overview', async (_req, res) => {
  const { rows: [{ total_messages }] } = await pool.query(
    `SELECT COUNT(*)::int AS total_messages FROM messages`
  )
  const { rows: [{ today_messages }] } = await pool.query(
    `SELECT COUNT(*)::int AS today_messages FROM messages WHERE created_at >= NOW() - INTERVAL '1 day'`
  )
  const { rows: [{ total_visits }] } = await pool.query(
    `SELECT COUNT(*)::int AS total_visits FROM visits`
  )
  const { rows: [{ live_visitors }] } = await pool.query(
    `SELECT COUNT(DISTINCT session_id)::int AS live_visitors FROM visits WHERE created_at >= NOW() - INTERVAL '5 minutes'`
  )

  res.json({
    totalMessages: total_messages,
    todayMessages: today_messages,
    totalVisits: total_visits,
    liveVisitors: live_visitors,
  })
})

router.get('/bot/messages/recent', async (req, res) => {
  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit as string, 10) || 5))

  const { rows } = await pool.query(
    `SELECT id, text, answer, banned, pinned, admin_liked, created_at
     FROM messages
     ORDER BY created_at DESC
     LIMIT $1`,
    [limit]
  )

  res.json({
    messages: rows as MessageRow[],
  })
})

router.post('/bot/messages/:id/action', async (req, res) => {
  const { id } = req.params
  const { action, answer } = req.body as { action?: string; answer?: string }

  if (!action) {
    res.status(400).json({ error: 'Action is required' })
    return
  }

  if (action === 'delete') {
    const deleted = await pool.query('DELETE FROM messages WHERE id = $1', [id])
    if (!deleted.rowCount) {
      res.status(404).json({ error: 'Message not found' })
      return
    }
    res.json({ ok: true, action })
    return
  }

  const allowedActions = new Set(['ban', 'unban', 'pin', 'unpin', 'like', 'unlike', 'answer'])
  if (!allowedActions.has(action)) {
    res.status(400).json({ error: 'Unsupported action' })
    return
  }

  let sql = ''
  let values: unknown[] = [id]

  if (action === 'ban') sql = 'UPDATE messages SET banned = TRUE WHERE id = $1'
  if (action === 'unban') sql = 'UPDATE messages SET banned = FALSE WHERE id = $1'
  if (action === 'pin') sql = 'UPDATE messages SET pinned = TRUE WHERE id = $1'
  if (action === 'unpin') sql = 'UPDATE messages SET pinned = FALSE WHERE id = $1'
  if (action === 'like') sql = 'UPDATE messages SET admin_liked = TRUE WHERE id = $1'
  if (action === 'unlike') sql = 'UPDATE messages SET admin_liked = FALSE WHERE id = $1'
  if (action === 'answer') {
    sql = 'UPDATE messages SET answer = $2 WHERE id = $1'
    values = [id, (answer || '').trim()]
  }

  const updated = await pool.query(sql, values)
  if (!updated.rowCount) {
    res.status(404).json({ error: 'Message not found' })
    return
  }

  res.json({ ok: true, action })
})

export default router
