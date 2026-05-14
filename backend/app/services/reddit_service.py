import logging
import json
import time
from typing import List, Dict
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

SUBREDDITS = ["wallstreetbets", "stocks", "investing", "options"]
HEADERS = {"User-Agent": "NuoTrading/1.0"}


class RedditService:
    """
    Fetches ticker mentions using Reddit's public JSON API.
    No API keys or registration required — uses the anonymous read-only endpoint.
    """

    async def get_ticker_sentiment(self, symbol: str) -> Dict:
        mentions: List[Dict] = []

        async with httpx.AsyncClient(timeout=10.0) as client:
            for sub in SUBREDDITS:
                try:
                    url = f"https://www.reddit.com/r/{sub}/search.json"
                    params = {
                        "q": symbol,
                        "sort": "new",
                        "t": "day",
                        "limit": 10,
                        "restrict_sr": 1,  # limit to the specific subreddit
                    }
                    r = await client.get(url, params=params, headers=HEADERS)

                    if r.status_code != 200:
                        logger.warning("Reddit r/%s returned %s", sub, r.status_code)
                        continue

                    posts = r.json().get("data", {}).get("children", [])
                    for post in posts:
                        d = post.get("data", {})
                        mentions.append({
                            "title": d.get("title", ""),
                            "score": int(d.get("score", 0)),
                            "comments": int(d.get("num_comments", 0)),
                            "subreddit": d.get("subreddit", sub),
                            "created_utc": float(d.get("created_utc", time.time())),
                        })
                except Exception as e:
                    logger.warning("Reddit r/%s error: %s", sub, e)

        if not mentions:
            return {
                "symbol": symbol,
                "mention_count": 0,
                "weighted_score": 0.0,
                "signal": "NEUTRAL",
                "top_posts": [],
            }

        # Classify sentiment using Claude Haiku (falls back to heuristic)
        weighted_score = await self._classify_sentiment(symbol, mentions)
        signal = (
            "BULLISH" if weighted_score > 0.1
            else "BEARISH" if weighted_score < -0.1
            else "NEUTRAL"
        )

        return {
            "symbol": symbol,
            "mention_count": len(mentions),
            "weighted_score": round(weighted_score, 4),
            "signal": signal,
            "top_posts": sorted(mentions, key=lambda x: x["score"], reverse=True)[:3],
        }

    async def _classify_sentiment(self, symbol: str, mentions: List[Dict]) -> float:
        """
        Primary: Claude Haiku for high-quality sentiment classification.
        Fallback: simple upvote-ratio heuristic.
        """
        try:
            if not getattr(settings, "ANTHROPIC_API_KEY", ""):
                raise ValueError("No Anthropic key, using heuristic")

            from anthropic import AsyncAnthropic
            titles = "\n".join([f"- {m['title']}" for m in mentions[:15]])
            client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            resp = await client.messages.create(
                model="claude-haiku-20240307",
                max_tokens=64,
                system=(
                    "You are a financial sentiment classifier. "
                    "Return ONLY a JSON object: {\"score\": <float -1.0 to 1.0>}"
                ),
                messages=[{
                    "role": "user",
                    "content": (
                        f"Classify the aggregate Reddit sentiment for ${symbol} "
                        f"based on these post titles:\n{titles}"
                    ),
                }],
            )
            content = resp.content[0].text
            start = content.find("{")
            end = content.rfind("}") + 1
            if start != -1 and end > start:
                result = json.loads(content[start:end])
                return max(-1.0, min(1.0, float(result.get("score", 0.0))))
        except Exception as e:
            logger.debug("Claude classification unavailable, using heuristic: %s", e)

        # Heuristic: posts with positive scores are weighted more heavily
        total = sum(abs(m["score"]) for m in mentions) or 1
        net = sum(m["score"] for m in mentions)
        return max(-1.0, min(1.0, net / total))
