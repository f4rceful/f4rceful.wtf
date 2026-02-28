import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { initDb, pool } from './db.js'
import shoutboxRoutes from './routes/shoutbox.js'
import adminRoutes from './routes/admin.js'
import analyticsRoutes from './routes/analytics.js'
import spotifyRoutes from './routes/spotify.js'
import wakatimeRoutes from './routes/wakatime.js'
import botRoutes from './routes/bot.js'

const app = express()
const port = parseInt(process.env.PORT || '3001')

app.use(cors({ origin: process.env.CORS_ORIGIN || 'https://f4rceful.wtf' }))
app.use(express.json())

if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET not set')

app.get('/api/health', (_req, res) => { res.json({ ok: true }) })

app.use('/api', shoutboxRoutes)
app.use('/api', adminRoutes)
app.use('/api', analyticsRoutes)
app.use('/api', spotifyRoutes)
app.use('/api', wakatimeRoutes)
app.use('/api', botRoutes)

await initDb()
const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})

const shutdown = () => {
  console.log('Shutting down...')
  server.close(() => {
    pool.end().then(() => process.exit(0))
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
