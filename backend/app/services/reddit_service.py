import logging
import time
from typing import List, Dict, Optional
import asyncpraw
from app.core.config import settings

logger = logging.getLogger(__name__)

SUBREDDITS = [
    "wallstreetbets", "stocks", "investing",
    "options", "stockmarket", "SecurityAnalysis"
]


class RedditService:
    """
    Fetches ticker mentions from key financial subreddits via asyncpraw.
    Uses Claude Haiku (via SentimentService) to classify sentiment.
    Requires REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET in environment.
    """

    def _make_reddit(self) -> asyncpraw.Reddit:
        return asyncpraw.Reddit(
            client_id=settings.REDDIT_CLIENT_ID,
            client_secret=settings.REDDIT_CLIENT_SECRET,
            user_agent="NuoTrading/1.0 (by /u/NuoTradingBot)",
        )

    async def get_ticker_sentiment(self, symbol: str) -> Dict:
        """
        Search for ticker mentions across monitored subreddits (last 24h).
        Returns weighted_score (-1.0 to 1.0) and raw post list.
        """
        mentions: List[Dict] = []
        now = time.time()

        try:
            reddit = self._make_reddit()
            for subreddit_name in SUBREDDITS:
                try:
                    subreddit = await reddit.subreddit(subreddit_name)
                    async for post in subreddit.search(
                        symbol, limit=10, time_filter="day", sort="relevance"
                    ):
                        hours_elapsed = max((now - post.created_utc) / 3600, 0.1)
                        awards = len(post.all_awardings) if hasattr(post, "all_awardings") else 0
                        # Engagement weight formula from spec:
                        # weight = upvotes × (1 + awards) / hours_elapsed
                        engagement = post.score * (1 + awards) / hours_elapsed

                        mentions.append({
                            "title": post.title,
                            "score": post.score,
                            "awards": awards,
                            "comments": post.num_comments,
                            "created_utc": post.created_utc,
                            "hours_elapsed": round(hours_elapsed, 2),
                            "engagement_weight": round(engagement, 2),
                            "subreddit": subreddit_name,
                            "url": f"https://reddit.com{post.permalink}",
                        })
                except Exception as e:
                    logger.warning("Reddit subreddit %s failed: %s", subreddit_name, e)

            await reddit.close()

        except Exception as e:
            logger.error("RedditService error for %s: %s", symbol, e)
            return {
                "symbol": symbol,
                "mention_count": 0,
                "weighted_score": 0.0,
                "sentiment": "NEUTRAL",
                "top_posts": [],
                "error": str(e),
            }

        if not mentions:
            return {
                "symbol": symbol,
                "mention_count": 0,
                "weighted_score": 0.0,
                "sentiment": "NEUTRAL",
                "top_posts": [],
            }

        # --- Sentiment classification via Claude/Finnhub ---------------
        weighted_score = await self._classify_sentiment(symbol, mentions)

        return {
            "symbol": symbol,
            "mention_count": len(mentions),
            "weighted_score": round(weighted_score, 4),
            "sentiment": "BULLISH" if weighted_score > 0.1 else "BEARISH" if weighted_score < -0.1 else "NEUTRAL",
            "top_posts": sorted(mentions, key=lambda x: x["engagement_weight"], reverse=True)[:3],
        }

    async def _classify_sentiment(self, symbol: str, mentions: List[Dict]) -> float:
        """
        Use Claude Haiku to classify aggregate sentiment as a score (-1.0 to 1.0).
        Falls back to upvote heuristic if AI is unavailable.
        """
        try:
            from anthropic import AsyncAnthropic
            if not settings.ANTHROPIC_API_KEY:
                raise ValueError("No Anthropic key")

            titles = "\n".join([f"- {m['title']}" for m in mentions[:10]])
            client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            resp = await client.messages.create(
                model="claude-haiku-20240307",
                max_tokens=64,
                system="You are a financial sentiment classifier. Return ONLY a JSON: {\"score\": float between -1.0 and 1.0}",
                messages=[{
                    "role": "user",
                    "content": f"Classify aggregate Reddit sentiment for ${symbol}:\n{titles}"
                }]
            )
            import json
            content = resp.content[0].text
            start = content.find("{")
            end = content.rfind("}") + 1
            if start != -1:
                result = json.loads(content[start:end])
                return max(-1.0, min(1.0, float(result.get("score", 0.0))))
        except Exception as e:
            logger.warning("Claude classification failed, using heuristic: %s", e)

        # Heuristic fallback: net upvotes across all posts → normalized score
        total_engagement = sum(m["engagement_weight"] for m in mentions)
        positive_engagement = sum(m["engagement_weight"] for m in mentions if m["score"] > 0)
        if total_engagement > 0:
            ratio = positive_engagement / total_engagement
            return (ratio * 2) - 1.0  # map 0.0–1.0 to -1.0–1.0
        return 0.0
