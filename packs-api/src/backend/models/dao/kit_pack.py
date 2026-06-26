from typing import Optional

import asyncpg

from src.backend.utils.database_manager import DatabaseManager


class KitPackDAO:
    @classmethod
    async def create_purchase(
        cls,
        conn: asyncpg.Connection,
        payment_id: str,
        player_uuid: str,
        pack_id: str,
        coins_amount: int,
        rub_amount: float,
    ) -> None:
        await DatabaseManager.execute(
            conn,
            """
            INSERT INTO hytale_kit_pack_purchases
                (yookassa_payment_id, player_uuid, pack_id, coins_amount, rub_amount)
            VALUES ($1, $2, $3, $4, $5)
            """,
            payment_id,
            player_uuid.lower().strip(),
            pack_id,
            coins_amount,
            rub_amount,
        )

    @classmethod
    async def get_purchase(
        cls,
        conn: asyncpg.Connection,
        payment_id: str,
    ) -> Optional[asyncpg.Record]:
        return await DatabaseManager.fetch_one(
            conn,
            "SELECT * FROM hytale_kit_pack_purchases WHERE yookassa_payment_id = $1",
            payment_id,
        )

    @classmethod
    async def mark_succeeded(
        cls,
        conn: asyncpg.Connection,
        payment_id: str,
    ) -> bool:
        result = await DatabaseManager.execute(
            conn,
            """
            UPDATE hytale_kit_pack_purchases
            SET status = 'succeeded', fulfilled_at = now()
            WHERE yookassa_payment_id = $1 AND status = 'pending'
            """,
            payment_id,
        )
        return result.endswith("1")

    @classmethod
    async def mark_canceled(
        cls,
        conn: asyncpg.Connection,
        payment_id: str,
    ) -> None:
        await DatabaseManager.execute(
            conn,
            "UPDATE hytale_kit_pack_purchases SET status = 'canceled' WHERE yookassa_payment_id = $1",
            payment_id,
        )
