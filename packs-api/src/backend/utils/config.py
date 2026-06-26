from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    service_name: str = Field(default="hytale-packs-api", env="SERVICE_NAME")
    packs_api_host: str = Field(default="0.0.0.0", env="PACKS_API_HOST")
    packs_api_port: int = Field(default=8766, env="PACKS_API_PORT")
    log_level: str = Field(default="INFO", env="LOG_LEVEL")

    postgres_host: str = Field(env="POSTGRES_HOST")
    postgres_port: int = Field(default=5432, env="POSTGRES_PORT")
    postgres_user: str = Field(env="POSTGRES_USER")
    postgres_password: str = Field(env="POSTGRES_PASSWORD")
    db_name: str = Field(env="DB_NAME")

    yookassa_shop_id: str = Field(env="YOOKASSA_SHOP_ID")
    yookassa_secret_key: str = Field(env="YOOKASSA_SECRET_KEY")
    yookassa_return_url: str = Field(default="https://yookassa.ru/", env="YOOKASSA_RETURN_URL")
    packs_webhook_base_url: str = Field(env="PACKS_WEBHOOK_BASE_URL")

    adminpanel_url: str = Field(env="ADMINPANEL_URL")
    market_catalog_api_key: str = Field(env="MARKET_CATALOG_API_KEY")

    class Config:
        case_sensitive = False
        env_file = ".env"

    def get_database_url(self) -> str:
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.db_name}"
        )


settings = Settings()
