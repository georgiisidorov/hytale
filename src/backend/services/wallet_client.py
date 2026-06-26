from typing import Optional

import asyncpg
import httpx

from src.backend.utils.config import settings
from src.backend.utils.database_manager import DatabaseManager


async def debit_currency(player_uuid: str, currency: str, amount: int, reason: str) -> dict:
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            f"{settings.adminpanel_url}/api/hytale/market/wallet/debit",
            json={
                "playerUuid": player_uuid,
                "currency": currency,
                "amount": amount,
                "reason": reason,
            },
            headers={"X-Market-Key": settings.market_catalog_api_key},
        )
        return response.json()


async def debit_coins(player_uuid: str, amount: int, reason: str) -> dict:
    return await debit_currency(player_uuid, "coins", amount, reason)


async def debit_crystals(player_uuid: str, amount: int, reason: str) -> dict:
    return await debit_currency(player_uuid, "crystals", amount, reason)


async def credit_kit_pack(
    conn: asyncpg.Connection,
    player_uuid: str,
    currency: str,
    amount: int,
    payment_id: str,
) -> Optional[dict]:
    """Идемпотентное зачисление валюты (coins / crystals) за кит-пак через YooKassa."""
    norm_uuid = player_uuid.lower().strip()
    player_id = await _ensure_player(conn, norm_uuid)

    dup = await DatabaseManager.fetch_val(
        conn,
        "SELECT 1 FROM hytale_yookassa_wallet_credits WHERE yookassa_payment_id = $1",
        f"kit:{payment_id}",
    )
    if dup:
        return None  # уже зачислено

    await _ensure_balance_row(conn, player_id)

    if currency == "coins":
        update_col = "coins = hytale_player_balance.coins + $2"
    else:
        update_col = "crystals = hytale_player_balance.crystals + $2"

    row = await DatabaseManager.fetch_one(
        conn,
        f"""
        INSERT INTO hytale_player_balance (player_id, coins, crystals, balance)
        VALUES ($1, 0, 0, 0)
        ON CONFLICT (player_id) DO UPDATE
        SET {update_col}, updated_at = now()
        RETURNING coins::text AS coins, crystals::text AS crystals
        """,
        player_id,
        amount,
    )
    await DatabaseManager.execute(
        conn,
        """
        INSERT INTO hytale_balance_txn (player_id, kind, amount, currency, reason)
        VALUES ($1, 'credit', $2, $3, $4)
        """,
        player_id,
        amount,
        currency,
        f"kit_pack:{payment_id}",
    )
    await DatabaseManager.execute(
        conn,
        """
        INSERT INTO hytale_yookassa_wallet_credits
            (yookassa_payment_id, player_id, currency, rub_amount, game_amount)
        VALUES ($1, $2, $3, 0, $4)
        """,
        f"kit:{payment_id}",
        player_id,
        currency,
        amount,
    )
    return {
        "coins": int(row["coins"]),
        "crystals": int(row["crystals"]),
    }


async def credit_diamonds_kit_pack(
    conn: asyncpg.Connection,
    player_uuid: str,
    diamonds_amount: int,
    payment_id: str,
) -> Optional[dict]:
    return await credit_kit_pack(conn, player_uuid, "crystals", diamonds_amount, payment_id)


async def _ensure_player(conn: asyncpg.Connection, player_uuid: str) -> int:
    return await DatabaseManager.fetch_val(
        conn,
        """
        INSERT INTO hytale_players (username)
        VALUES ($1)
        ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username
        RETURNING id
        """,
        player_uuid,
    )


async def _ensure_balance_row(conn: asyncpg.Connection, player_id: int) -> None:
    await DatabaseManager.execute(
        conn,
        """
        INSERT INTO hytale_player_balance (player_id, coins, crystals, balance)
        VALUES ($1, 0, 0, 0)
        ON CONFLICT (player_id) DO NOTHING
        """,
        player_id,
    )
