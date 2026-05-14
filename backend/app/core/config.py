from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Union

class Settings(BaseSettings):
    # Application
    PROJECT_NAME: str = "NUO TRADE"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/nuotrade"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS (env may be comma-separated string, e.g. CORS_ORIGINS=http://localhost:3000,http://localhost:3001)
    CORS_ORIGINS: Union[str, List[str]] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3004",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3004",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        if isinstance(v, str):
            return [x.strip() for x in v.split(",") if x.strip()]
        return v

    # Exchange API Keys (Optional - configure as needed)
    BINANCE_API_KEY: str = ""
    BINANCE_API_SECRET: str = ""
    COINBASE_API_KEY: str = ""
    COINBASE_API_SECRET: str = ""
    
    # Market Data APIs
    FINNHUB_API_KEY: str = "demo"
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    DEEPSEEK_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    AI_PROVIDER: str = "openai" # Options: openai, gemini, deepseek, groq, anthropic, smart
    
    # Technical Memory (Obsidian)
    OBSIDIAN_VAULT_PATH: str = "" # Absolute path to Obsidian vault
    
    class Config:
        # Load .env from backend/ and from project root (for Docker/local)
        env_file = [".env", "../.env"]
        case_sensitive = True
        extra = "ignore"

settings = Settings()
