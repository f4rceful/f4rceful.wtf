# Bot Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add answer flow, search, stats, IP ban, and better button layout to the Telegram admin bot.

**Architecture:** Changes split across 3 files: `db.ts` (new table), `server/src/routes/bot.ts` + `shoutbox.ts` (new endpoints + IP check), `telegram-bot/app/main.py` (all bot UX).

**Tech Stack:** TypeScript/Express/PostgreSQL (API), Python/aiogram/httpx (bot)

---

### Task 1: Add banned_ips table to DB

**Files:**
- Modify: `server/src/db.ts`

**Step 1: Add table creation after the visits table block (after line 58)**

```ts
await pool.query(`
  CREATE TABLE IF NOT EXISTS banned_ips (
    ip         TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`)
```

**Step 2: Verify manually**
After deploy, run in psql: `\d banned_ips` — should show the table.

**Step 3: Commit**
```bash
git add server/src/db.ts
git commit -m "feat: add banned_ips table"
```

---

### Task 2: Add API endpoints (search, stats, ban-ip)

**Files:**
- Modify: `server/src/routes/bot.ts`

**Step 1: Add search endpoint after `/bot/messages/recent` route**

```ts
router.get('/bot/messages/search', async (req, res) => {
  const q = (req.query.q as string || '').trim()
  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit as string, 10) || 5))

  if (!q) {
    res.status(400).json({ error: 'q is required' })
    return
  }

  const { rows } = await pool.query(
    `SELECT id, text, answer, banned, pinned, admin_liked, created_at
     FROM messages
     WHERE text ILIKE $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [`%${q}%`, limit]
  )

  res.json({ messages: rows as MessageRow[] })
})
```

**Step 2: Add stats endpoint**

```ts
router.get('/bot/stats', async (_req, res) => {
  const query = (interval: string) =>
    Promise.all([
      pool.query(`SELECT COUNT(*)::int AS count FROM messages WHERE created_at >= NOW() - INTERVAL '${interval}'`),
      pool.query(`SELECT COUNT(DISTINCT session_id)::int AS count FROM visits WHERE created_at >= NOW() - INTERVAL '${interval}'`),
    ])

  const [todayMsgs, todayVisits] = await query('1 day')
  const [weekMsgs, weekVisits] = await query('7 days')
  const [monthMsgs, monthVisits] = await query('30 days')

  res.json({
    today: { messages: todayMsgs.rows[0].count, visits: todayVisits.rows[0].count },
    week:  { messages: weekMsgs.rows[0].count,  visits: weekVisits.rows[0].count },
    month: { messages: monthMsgs.rows[0].count, visits: monthVisits.rows[0].count },
  })
})
```

**Step 3: Add ban-ip endpoint**

```ts
router.post('/bot/ban-ip', async (req, res) => {
  const { ip } = req.body as { ip?: string }

  if (!ip || typeof ip !== 'string' || !ip.trim()) {
    res.status(400).json({ error: 'ip is required' })
    return
  }

  await pool.query(
    `INSERT INTO banned_ips (ip) VALUES ($1) ON CONFLICT (ip) DO NOTHING`,
    [ip.trim()]
  )

  res.json({ ok: true, ip: ip.trim() })
})
```

**Step 4: Commit**
```bash
git add server/src/routes/bot.ts
git commit -m "feat: add search, stats, ban-ip bot endpoints"
```

---

### Task 3: Check banned IP in shoutbox + pass IP in notification

**Files:**
- Modify: `server/src/routes/shoutbox.ts`

**Step 1: Update `notifyBotAboutMessage` signature to include ip**

Replace the existing function signature and body:
```ts
async function notifyBotAboutMessage(payload: {
  id: number
  text: string
  createdAt: string
  geo: string
  ip: string
}) {
```
(No change to the body — `payload` is just serialized as JSON already.)

**Step 2: Add banned IP check in POST /shoutbox, after `const ip = ...` line**

Add immediately after `const geo = await fetchGeo(ip)`:
```ts
const { rows: bannedRows } = await pool.query(
  `SELECT ip FROM banned_ips WHERE ip = $1`,
  [ip]
)
if (bannedRows.length > 0) {
  res.status(403).json({ error: 'Forbidden' })
  return
}
```

**Step 3: Pass ip in notifyBotAboutMessage call**

Update the call to include `ip`:
```ts
void notifyBotAboutMessage({
  id: inserted.id,
  text: inserted.text,
  createdAt: inserted.created_at,
  geo: inserted.geo || '{}',
  ip: ip,
})
```

**Step 4: Commit**
```bash
git add server/src/routes/shoutbox.ts
git commit -m "feat: check banned IPs in shoutbox and pass IP to bot notifications"
```

---

### Task 4: Rewrite main.py with all bot improvements

**Files:**
- Modify: `telegram-bot/app/main.py`

**Step 1: Add ForceReply to imports**

```python
from aiogram.types import CallbackQuery, ForceReply, InlineKeyboardButton, InlineKeyboardMarkup, Message
```

**Step 2: Add in-memory pending answers dict (after `ADMIN_IDS` block)**

```python
# reply_msg_id -> shoutbox_msg_id, tracks pending Answer flows
pending_answers: dict[int, int] = {}
```

**Step 3: Update `NewMessageEvent` to include ip**

```python
class NewMessageEvent(BaseModel):
  id: int
  text: str
  createdAt: str
  geo: str = "{}"
  ip: str = ""
```

**Step 4: Replace `action_keyboard` with improved layout + ip button**

```python
def action_keyboard(message_id: int, ip: str = "") -> InlineKeyboardMarkup:
  rows = [
    [
      InlineKeyboardButton(text="🚫 Ban", callback_data=f"act:ban:{message_id}"),
      InlineKeyboardButton(text="🗑 Delete", callback_data=f"act:delete:{message_id}"),
    ],
    [
      InlineKeyboardButton(text="📌 Pin", callback_data=f"act:pin:{message_id}"),
      InlineKeyboardButton(text="❤️ Like", callback_data=f"act:like:{message_id}"),
    ],
    [InlineKeyboardButton(text="💬 Answer", callback_data=f"act:answer:{message_id}")],
  ]
  if ip:
    rows.append([InlineKeyboardButton(text=f"🔴 Ban IP ({ip})", callback_data=f"act:banip:{ip}")])
  return InlineKeyboardMarkup(inline_keyboard=rows)
```

**Step 5: Update `format_event_text` to show IP**

```python
def format_event_text(event: NewMessageEvent) -> str:
  try:
    created = datetime.fromisoformat(event.createdAt.replace("Z", "+00:00")).strftime("%Y-%m-%d %H:%M:%S")
  except ValueError:
    created = event.createdAt
  country = parse_country(event.geo)
  ip_line = f"IP: {event.ip}\n" if event.ip else ""
  return (
    f"New shoutbox message\n"
    f"ID: #{event.id}\n"
    f"Country: {country}\n"
    f"{ip_line}"
    f"Created: {created}\n\n"
    f"{event.text}"
  )
```

**Step 6: Update `/start` and `/help` handler to show new commands**

```python
await message.answer(
  "Commands:\n"
  "/status - API and DB status\n"
  "/metrics - visits and messages metrics\n"
  "/latest - show last 5 messages\n"
  "/find <text> - search messages\n"
  "/stats - statistics by period\n"
  "/ban_ip <ip> - ban an IP address"
)
```

**Step 7: Add `/find` command handler (after `/latest` handler)**

```python
@router.message(Command("find"))
async def handle_find(message: Message) -> None:
  if not is_admin(message.from_user.id if message.from_user else None):
    await message.answer("Access denied.")
    return

  args = (message.text or "").split(maxsplit=1)
  if len(args) < 2 or not args[1].strip():
    await message.answer("Usage: /find <text>")
    return

  try:
    data = await call_api("GET", "/api/bot/messages/search", params={"q": args[1].strip(), "limit": 5})
    items = data.get("messages", [])
    if not items:
      await message.answer("No messages found.")
      return
    for item in items:
      text = (
        f"Message #{item['id']}\n"
        f"Banned: {item['banned']} | Pinned: {item['pinned']} | Liked: {item['admin_liked']}\n\n"
        f"{item['text']}"
      )
      await message.answer(text, reply_markup=action_keyboard(item["id"]))
  except Exception as exc:
    await message.answer(f"Search error: {exc}")
```

**Step 8: Add `/stats` command handler**

```python
@router.message(Command("stats"))
async def handle_stats(message: Message) -> None:
  if not is_admin(message.from_user.id if message.from_user else None):
    await message.answer("Access denied.")
    return

  try:
    data = await call_api("GET", "/api/bot/stats")
    await message.answer(
      f"📊 Statistics\n\n"
      f"Today:\n"
      f"  Messages: {data['today']['messages']}\n"
      f"  Visits: {data['today']['visits']}\n\n"
      f"Last 7 days:\n"
      f"  Messages: {data['week']['messages']}\n"
      f"  Visits: {data['week']['visits']}\n\n"
      f"Last 30 days:\n"
      f"  Messages: {data['month']['messages']}\n"
      f"  Visits: {data['month']['visits']}"
    )
  except Exception as exc:
    await message.answer(f"Stats error: {exc}")
```

**Step 9: Add `/ban_ip` command handler**

```python
@router.message(Command("ban_ip"))
async def handle_ban_ip(message: Message) -> None:
  if not is_admin(message.from_user.id if message.from_user else None):
    await message.answer("Access denied.")
    return

  args = (message.text or "").split(maxsplit=1)
  if len(args) < 2 or not args[1].strip():
    await message.answer("Usage: /ban_ip <ip>")
    return

  try:
    await call_api("POST", "/api/bot/ban-ip", json_body={"ip": args[1].strip()})
    await message.answer(f"IP {args[1].strip()} banned.")
  except Exception as exc:
    await message.answer(f"Ban IP error: {exc}")
```

**Step 10: Add reply handler for Answer flow (before callback handler)**

```python
@router.message(F.reply_to_message)
async def handle_reply(message: Message) -> None:
  if not is_admin(message.from_user.id if message.from_user else None):
    return
  if message.reply_to_message is None:
    return

  shoutbox_id = pending_answers.pop(message.reply_to_message.message_id, None)
  if shoutbox_id is None:
    return

  try:
    await call_api(
      "POST",
      f"/api/bot/messages/{shoutbox_id}/action",
      json_body={"action": "answer", "answer": message.text or ""},
    )
    await message.reply("Answer sent!")
  except Exception as exc:
    await message.reply(f"Failed to send answer: {exc}")
```

**Step 11: Replace `handle_action` callback handler with updated version**

```python
@router.callback_query(F.data.startswith("act:"))
async def handle_action(callback: CallbackQuery) -> None:
  user_id = callback.from_user.id if callback.from_user else None
  if not is_admin(user_id):
    await callback.answer("Access denied", show_alert=True)
    return

  parts = (callback.data or "").split(":", 2)
  if len(parts) < 3:
    await callback.answer("Invalid action", show_alert=True)
    return

  _, action, payload = parts

  if action == "answer":
    message_id = int(payload)
    sent = await callback.message.answer(
      f"Reply to this message with your answer for message #{message_id}:",
      reply_markup=ForceReply(selective=True),
    )
    pending_answers[sent.message_id] = message_id
    await callback.answer("Reply with your answer")
    return

  if action == "banip":
    try:
      await call_api("POST", "/api/bot/ban-ip", json_body={"ip": payload})
      await callback.answer(f"IP {payload} banned", show_alert=True)
    except Exception as exc:
      await callback.answer(f"Failed: {exc}", show_alert=True)
    return

  try:
    await call_api(
      "POST",
      f"/api/bot/messages/{payload}/action",
      json_body={"action": action},
    )
    await callback.answer(f"Done: {action}")
  except Exception as exc:
    await callback.answer(f"Action failed: {exc}", show_alert=True)
```

**Step 12: Update `on_new_message` to pass ip to action_keyboard**

```python
await bot.send_message(admin_id, text, reply_markup=action_keyboard(event.id, event.ip))
```

**Step 13: Commit**
```bash
git add telegram-bot/app/main.py
git commit -m "feat: improve bot UX — answer flow, search, stats, ban IP, better buttons"
```

---

### Task 5: Build and deploy

**Step 1: Build server**
```bash
cd server && npm run build && cd ..
```

**Step 2: Deploy API**
```bash
make deploy-api
```

**Step 3: Deploy bot**
```bash
make deploy-bot
```

**Step 4: Verify all containers running**
```bash
make status
```

**Step 5: Test in Telegram**
- `/status` — should work
- `/stats` — should show stats
- `/find test` — should search
- `/ban_ip 1.2.3.4` — should ban IP
- Send a shoutbox message → notification should show IP + 🔴 Ban IP button
- Click 💬 Answer → bot asks for reply → reply with text → answer appears on site
