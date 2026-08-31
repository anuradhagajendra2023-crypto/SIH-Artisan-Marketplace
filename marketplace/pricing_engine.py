"""
Dynamic Pricing Assistant — market-data based.

Suggests a price band for a new listing by looking at already-published
Kaarigar products that are similar in category / craft_technique / tags,
instead of relying only on a single one-shot AI guess. Complements (doesn't
replace) the AI price_reasoning already returned by views.catalog — the
frontend can show both side by side, and fall back to the AI-only estimate
when there isn't enough comparable data yet.
"""

from .models import Product

MIN_COMPARABLES = 2


def _tag_overlap_count(product: Product, tags: list[str]) -> int:
    if not tags:
        return 0
    product_tags = set(t.strip().lower() for t in (product.tags or []) if t)
    query_tags = set(t.strip().lower() for t in tags if t)
    return len(product_tags & query_tags)


def _price_points(product: Product) -> list[float]:
    """A published listing may have only one of price_min_inr/price_max_inr
    set (both are nullable), or both, or neither — collect whatever's there."""
    points = []
    if product.price_min_inr is not None:
        points.append(float(product.price_min_inr))
    if product.price_max_inr is not None:
        points.append(float(product.price_max_inr))
    return points


def suggest_price(category: str = "", craft_technique: str = "", tags: list[str] | None = None,
                   min_comparables: int = MIN_COMPARABLES):
    """
    Returns None when there are fewer than min_comparables similar published
    listings with usable price data — the frontend should fall back to the
    AI-only price_reasoning from views.catalog in that case.

    Otherwise returns:
    {
        "suggested_price_range_inr": "₹450 - ₹650",
        "average_inr": 550,
        "comparable_count": 4,
        "matched_on": "category+craft_technique",
    }
    """
    tags = tags or []

    candidates = list(Product.objects.filter(status=Product.Status.PUBLISHED))
    matched_on = "all_published"

    # Narrow by category, but only if enough comparables remain
    if category:
        category_matches = [
            p for p in candidates
            if category.lower() in (p.category or "").lower()
        ]
        if len(category_matches) >= min_comparables:
            candidates = category_matches
            matched_on = "category"

    # Narrow further by craft_technique, only if it still leaves enough
    if craft_technique:
        ct_matches = [
            p for p in candidates
            if craft_technique.lower() in (p.craft_technique or "").lower()
        ]
        if len(ct_matches) >= min_comparables:
            candidates = ct_matches
            matched_on += "+craft_technique"

    # Narrow further by tag overlap, only if it still leaves enough
    if tags:
        tag_matches = [p for p in candidates if _tag_overlap_count(p, tags) > 0]
        if len(tag_matches) >= min_comparables:
            candidates = tag_matches
            matched_on += "+tags"

    if len(candidates) < min_comparables:
        return None

    all_prices = []
    for p in candidates:
        all_prices.extend(_price_points(p))

    if len(all_prices) < min_comparables:
        return None

    low = min(all_prices)
    high = max(all_prices)
    avg = sum(all_prices) / len(all_prices)

    return {
        "suggested_min_inr": int(round(low)),
        "suggested_max_inr": int(round(high)),
        "average_inr": int(round(avg)),
        "comparable_count": len(candidates),
        "matched_on": matched_on,
    }