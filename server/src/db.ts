import pg from 'pg'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id          SERIAL PRIMARY KEY,
      text        TEXT NOT NULL,
      author      TEXT DEFAULT 'anon',
      answer      TEXT,
      banned      BOOLEAN DEFAULT FALSE,
      ip          TEXT,
      user_agent  TEXT,
      geo         TEXT,
      pinned      BOOLEAN DEFAULT FALSE,
      admin_liked BOOLEAN DEFAULT FALSE,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reactions (
      id          SERIAL PRIMARY KEY,
      message_id  INTEGER NOT NULL,
      emoji       TEXT NOT NULL,
      session_id  TEXT NOT NULL,
      UNIQUE(message_id, emoji, session_id),
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `)
  await pool.query(
    `INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
    ['reaction_emojis', JSON.stringify(['👍', '❤️', '😂', '😮', '😢', '🔥'])]
  )
  await pool.query(`
    CREATE TABLE IF NOT EXISTS visits (
      id          SERIAL PRIMARY KEY,
      session_id  TEXT NOT NULL,
      ip          TEXT,
      user_agent  TEXT,
      geo         TEXT,
      referrer    TEXT,
      path        TEXT DEFAULT '/',
      duration    INTEGER DEFAULT 0,
      created_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_banned_created ON messages(banned, created_at DESC)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_visits_session_id ON visits(session_id)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_visits_created_at ON visits(created_at)`)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS banned_ips (
      ip         TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  console.log('Database initialized (PostgreSQL)')
}

export { pool }
