"""loot_pack_prices

Revision ID: 0009
Revises: 0008
Create Date: 2026-07-02
"""
from alembic import op

revision = "0009"
down_revision = "0008"


def upgrade() -> None:
    op.execute("""
        CREATE TABLE hytale_market_loot_pack_prices (
            pack_id   TEXT PRIMARY KEY,
            pack_name TEXT NOT NULL,
            price_rub NUMERIC(10,2) NOT NULL CHECK (price_rub > 0),
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)
    op.execute("""
        CREATE TRIGGER update_loot_pack_prices_updated_at
            BEFORE UPDATE ON hytale_market_loot_pack_prices
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
    """)
    op.execute("""
        INSERT INTO hytale_market_loot_pack_prices (pack_id, pack_name, price_rub) VALUES
            ('pack_pet_utility',     'Набор питомца',       499.00),
            ('pack_iron_adventurer', 'Набор авантюриста',   599.00),
            ('pack_alchemist_premium','Набор алхимика',     449.00),
            ('pack_builder_premium', 'Набор строителя',     499.00),
            ('pack_royal_decor',     'Набор декора',        899.00)
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS hytale_market_loot_pack_prices")
