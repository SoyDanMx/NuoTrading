import logging
import json
from typing import List, Dict
from datetime import datetime, timezone, timedelta
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

# Monitored accounts with initial accuracy priors (updated live in DB later)
SIGNAL_ACCOUNTS = [
    {"handle": "eWhispers",       "followers": 150_000,  "accuracy": 0.72, "category": "earnings"},
    {"handle": "unusual_whales",  "followers": 890_000,  "accuracy": 0.68, "category": "options"},
    {"handle": "DeItaone",        "followers": 650_000,  "accuracy": 0.61, "category": "breaking"},
    {"handle": "KobeissiLetter",  "followers": 420_000,  "accuracy": 0.65, "category": "macro"},
    {"handle": "zerohedge",       "followers": 1_200_000,"accuracy": 0.55, "category": "macro"},
]

TWITTER_SEARCH_URL = "https://api.twitter.com/2/tweets/search/recent"


class TwitterSignalService:
    """
    Fetches signals from high-accuracy financial Twitter accounts via API v2.
    Each signal is weighted by: followers × accuracy_score (normalized).
    Requires TWITTER_BEARER_TOKEN in environment.
    """

    def __init__(self):
        self._total_weight = sum(
            a["followers"] * a["accuracy"] for a in SIGNAL_ACCOUNTS
        )

    async def get_weighted_signals(self, symbol: str) -> Dict:
        """
        Search for tweets about `symbol` from monitored accounts in the last 4h.
        Returns weighted_score (-1.0 to 1.0) and top signals.
        """
        bearer = settings.TWITTER_BEARER_TOKEN
        headers = {"Authorization": f"Bearer {bearer}"}

        # Build search query: tweets from any monitored account mentioning the symbol
        handles_query = " OR ".join([f"from:{a['handle']}" for a in SIGNAL_ACCOUNTS])
        query = f"({handles_query}) {symbol} lang:en -is:retweet"

        # Last 4 hours
        start_time = (datetime.now(timezone.utc) - timedelta(hours=4)).strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        )

        params = {
            "query": query,
            "max_results": 20,
            "start_time": start_time,
            "tweet.fields": "created_at,author_id,public_metrics,text",
            "expansions": "author_id",
            "user.fields": "username,public_metrics",
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(TWITTER_SEARCH_URL, headers=headers, params=params)

            if resp.status_code == 401:
                return {"weighted_score": 0.0, "top_accounts": [], "error": "Invalid Twitter token"}
            if resp.status_code == 429:
                return {"weighted_score": 0.0, "top_accounts": [], "error": "Twitter rate limit"}
            if resp.status_code != 200:
                return {"weighted_score": 0.0, "top_accounts": [], "error": f"HTTP {resp.status_code}"}

            data = resp.json()
            tweets = data.get("data", [])
            users = {u["id"]: u for u in data.get("includes", {}).get("users", [])}

            if not tweets:
                return {"weighted_score": 0.0, "top_accounts": [], "tweet_count": 0}

            # Score each tweet
            scored: List[Dict] = []
            for tweet in tweets:
                author = users.get(tweet.get("author_id"), {})
                handle = author.get("username", "")
                account_meta = next(
                    (a for a in SIGNAL_ACCOUNTS if a["handle"].lower() == handle.lower()),
                    {"followers": 1000, "accuracy": 0.5, "category": "general"}
                )

                signal_weight = (account_meta["followers"] * account_meta["accuracy"]) / max(self._total_weight, 1)
                direction = self._classify_direction(tweet["text"])

                scored.append({
                    "handle": handle,
                    "text": tweet["text"][:200],
                    "signal_weight": round(signal_weight, 6),
                    "direction": direction,   # +1 BULLISH, -1 BEARISH, 0 NEUTRAL
                    "category": account_meta["category"],
                    "created_at": tweet.get("created_at"),
                })

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
                "tweet_count": len(tweets),
                "top_accounts": [s["handle"] for s in scored if s["direction"] != 0][:5],
                "signals": scored,
            }

        except Exception as e:
            logger.error("TwitterSignalService error for %s: %s", symbol, e)
            return {"weighted_score": 0.0, "top_accounts": [], "error": str(e)}

    def _classify_direction(self, text: str) -> float:
        """
        Simple lexicon classifier. Returns +1.0 (bullish), -1.0 (bearish), 0.0 (neutral).
        Can be upgraded to Claude Haiku later for better accuracy.
        """
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
