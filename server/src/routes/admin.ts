import { Router } from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { pool } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.post('/admin/login', async (req, res) => {
  const { password } = req.body

  if (!password || !process.env.ADMIN_PASSWORD_HASH) {
    res.status(401).json({ error: 'Wrong password' })
    return
  }

  const valid = await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH)
  if (!valid) {
    res.status(401).json({ error: 'Wrong password' })
    return
  }

  const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET!, {
    expiresIn: '24h',
  })

  res.json({ token })
})

router.get('/admin/stats', requireAuth, async (_req, res) => {
  const { rows: [{ total }] } = await pool.query(`SELECT COUNT(*) as total FROM messages`)
  const { rows: [{ banned }] } = await pool.query(`SELECT COUNT(*) as banned FROM messages WHERE banned = TRUE`)
  const { rows: [{ replied }] } = await pool.query(`SELECT COUNT(*) as replied FROM messages WHERE answer IS NOT NULL`)
  const { rows: [{ today }] } = await pool.query(
    `SELECT COUNT(*) as today FROM messages WHERE created_at >= NOW() - INTERVAL '1 day'`
  )

  const { rows: topCountries } = await pool.query(
    `SELECT geo FROM messages WHERE geo IS NOT NULL AND geo != '{}'`
  )

  const countryCounts: Record<string, number> = {}
  for (const row of topCountries) {
    try {
      const g = JSON.parse(row.geo)
      if (g.country) countryCounts[g.country] = (countryCounts[g.country] || 0) + 1
    } catch {}
  }
  const countries = Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([country, count]) => ({ country, count }))

  res.json({ total: parseInt(total), banned: parseInt(banned), replied: parseInt(replied), today: parseInt(today), countries })
})

router.get('/admin/messages', requireAuth, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1)
  const limit = 20
  const offset = (page - 1) * limit

  const { rows: messages } = await pool.query(
    `SELECT id, text, author, answer, banned, pinned, admin_liked, ip, user_agent, geo, created_at
     FROM messages
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  )

  const { rows: [{ count }] } = await pool.query(
    `SELECT COUNT(*) as count FROM messages`
  )

  res.json({
    messages,
    total: parseInt(count),
    page,
    totalPages: Math.ceil(parseInt(count) / limit),
  })
})

router.patch('/admin/messages/:id', requireAuth, async (req, res) => {
  const { id } = req.params
  const { banned, answer, pinned, admin_liked } = req.body

  const sets: string[] = []
  const values: unknown[] = []
  let paramIndex = 1

  if (typeof banned === 'boolean') {
    sets.push(`banned = $${paramIndex++}`)
    values.push(banned)
  }

  if (typeof answer === 'string') {
    sets.push(`answer = $${paramIndex++}`)
    values.push(answer)
  }

  if (typeof pinned === 'boolean') {
    sets.push(`pinned = $${paramIndex++}`)
    values.push(pinned)
  }

  if (typeof admin_liked === 'boolean') {
    sets.push(`admin_liked = $${paramIndex++}`)
    values.push(admin_liked)
  }

  if (sets.length === 0) {
    res.status(400).json({ error: 'Nothing to update' })
    return
  }

  values.push(id)
  const result = await pool.query(
    `UPDATE messages SET ${sets.join(', ')} WHERE id = $${paramIndex}`,
    values
  )

  if (!result.rowCount) {
    res.status(404).json({ error: 'Message not found' })
    return
  }

  res.json({ ok: true })
})

router.delete('/admin/messages/:id', requireAuth, async (req, res) => {
  const { id } = req.params
  const result = await pool.query(
    `DELETE FROM messages WHERE id = $1`,
    [id]
  )

  if (!result.rowCount) {
    res.status(404).json({ error: 'Message not found' })
    return
  }

  res.json({ ok: true })
})

router.get('/settings/emojis', async (_req, res) => {
  const { rows } = await pool.query(`SELECT value FROM settings WHERE key = $1`, ['reaction_emojis'])
  const emojis = rows[0] ? JSON.parse(rows[0].value) : ['👍', '❤️', '😂', '😮', '😢', '🔥']
  res.json({ emojis })
})

router.get('/admin/settings', requireAuth, async (_req, res) => {
  const { rows } = await pool.query(`SELECT key, value FROM settings`)
  const settings: Record<string, unknown> = {}
  for (const row of rows) {
    try { settings[row.key] = JSON.parse(row.value) } catch { settings[row.key] = row.value }
  }
  res.json(settings)
})

router.put('/admin/settings', requireAuth, async (req, res) => {
  const { reaction_emojis } = req.body

  if (reaction_emojis !== undefined) {
    if (!Array.isArray(reaction_emojis)) {
      res.status(400).json({ error: 'reaction_emojis must be an array' })
      return
    }
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      ['reaction_emojis', JSON.stringify(reaction_emojis)]
    )
  }

  res.json({ ok: true })
})

export default router
