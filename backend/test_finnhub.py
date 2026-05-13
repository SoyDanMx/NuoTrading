import finnhub
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("FINNHUB_API_KEY")
print(f"Usando API Key: {api_key[:4]}...")

client = finnhub.Client(api_key=api_key)

symbol = "AAPL"
end_date = datetime.now().strftime('%Y-%m-%d')
start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')

print(f"Buscando noticias para {symbol} de {start_date} a {end_date}...")
news = client.company_news(symbol, _from=start_date, to=end_date)

print(f"Noticias encontradas: {len(news)}")
if news:
    print(f"Primera noticia: {news[0].get('headline')}")
else:
    print("No se encontraron noticias. Verifica si la API Key es válida para este endpoint.")
