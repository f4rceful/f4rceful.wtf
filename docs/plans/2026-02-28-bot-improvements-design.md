# Bot Improvements Design

## Overview

Improve the Telegram admin bot for f4rceful.wtf with better UX, reply support, search, stats, and IP banning.

## Changes

### 1. Button Layout (telegram-bot/app/main.py)

Replace single-column 4-button layout with 3-row grid:
- Row 1: [🚫 Ban] [🗑 Delete]
- Row 2: [📌 Pin] [❤️ Like]
- Row 3: [💬 Answer]

### 2. Answer via ForceReply (telegram-bot/app/main.py)

- "Answer" button → bot sends ForceReply message: "Reply with your answer for message #ID"
- In-memory dict `pending_answers: dict[int, int]` maps reply_msg_id → shoutbox_msg_id
- Handler catches replies to ForceReply messages → calls POST /api/bot/messages/:id/action with action=answer

### 3. Search (telegram-bot + server)

- Command: `/find <text>`
- New API endpoint: `GET /api/bot/messages/search?q=<text>&limit=5`
- SQL: `WHERE text ILIKE '%query%' ORDER BY created_at DESC LIMIT $2`
- Returns messages with action keyboards

### 4. Stats (telegram-bot + server)

- Command: `/stats`
- New API endpoint: `GET /api/bot/stats`
- Returns: messages today/7d/30d, visits today/7d/30d

### 5. Ban IP (telegram-bot + server + db)

- New DB table: `banned_ips (ip TEXT PRIMARY KEY, created_at TIMESTAMPTZ DEFAULT NOW())`
- Command: `/ban_ip <ip>`
- Button: [🔴 Ban IP] shown in notifications when IP is known
- New API endpoint: `POST /api/bot/ban-ip` with body `{ip: string}`
- Shoutbox POST middleware: check banned_ips before accepting message
- NewMessageEvent gains `ip: str = ""` field, shoutbox route passes it

## Files to Modify

- `telegram-bot/app/main.py` — all bot changes
- `server/src/routes/bot.ts` — search, stats, ban-ip endpoints
- `server/src/db.ts` — banned_ips table
- `server/src/routes/shoutbox.ts` — IP ban check + pass IP in event
