import logging
from typing import List, Dict
from datetime import datetime, timezone, timedelta
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

# Monitored accounts with their Twitter User IDs (resolved once to save API calls)
# Free tier allows GET /2/users/:id/tweets
SIGNAL_ACCOUNTS = [
    {"handle": "eWhispers",       "id": "20119330",           "followers": 150_000,  "accuracy": 0.72, "category": "earnings"},
    {"handle": "unusual_whales",  "id": "1205932598370508800","followers": 890_000,  "accuracy": 0.68, "category": "options"},
    {"handle": "DeItaone",        "id": "33758881",           "followers": 650_000,  "accuracy": 0.61, "category": "breaking"},
    {"handle": "KobeissiLetter",  "id": "1242139049283432448","followers": 420_000,  "accuracy": 0.65, "category": "macro"},
    {"handle": "zerohedge",       "id": "18839785",           "followers": 1_200_000,"accuracy": 0.55, "category": "macro"},
]


class TwitterSignalService:
    """
    Fetches signals from high-accuracy financial Twitter accounts using the Timeline endpoint.
    This is more compatible with restricted API tiers than general search.
    """

    def __init__(self):
        self._total_weight = sum(
            a["followers"] * a["accuracy"] for a in SIGNAL_ACCOUNTS
        )

    async def get_weighted_signals(self, symbol: str) -> Dict:
        bearer = settings.TWITTER_BEARER_TOKEN
        if not bearer:
            return {"weighted_score": 0.0, "top_accounts": [], "error": "No Twitter token"}

        headers = {"Authorization": f"Bearer {bearer}"}
        scored: List[Dict] = []
        
        # Last 12 hours for timeline lookback
        start_time = (datetime.now(timezone.utc) - timedelta(hours=12)).strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        )

        async with httpx.AsyncClient(timeout=10.0) as client:
            for account in SIGNAL_ACCOUNTS:
                try:
                    url = f"https://api.twitter.com/2/users/{account['id']}/tweets"
                    params = {
                        "max_results": 10,
                        "start_time": start_time,
                        "tweet.fields": "created_at,text,public_metrics",
                        "exclude": "retweets,replies"
                    }
                    
                    resp = await client.get(url, headers=headers, params=params)
                    
                    if resp.status_code == 429:
                        logger.warning("Twitter rate limit for %s", account['handle'])
                        continue
                    if resp.status_code != 200:
                        logger.debug("Twitter %s returned %s: %s", account['handle'], resp.status_code, resp.text)
                        continue

                    data = resp.json()
                    tweets = data.get("data", [])
                    
                    for tweet in tweets:
                        text = tweet["text"]
                        # Case insensitive check for symbol with $ or as standalone word
                        if symbol.lower() in text.lower():
                            signal_weight = (account["followers"] * account["accuracy"]) / max(self._total_weight, 1)
                            direction = self._classify_direction(text)
                            
                            scored.append({
                                "handle": account["handle"],
                                "text": text[:200],
                                "signal_weight": round(signal_weight, 6),
                                "direction": direction,
                                "category": account["category"],
                                "created_at": tweet.get("created_at"),
                            })
                            # One signal per account per cycle is enough to prevent bias
                            break 
                            
                except Exception as e:
                    logger.error("Error fetching timeline for %s: %s", account['handle'], e)

        if not scored:
            return {"weighted_score": 0.0, "top_accounts": [], "tweet_count": 0}

        # Weighted sum
        total_w = sum(s["signal_weight"] for s in scored)
        if total_w > 0:
            weighted_score = sum(
                s["direction"] * s["signal_weight"] for s in scored
            ) / total_w
        else:
            weighted_score = 0.0

        weighted_score = max(-1.0, min(1.0, weighted_score))

        return {
            "weighted_score": round(weighted_score, 4),
            "tweet_count": len(scored),
            "top_accounts": [s["handle"] for s in scored if s["direction"] != 0],
            "signals": scored,
        }

    def _classify_direction(self, text: str) -> float:
        text_lower = text.lower()
        bullish_terms = {"buy", "long", "bullish", "calls", "breakout", "beat", "strong", "up", "rally", "🚀", "🟢"}
        bearish_terms = {"sell", "short", "bearish", "puts", "breakdown", "miss", "weak", "down", "crash", "🔴", "⚠️"}

        bull_hits = sum(1 for t in bullish_terms if t in text_lower)
        bear_hits = sum(1 for t in bearish_terms if t in text_lower)

        if bull_hits > bear_hits:
            return 1.0
        elif bear_hits > bull_hits:
            return -1.0
        return 0.0
