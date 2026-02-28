import asyncio
import json
import os
from datetime import datetime
from typing import Any

import httpx
import uvicorn
from aiogram import Bot, Dispatcher, F, Router
from aiogram.filters import Command
from aiogram.types import CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, Message
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
API_BASE_URL = os.getenv("API_BASE_URL", "http://api:3001")
BOT_SHARED_SECRET = os.getenv("BOT_SHARED_SECRET", "")
TELEGRAM_ADMIN_IDS = os.getenv("TELEGRAM_ADMIN_IDS", "")
BOT_EVENTS_PORT = int(os.getenv("BOT_EVENTS_PORT", "8080"))

if not BOT_TOKEN:
  raise RuntimeError("TELEGRAM_BOT_TOKEN is required")
if not BOT_SHARED_SECRET:
  raise RuntimeError("BOT_SHARED_SECRET is required")

ADMIN_IDS = {
  int(x.strip())
  for x in TELEGRAM_ADMIN_IDS.split(",")
  if x.strip()
}

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()
router = Router()
app = FastAPI()


class NewMessageEvent(BaseModel):
  id: int
  text: str
  createdAt: str
  geo: str = "{}"


def is_admin(user_id: int | None) -> bool:
  return user_id is not None and user_id in ADMIN_IDS


def action_keyboard(message_id: int) -> InlineKeyboardMarkup:
  buttons = [
    [InlineKeyboardButton(text="Ban", callback_data=f"act:ban:{message_id}")],
    [InlineKeyboardButton(text="Pin", callback_data=f"act:pin:{message_id}")],
    [InlineKeyboardButton(text="Like", callback_data=f"act:like:{message_id}")],
    [InlineKeyboardButton(text="Delete", callback_data=f"act:delete:{message_id}")],
  ]
  return InlineKeyboardMarkup(inline_keyboard=buttons)


def parse_country(geo_raw: str) -> str:
  try:
    geo = json.loads(geo_raw) if geo_raw else {}
  except json.JSONDecodeError:
    geo = {}
  country = geo.get("country")
  return country if isinstance(country, str) and country else "unknown"


async def call_api(
  method: str,
  path: str,
  *,
  json_body: dict[str, Any] | None = None,
  params: dict[str, Any] | None = None,
) -> dict[str, Any]:
  headers = {"x-bot-secret": BOT_SHARED_SECRET}
  async with httpx.AsyncClient(timeout=10.0) as client:
    response = await client.request(
      method,
      f"{API_BASE_URL}{path}",
      headers=headers,
      json=json_body,
      params=params,
    )
    response.raise_for_status()
    return response.json()


def format_event_text(event: NewMessageEvent) -> str:
  try:
    created = datetime.fromisoformat(event.createdAt.replace("Z", "+00:00")).strftime("%Y-%m-%d %H:%M:%S")
  except ValueError:
    created = event.createdAt
  country = parse_country(event.geo)
  return (
    f"New shoutbox message\n"
    f"ID: #{event.id}\n"
    f"Country: {country}\n"
    f"Created: {created}\n\n"
    f"{event.text}"
  )


@router.message(Command("start"))
@router.message(Command("help"))
async def handle_start(message: Message) -> None:
  if not is_admin(message.from_user.id if message.from_user else None):
    await message.answer("Access denied.")
    return
  await message.answer(
    "Commands:\n"
    "/status - API and DB status\n"
    "/metrics - visits and messages metrics\n"
    "/latest - show last 5 messages"
  )


@router.message(Command("status"))
async def handle_status(message: Message) -> None:
  if not is_admin(message.from_user.id if message.from_user else None):
    await message.answer("Access denied.")
    return
  try:
    data = await call_api("GET", "/api/bot/status")
    await message.answer(
      f"Status: {'ok' if data.get('ok') else 'error'}\n"
      f"Uptime: {data.get('uptimeSec', 0)} sec\n"
      f"Time: {data.get('timestamp', '-')}"
    )
  except Exception as exc:
    await message.answer(f"Status error: {exc}")


@router.message(Command("metrics"))
async def handle_metrics(message: Message) -> None:
  if not is_admin(message.from_user.id if message.from_user else None):
    await message.answer("Access denied.")
    return
  try:
    data = await call_api("GET", "/api/bot/overview")
    await message.answer(
      f"Messages total: {data.get('totalMessages', 0)}\n"
      f"Messages today: {data.get('todayMessages', 0)}\n"
      f"Visits total: {data.get('totalVisits', 0)}\n"
      f"Live visitors: {data.get('liveVisitors', 0)}"
    )
  except Exception as exc:
    await message.answer(f"Metrics error: {exc}")


@router.message(Command("latest"))
async def handle_latest(message: Message) -> None:
  if not is_admin(message.from_user.id if message.from_user else None):
    await message.answer("Access denied.")
    return

  try:
    data = await call_api("GET", "/api/bot/messages/recent", params={"limit": 5})
    items = data.get("messages", [])
    if not items:
      await message.answer("No messages yet.")
      return

    for item in reversed(items):
      text = (
        f"Message #{item['id']}\n"
        f"Banned: {item['banned']} | Pinned: {item['pinned']} | Liked: {item['admin_liked']}\n\n"
        f"{item['text']}"
      )
      await message.answer(text, reply_markup=action_keyboard(item["id"]))
  except Exception as exc:
    await message.answer(f"Latest error: {exc}")


@router.callback_query(F.data.startswith("act:"))
async def handle_action(callback: CallbackQuery) -> None:
  user_id = callback.from_user.id if callback.from_user else None
  if not is_admin(user_id):
    await callback.answer("Access denied", show_alert=True)
    return

  try:
    _, action, message_id = (callback.data or "").split(":")
    await call_api(
      "POST",
      f"/api/bot/messages/{message_id}/action",
      json_body={"action": action},
    )
    await callback.answer(f"Done: {action}")
  except Exception as exc:
    await callback.answer(f"Action failed: {exc}", show_alert=True)


@app.get("/health")
async def health() -> dict[str, bool]:
  return {"ok": True}


@app.post("/events/new-message")
async def on_new_message(
  event: NewMessageEvent,
  x_bot_secret: str | None = Header(default=None),
) -> dict[str, bool]:
  if x_bot_secret != BOT_SHARED_SECRET:
    raise HTTPException(status_code=401, detail="Unauthorized")

  if not ADMIN_IDS:
    return {"ok": True}

  text = format_event_text(event)
  for admin_id in ADMIN_IDS:
    try:
      await bot.send_message(admin_id, text, reply_markup=action_keyboard(event.id))
    except Exception:
      # Keep processing even if one chat is unavailable.
      continue

  return {"ok": True}


async def run_fastapi() -> None:
  config = uvicorn.Config(app, host="0.0.0.0", port=BOT_EVENTS_PORT, log_level="info")
  server = uvicorn.Server(config)
  await server.serve()


async def main() -> None:
  dp.include_router(router)
  await asyncio.gather(
    dp.start_polling(bot),
    run_fastapi(),
  )


if __name__ == "__main__":
  asyncio.run(main())
