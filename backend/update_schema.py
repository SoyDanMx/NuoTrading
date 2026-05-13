import os
from dotenv import load_dotenv
import sqlalchemy
from sqlalchemy import text

env_path = os.path.join(os.getcwd(), '.env')
load_dotenv(env_path, override=True)

db_url = os.environ.get("DATABASE_URL")

def update_schema():
    try:
        engine = sqlalchemy.create_engine(db_url)
        with engine.connect() as conn:
            print("📦 Ajustando tabla sentiment_scores para coincidir con la lógica solicitada...")
            
            # Renombrar columnas si existen
            conn.execute(text("ALTER TABLE trading.sentiment_scores RENAME COLUMN time TO created_at;"))
            conn.execute(text("ALTER TABLE trading.sentiment_scores RENAME COLUMN sentiment_score TO score;"))
            conn.execute(text("ALTER TABLE trading.sentiment_scores RENAME COLUMN news_analyzed TO news_count;"))
            
            conn.commit()
            print("✅ Tabla actualizada correctamente.")
            
    except Exception as e:
        print(f"⚠️ Nota: Es posible que las columnas ya tengan el nombre correcto o hubo un detalle: {e}")

if __name__ == "__main__":
    update_schema()
