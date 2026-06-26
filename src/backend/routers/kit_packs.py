import logging
from typing import List

from fastapi import APIRouter, HTTPException

from src.backend.models.dao.kit_pack import KitPackDAO
from src.backend.models.dto.packs import (
    KitPackItem,
    KitPackPurchaseRequest,
    KitPackPurchaseResponse,
    YooKassaWebhookRequest,
)
from src.backend.models.entity.packs import KIT_PACKS, KIT_PACKS_BY_ID
from src.backend.services.wallet_client import credit_kit_pack
from src.backend.services.yookassa_client import create_payment
from src.backend.utils.config import settings
from src.backend.utils.database_manager import DatabaseManager

log = logging.getLogger(__name__)
router = APIRouter(prefix="/kit-packs", tags=["kit-packs"])


@router.get("", response_model=List[KitPackItem])
async def list_kit_packs():
    return [
        KitPackItem(id=p.id, name=p.name, price_rub=p.price_rub, diamonds=p.diamonds, bonus=p.bonus, currency=p.currency)
        for p in KIT_PACKS
    ]


@router.post("/{pack_id}/purchase", response_model=KitPackPurchaseResponse)
async def purchase_kit_pack(pack_id: str, body: KitPackPurchaseRequest):
    pack = KIT_PACKS_BY_ID.get(pack_id)
    if not pack:
        raise HTTPException(status_code=404, detail="Diamond pack not found")

    player_uuid = body.player_uuid.strip().lower()
    if not player_uuid:
        raise HTTPException(status_code=400, detail="player_uuid required")

    webhook_url = f"{settings.packs_webhook_base_url}/api/v1/kit-packs/webhook/yookassa"
    pack_type = "coin" if pack.currency == "coins" else "diamond"
    payment = await create_payment(
        amount_rub=pack.price_rub,
        description=f"Пак «{pack.name}»",
        metadata={
            "pack_type": pack_type,
            "pack_id": pack.id,
            "player_uuid": player_uuid,
            "credit_currency": pack.currency,
        },
        return_url=webhook_url,
    )

    payment_id = payment["id"]
    confirmation_url = payment.get("confirmation", {}).get("confirmation_url", "")

    db = DatabaseManager()
    async with db.get_connection() as conn:
        await KitPackDAO.create_purchase(
            conn,
            payment_id=payment_id,
            player_uuid=player_uuid,
            pack_id=pack.id,
            coins_amount=pack.diamonds,
            rub_amount=pack.price_rub,
        )

    log.info("diamond_pack_payment_created pack=%s player=%s payment=%s", pack.id, player_uuid, payment_id)
    return KitPackPurchaseResponse(
        payment_id=payment_id,
        payment_url=confirmation_url,
        pack_id=pack.id,
        diamonds=pack.diamonds,
    )


@router.post("/webhook/yookassa")
async def yookassa_kit_webhook(body: YooKassaWebhookRequest):
    if body.type != "notification":
        return {"ok": True}

    payment_obj = body.object
    payment_id = payment_obj.get("id", "")
    status = payment_obj.get("status", "")

    if not payment_id:
        return {"ok": True}

    db = DatabaseManager()
    if status == "succeeded":
        async with db.transaction() as conn:
            purchase = await KitPackDAO.get_purchase(conn, payment_id)
            if purchase is None:
                log.warning("kit_webhook_unknown_payment payment_id=%s", payment_id)
                return {"ok": True}

            updated = await KitPackDAO.mark_succeeded(conn, payment_id)
            if not updated:
                log.info("kit_webhook_already_fulfilled payment_id=%s", payment_id)
                return {"ok": True}

            pack_meta = KIT_PACKS_BY_ID.get(purchase["pack_id"])
            currency = pack_meta.currency if pack_meta else "crystals"
            await credit_kit_pack(
                conn,
                player_uuid=purchase["player_uuid"],
                currency=currency,
                amount=purchase["coins_amount"],
                payment_id=payment_id,
            )
            log.info(
                "kit_pack_fulfilled pack=%s player=%s amount=%d currency=%s",
                purchase["pack_id"],
                purchase["player_uuid"],
                purchase["coins_amount"],
                currency,
            )

    elif status == "canceled":
        async with db.get_connection() as conn:
            await KitPackDAO.mark_canceled(conn, payment_id)

    return {"ok": True}
