from app.agents.skills.base import AgentSkill, SkillResult
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class SocialSkill(AgentSkill):
    """
    Weight=0.10 — Aggregates Reddit WSB sentiment + X/Twitter account signals.

    Degrades elegantly to NEUTRAL (score=0.0) if API keys are missing.
    To activate: set REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, TWITTER_BEARER_TOKEN.
    """

    def __init__(self):
        self._reddit = None
        self._twitter = None

    @property
    def name(self) -> str:
        return "Señales Sociales (X/Reddit)"

    @property
    def weight(self) -> float:
        return 0.10

    async def is_available(self) -> bool:
        """
        Reddit uses the public JSON API — always available, no keys needed.
        Twitter adds signal when TWITTER_BEARER_TOKEN is configured.
        """
        return True  # Reddit public API is always accessible

    async def analyze(self, symbol: str) -> SkillResult:
        has_twitter = bool(getattr(settings, "TWITTER_BEARER_TOKEN", None))

        reddit_data = {"weighted_score": 0.0, "mention_count": 0, "top_posts": []}
        twitter_data = {"weighted_score": 0.0, "top_accounts": [], "tweet_count": 0}

        # --- Reddit (always on — public JSON API, no keys needed) -----------
        try:
            from app.services.reddit_service import RedditService
            if self._reddit is None:
                self._reddit = RedditService()
            reddit_data = await self._reddit.get_ticker_sentiment(symbol)
        except Exception as e:
            logger.warning("Reddit signal failed for %s: %s", symbol, e)

        # --- Twitter / X (optional — only when bearer token is configured) --
        if has_twitter:
            try:
                from app.services.twitter_signal_service import TwitterSignalService
                if self._twitter is None:
                    self._twitter = TwitterSignalService()
                twitter_data = await self._twitter.get_weighted_signals(symbol)
            except Exception as e:
                logger.warning("Twitter signal failed for %s: %s", symbol, e)

        # --- Aggregate (40% Reddit / 60% Twitter) ---------------------------
        reddit_score = float(reddit_data.get("weighted_score", 0.0))
        twitter_score = float(twitter_data.get("weighted_score", 0.0))
        social_score = (reddit_score * 0.40) + (twitter_score * 0.60)
        social_score = max(-1.0, min(1.0, social_score))

        # Confidence: scales with volume of mentions (caps at 1.0 at 20+ mentions)
        mention_count = int(reddit_data.get("mention_count", 0))
        tweet_count = int(twitter_data.get("tweet_count", 0))
        total_signals = mention_count + tweet_count
        confidence = min(total_signals / 20.0, 1.0)

        # Determine signal
        if social_score >= 0.15:
            signal = "BULLISH"
        elif social_score <= -0.15:
            signal = "BEARISH"
        else:
            signal = "NEUTRAL"

        top_accounts = twitter_data.get("top_accounts", [])
        reasoning = (
            f"Reddit: {mention_count} menciones | "
            f"Twitter: {tweet_count} tweets de {', '.join(top_accounts[:3]) if top_accounts else 'N/A'}"
        )

        return SkillResult(
            symbol=symbol,
            skill_name=self.name,
            score=social_score,
            signal=signal,
            confidence=confidence,
            reasoning=reasoning,
            raw_data={
                "reddit": reddit_data,
                "twitter": twitter_data,
                "reddit_weight": 0.40,
                "twitter_weight": 0.60,
            }
        )
