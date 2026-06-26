from typing import List

from pydantic import BaseModel


class KitPackItem(BaseModel):
    id: str
    name: str
    price_rub: int
    diamonds: int
    bonus: str = ""
    currency: str = "crystals"


class LootPackItemEntry(BaseModel):
    item_id: str
    quantity: int


class LootPackItem(BaseModel):
    id: str
    name: str
    price_diamonds: int
    items: List[LootPackItemEntry]


class KitPackPurchaseRequest(BaseModel):
    player_uuid: str


class KitPackPurchaseResponse(BaseModel):
    payment_id: str
    payment_url: str
    pack_id: str
    diamonds: int


class LootPackPurchaseRequest(BaseModel):
    player_uuid: str


class LootPackPurchaseResponse(BaseModel):
    ok: bool
    items: List[LootPackItemEntry]
    diamonds_remaining: int


class YooKassaWebhookRequest(BaseModel):
    type: str
    event: str
    object: dict
