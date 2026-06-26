#!/usr/bin/env python3
"""Обратный отсчёт в Telegram-группе до заданной даты/времени (локальный TZ)."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import socks
from telethon import TelegramClient
from telethon.errors import MessageNotModifiedError, RPCError

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
log = logging.getLogger("telegram-countdown")

STATE_PATH = Path(os.environ.get("STATE_PATH", "/data/state.json"))
SESSION_PATH = os.environ.get("TELEGRAM_SESSION_PATH", "/data/session")
GROUP_ID = int(os.environ["TELEGRAM_GROUP_ID"])
API_ID = int(os.environ["TELEGRAM_API_ID"])
API_HASH = os.environ["TELEGRAM_API_HASH"]
COUNTDOWN_TARGET = os.environ.get("COUNTDOWN_TARGET", "2026-06-05T21:00:00")
TICK_SECONDS = int(os.environ.get("TICK_INTERVAL_SECONDS", "300"))
FINAL_TEXT = os.environ.get(
    "COUNTDOWN_FINAL_TEXT",
    "КОМУ-ТО ПИЗДА 😈😈😈",
)


def local_tz():
    """Termux/сервер: TZ из .env или системный пояс (на телефоне — как в настройках)."""
    tz_name = os.environ.get("TZ", "").strip()
    if tz_name:
        return ZoneInfo(tz_name)
    return datetime.now().astimezone().tzinfo


def parse_target() -> datetime:
    target = datetime.fromisoformat(COUNTDOWN_TARGET.strip())
    tz = local_tz()
    if target.tzinfo is None:
        target = target.replace(tzinfo=tz)
    return target


def remaining_seconds() -> int:
    target = parse_target()
    now = datetime.now(target.tzinfo)
    return max(0, int((target - now).total_seconds()))


def format_text(total_seconds: int) -> str:
    total_seconds = max(0, total_seconds)
    hours = total_seconds // 3600
    minutes = (total_seconds % 3600) // 60
    seconds = total_seconds % 60
    return f"ОСТАЛОСЬ ~{hours}:{minutes:02d}:{seconds:02d}"


def parse_proxy() -> tuple | None:
    raw = os.environ.get("TELEGRAM_PROXY", "").strip()
    if not raw:
        return None
    parts = raw.split(":")
    if len(parts) != 4:
        raise ValueError(
            "TELEGRAM_PROXY: нужен формат host:port:user:pass "
            f"(получено {len(parts)} частей)"
        )
    host, port_s, username, password = parts
    return (socks.SOCKS5, host, int(port_s), True, username, password)


def create_client() -> TelegramClient:
    proxy = parse_proxy()
    if proxy:
        _, host, port, _, username, _ = proxy
        log.info("SOCKS5 прокси: %s:%s (user=%s)", host, port, username)
    return TelegramClient(SESSION_PATH, API_ID, API_HASH, proxy=proxy)


def load_state() -> dict:
    if not STATE_PATH.exists():
        return {}
    try:
        return json.loads(STATE_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        log.warning("Не удалось прочитать state: %s", exc)
        return {}


def save_state(state: dict) -> None:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(
        json.dumps(state, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


async def ensure_message(
    client: TelegramClient,
    entity,
    state: dict,
) -> int:
    message_id = state.get("message_id")
    if message_id is not None:
        return message_id

    text = format_text(remaining_seconds())
    log.info("Создаём сообщение: %s", text)
    msg = await client.send_message(entity, text)
    state["message_id"] = msg.id
    state["last_tick_at"] = time.time()
    save_state(state)
    return msg.id


async def edit_message_text(
    client: TelegramClient,
    entity,
    message_id: int,
    text: str,
) -> None:
    try:
        await client.edit_message(entity, message_id, text)
        log.info("Обновлено: %s (msg_id=%s)", text, message_id)
    except MessageNotModifiedError:
        log.info("Текст уже такой же, пропуск: %s", text)
    except RPCError as exc:
        log.error("Ошибка редактирования msg_id=%s: %s", message_id, exc)
        raise


async def edit_countdown(
    client: TelegramClient,
    entity,
    message_id: int,
) -> None:
    await edit_message_text(
        client, entity, message_id, format_text(remaining_seconds())
    )


async def finish_countdown(
    client: TelegramClient,
    entity,
    message_id: int,
    state: dict,
) -> None:
    await edit_message_text(client, entity, message_id, FINAL_TEXT)
    state["finished"] = True
    save_state(state)
    log.info("Финальная надпись установлена")


async def wait_next_tick(state: dict) -> None:
    last = state.get("last_tick_at")
    if last is None:
        state["last_tick_at"] = time.time()
        save_state(state)
        wait = float(TICK_SECONDS)
    else:
        elapsed = time.time() - float(last)
        wait = max(0.0, TICK_SECONDS - elapsed)
    if wait > 0:
        log.info("До следующего тика: %.0f с", wait)
        await asyncio.sleep(wait)


async def run() -> None:
    state = load_state()

    if state.get("finished"):
        log.info("Отсчёт уже завершён, ничего не делаем")
        return

    target = parse_target()
    log.info(
        "Цель: %s (TZ=%s), сейчас: %s",
        target.strftime("%d.%m.%Y %H:%M:%S"),
        target.tzinfo,
        datetime.now(target.tzinfo).strftime("%d.%m.%Y %H:%M:%S"),
    )

    client = create_client()
    await client.start()
    if not await client.is_user_authorized():
        log.error(
            "Сессия не авторизована. Один раз запустите интерактивно "
            "(Termux: ./run.sh | Docker: docker compose run --rm -it telegram-countdown)"
        )
        await client.disconnect()
        raise SystemExit(1)

    entity = await client.get_entity(GROUP_ID)
    message_id = await ensure_message(client, entity, state)

    if remaining_seconds() <= 0:
        await finish_countdown(client, entity, message_id, state)
        await client.disconnect()
        return

    await edit_countdown(client, entity, message_id)

    while remaining_seconds() > 0:
        await wait_next_tick(state)
        state["last_tick_at"] = time.time()
        save_state(state)

        if remaining_seconds() <= 0:
            break

        await edit_countdown(client, entity, message_id)

    await finish_countdown(client, entity, message_id, state)
    await client.disconnect()


def main() -> None:
    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        log.info("Остановлено")


if __name__ == "__main__":
    main()
