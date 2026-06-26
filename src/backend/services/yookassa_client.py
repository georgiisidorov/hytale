import uuid
from typing import Optional

import httpx

from src.backend.utils.config import settings

_YOOKASSA_API = "https://api.yookassa.ru/v3"


async def create_payment(
    amount_rub: float,
    description: str,
    metadata: dict,
    return_url: Optional[str] = None,
) -> dict:
    idempotency_key = str(uuid.uuid4())
    payload = {
        "amount": {"value": f"{amount_rub:.2f}", "currency": "RUB"},
        "capture": True,
        "confirmation": {
            "type": "redirect",
            "return_url": return_url or settings.yookassa_return_url,
        },
        "description": description,
        "metadata": metadata,
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            f"{_YOOKASSA_API}/payments",
            json=payload,
            auth=(settings.yookassa_shop_id, settings.yookassa_secret_key),
            headers={"Idempotence-Key": idempotency_key},
        )
        response.raise_for_status()
        return response.json()


async def get_payment(payment_id: str) -> dict:
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            f"{_YOOKASSA_API}/payments/{payment_id}",
            auth=(settings.yookassa_shop_id, settings.yookassa_secret_key),
        )
        response.raise_for_status()
        return response.json()
