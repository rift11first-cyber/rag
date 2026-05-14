from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Local RAG Workspace"
    app_host: str = "127.0.0.1"
    app_port: int = 8000

    data_dir: Path = Path("data")
    qdrant_collection: str = "smart_notes"
    embedding_model: str = "BAAI/bge-m3"
    llm_model: str = "gemini-2.0-flash"
    default_top_k: int = 6
    chunk_size: int = 900
    chunk_overlap: int = 120
    tesseract_cmd: str | None = None

    gemini_api_key: str | None = None
    google_api_key: str | None = None
    openai_api_key: str | None = None

    @property
    def sqlite_path(self) -> Path:
        return self.data_dir / "rag.db"

    @property
    def qdrant_path(self) -> Path:
        return self.data_dir / "qdrant"

    @property
    def uploads_path(self) -> Path:
        return self.data_dir / "uploads"


settings = Settings()
