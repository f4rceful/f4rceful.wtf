import { Router } from 'express'
import { pool } from '../db.js'
import { fetchGeo } from '../utils/geo.js'

interface MessageRow {
  id: number
  text: string
  answer: string | null
  pinned: boolean
  admin_liked: boolean
  created_at: string
  reactions: Record<string, number>
  myReactions: string[]
}

const router = Router()

async function notifyBotAboutMessage(payload: {
  id: number
  text: string
  createdAt: string
  geo: string
}) {
  const eventsUrl = process.env.TELEGRAM_BOT_EVENTS_URL
  const secret = process.env.BOT_SHARED_SECRET

  if (!eventsUrl || !secret) return

  try {
    await fetch(`${eventsUrl}/events/new-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bot-secret': secret,
      },
      body: JSON.stringify(payload),
    })
  } catch {
    // Non-blocking integration: shoutbox must work even if bot is unavailable.
  }
}

async function getAllowedEmojis(): Promise<string[]> {
  const { rows } = await pool.query(`SELECT value FROM settings WHERE key = $1`, ['reaction_emojis'])
  return rows[0] ? JSON.parse(rows[0].value) : ['👍', '❤️', '😂', '😮', '😢', '🔥']
}

async function getReactions(messageIds: number[]): Promise<Record<number, Record<string, number>>> {
  if (messageIds.length === 0) return {}
  const placeholders = messageIds.map((_, i) => `$${i + 1}`).join(',')
  const { rows } = await pool.query(
    `SELECT message_id, emoji, COUNT(*) as count
     FROM reactions WHERE message_id IN (${placeholders})
     GROUP BY message_id, emoji`,
    messageIds
  )

  const result: Record<number, Record<string, number>> = {}
  for (const row of rows) {
    if (!result[row.message_id]) result[row.message_id] = {}
    result[row.message_id][row.emoji] = parseInt(row.count)
  }
  return result
}

async function getUserReactions(messageIds: number[], sessionId: string): Promise<Record<number, string[]>> {
  if (messageIds.length === 0 || !sessionId) return {}
  const placeholders = messageIds.map((_, i) => `$${i + 1}`).join(',')
  const { rows } = await pool.query(
    `SELECT message_id, emoji FROM reactions
     WHERE message_id IN (${placeholders}) AND session_id = $${messageIds.length + 1}`,
    [...messageIds, sessionId]
  )

  const result: Record<number, string[]> = {}
  for (const row of rows) {
    if (!result[row.message_id]) result[row.message_id] = []
    result[row.message_id].push(row.emoji)
  }
  return result
}

router.get('/shoutbox', async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page as string) || 1)
  const sessionId = (req.query.sid as string) || ''
  const limit = 10
  const offset = (page - 1) * limit

  const { rows: messages } = await pool.query(
    `SELECT id, text, answer, pinned, admin_liked, created_at
     FROM messages
     WHERE banned = FALSE
     ORDER BY pinned DESC, created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  )

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) as count FROM messages WHERE banned = FALSE`
  )
  const count = parseInt(countRows[0].count)

  const ids = messages.map((m: MessageRow) => m.id)
  const reactions = await getReactions(ids)
  const userReactions = await getUserReactions(ids, sessionId)

  const enriched = messages.map((m: MessageRow) => ({
    ...m,
    reactions: reactions[m.id] || {},
    myReactions: userReactions[m.id] || [],
  }))

  res.json({
    messages: enriched,
    total: count,
    page,
    totalPages: Math.ceil(count / limit),
  })
})

router.post('/shoutbox', async (req, res) => {
  const { text } = req.body

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    res.status(400).json({ error: 'Text is required' })
    return
  }

  if (text.length > 500) {
    res.status(400).json({ error: 'Text must be 500 characters or less' })
    return
  }

  const ip = req.ip || req.headers['x-forwarded-for'] as string || 'unknown'
  const userAgent = req.headers['user-agent'] || 'unknown'
  const geo = await fetchGeo(ip)

  const { rows } = await pool.query(
    `INSERT INTO messages (text, ip, user_agent, geo) VALUES ($1, $2, $3, $4)
     RETURNING id, text, created_at, geo`,
    [text.trim(), ip, userAgent, geo]
  )

  const inserted = rows[0]
  if (inserted) {
    void notifyBotAboutMessage({
      id: inserted.id,
      text: inserted.text,
      createdAt: inserted.created_at,
      geo: inserted.geo || '{}',
    })
  }

  res.status(201).json({ ok: true })
})

router.post('/shoutbox/:id/react', async (req, res) => {
  const { id } = req.params
  const { emoji, sessionId } = req.body

  if (!emoji || !(await getAllowedEmojis()).includes(emoji)) {
    res.status(400).json({ error: 'Invalid emoji' })
    return
  }
  if (!sessionId) {
    res.status(400).json({ error: 'sessionId required' })
    return
  }

  const { rows: msgRows } = await pool.query(
    `SELECT id FROM messages WHERE id = $1 AND banned = FALSE`, [id]
  )
  if (msgRows.length === 0) {
    res.status(404).json({ error: 'Message not found' })
    return
  }

  const { rows: existing } = await pool.query(
    `SELECT id FROM reactions WHERE message_id = $1 AND emoji = $2 AND session_id = $3`,
    [id, emoji, sessionId]
  )

  if (existing.length > 0) {
    await pool.query(
      `DELETE FROM reactions WHERE message_id = $1 AND emoji = $2 AND session_id = $3`,
      [id, emoji, sessionId]
    )
    res.json({ action: 'removed' })
  } else {
    await pool.query(
      `INSERT INTO reactions (message_id, emoji, session_id) VALUES ($1, $2, $3)`,
      [id, emoji, sessionId]
    )
    res.json({ action: 'added' })
  }
})

export default router
