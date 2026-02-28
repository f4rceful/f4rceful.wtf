# Frankenstein stack (Node + Python + Rust)

This setup adds:
- `server/` as your main API (Express + PostgreSQL)
- `telegram-bot/` on Python (`aiogram`) for Telegram admin control
- `rust-service/` for heavy/scoring workloads

## 1) Required env vars

Set these in your shell or `.env` for Docker Compose:

```bash
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_ADMIN_IDS=111111111,222222222
BOT_SHARED_SECRET=super-long-random-secret
JWT_SECRET=another-strong-secret
ADMIN_PASSWORD_HASH=$2b$10$...
```

`ADMIN_PASSWORD_HASH` can be generated in `server/`:

```bash
node -e "console.log(require('bcryptjs').hashSync('your-password', 10))"
```

## 2) Run all services

```bash
docker compose up --build
```

Services:
- API: `http://localhost:3001`
- Telegram bot events endpoint: `http://localhost:8080`
- Rust service: `http://localhost:8081`
- Postgres: `localhost:5432`

## 3) Telegram usage

Available bot commands:
- `/status` - API and DB status
- `/metrics` - visits/messages counters
- `/latest` - last 5 shoutbox messages

On every new shoutbox message, bot sends instant notification with inline actions:
- `Ban`
- `Pin`
- `Like`
- `Delete`

## 4) New API endpoints for bot

Protected by header `x-bot-secret: <BOT_SHARED_SECRET>`:

- `GET /api/bot/status`
- `GET /api/bot/overview`
- `GET /api/bot/messages/recent?limit=5`
- `POST /api/bot/messages/:id/action` with JSON `{ "action": "ban|unban|pin|unpin|like|unlike|delete|answer", "answer": "..." }`

## 5) Event flow

1. User sends shoutbox message.
2. API saves message and posts event to `telegram-bot/events/new-message`.
3. Bot forwards message to admin Telegram chats.
4. Admin clicks inline action.
5. Bot calls protected API `/api/bot/messages/:id/action`.
