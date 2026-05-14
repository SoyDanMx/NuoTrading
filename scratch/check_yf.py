import yfinance as yf
try:
    t = yf.Ticker("AAPL")
    print(f"Fast info type: {type(t.fast_info)}")
    print(f"Keys: {t.fast_info.keys()}")
    print(f"Price: {t.fast_info['lastPrice']}")
    print(f"Price via get: {t.fast_info.get('lastPrice')}")
except Exception as e:
    print(f"Error: {e}")
