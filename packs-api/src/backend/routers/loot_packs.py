import logging
from typing import List

from fastapi import APIRouter, HTTPException

from src.backend.models.dto.packs import (
    LootPackItem,
    LootPackItemEntry,
    LootPackPurchaseRequest,
    LootPackPurchaseResponse,
)
from src.backend.models.entity.packs import LOOT_PACKS, LOOT_PACKS_BY_ID
from src.backend.services.wallet_client import debit_crystals

log = logging.getLogger(__name__)
router = APIRouter(prefix="/loot-packs", tags=["loot-packs"])


@router.get("", response_model=List[LootPackItem])
async def list_loot_packs():
    return [
        LootPackItem(
            id=p.id,
            name=p.name,
            price_diamonds=p.price_diamonds,
            items=[LootPackItemEntry(item_id=i.item_id, quantity=i.quantity) for i in p.items],
        )
        for p in LOOT_PACKS
    ]


@router.post("/{pack_id}/purchase", response_model=LootPackPurchaseResponse)
async def purchase_loot_pack(pack_id: str, body: LootPackPurchaseRequest):
    pack = LOOT_PACKS_BY_ID.get(pack_id)
    if not pack:
        raise HTTPException(status_code=404, detail="Loot pack not found")

    player_uuid = body.player_uuid.strip().lower()
    if not player_uuid:
        raise HTTPException(status_code=400, detail="player_uuid required")

    result = await debit_crystals(
        player_uuid=player_uuid,
        amount=pack.price_diamonds,
        reason=f"loot_pack:{pack.id}",
    )

    if not result.get("ok"):
        raise HTTPException(
            status_code=409,
            detail=result.get("error", "Недостаточно алмазов"),
        )

    items = [LootPackItemEntry(item_id=i.item_id, quantity=i.quantity) for i in pack.items]
    log.info("loot_pack_purchased pack=%s player=%s diamonds_spent=%d", pack.id, player_uuid, pack.price_diamonds)

    return LootPackPurchaseResponse(
        ok=True,
        items=items,
        diamonds_remaining=result.get("crystals", 0),
    )
