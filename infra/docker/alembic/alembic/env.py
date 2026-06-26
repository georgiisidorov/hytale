"""
Alembic environment: URL только из DATABASE_URL (никаких паролей в ini).
Запуск: из каталога infra/docker/alembic (или образ hytale-alembic) — `alembic upgrade head`
"""
from __future__ import annotations

import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

config = context.config

if config.config_file_name is not None:
	fileConfig(config.config_file_name)


def get_database_url() -> str:
	url = os.environ.get("DATABASE_URL", "").strip()
	if not url:
		raise RuntimeError("Задайте переменную окружения DATABASE_URL (postgresql://...)")
	# SQLAlchemy для postgresql:// по умолчанию импортирует psycopg2; в requirements — psycopg (v3).
	if "+psycopg" in url.split("://", 1)[0]:
		return url
	if url.startswith("postgresql://"):
		return "postgresql+psycopg://" + url.removeprefix("postgresql://")
	if url.startswith("postgres://"):
		return "postgresql+psycopg://" + url.removeprefix("postgres://")
	return url


def run_migrations_offline() -> None:
	url = get_database_url()
	context.configure(
		url=url,
		literal_binds=True,
		dialect_opts={"paramstyle": "named"},
	)

	with context.begin_transaction():
		context.run_migrations()


def run_migrations_online() -> None:
	url = get_database_url()
	connectable = create_engine(url, poolclass=pool.NullPool)

	with connectable.connect() as connection:
		context.configure(connection=connection, target_metadata=None)

		with context.begin_transaction():
			context.run_migrations()


if context.is_offline_mode():
	run_migrations_offline()
else:
	run_migrations_online()
