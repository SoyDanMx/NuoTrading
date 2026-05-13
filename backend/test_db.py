import os
from dotenv import load_dotenv
import sqlalchemy
from sqlalchemy import text

env_path = os.path.join(os.getcwd(), '.env')
load_dotenv(env_path, override=True)

db_url = os.environ.get("DATABASE_URL")

def test():
    try:
        engine = sqlalchemy.create_engine(db_url)
        with engine.connect() as conn:
            print("✅ ¡CONEXIÓN EXITOSA!")
            result = conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema = 'trading'"))
            tables = [row[0] for row in result]
            if tables:
                print(f"Tablas encontradas: {', '.join(tables)}")
            else:
                print("⚠️ Conexión exitosa pero no hay tablas en el schema 'trading'.")
    except Exception as e:
        print(f"❌ FALLÓ: {e}")

if __name__ == "__main__":
    test()
