"""
Dynamic Pricing Assistant.

The AI catalog flow (views.catalog) already asks Gemini for a single
one-shot price guess. This module is the standalone, market-grounded
half of the PS's "Dynamic Pricing Assistant" ask: it looks at
comparable listings that are *already published on Kaarigar* and
derives a price band from real data, instead of relying purely on
one model's guess.

It's intentionally simple (median-based, no external ML dependency)
so it works from day one with a small SQLite dataset, and gracefully
reports "not enough data yet" until there are enough comparables to
be meaningful.
"""

from django.db.models import Q

from .models import Product


def _median(values):
    values = sorted(values)
    n = len(values)
    if n == 0:
        return None
    mid = n // 2
    if n % 2:
        return values[mid]
    return (values[mid - 1] + values[mid]) / 2


def find_comparables(category="", craft_technique="", tags=None):
    """Return published Product rows that look like the item being
    priced, widening the search (category -> technique -> tags) only
    as far as needed to find something to compare against.
    """
    tags = tags or []

    qs = (
        Product.objects.filter(status=Product.Status.PUBLISHED)
        .exclude(price_min_inr__isnull=True)
        .exclude(price_max_inr__isnull=True)
    )

    comparables = []

    if category:
        comparables = list(qs.filter(category__iexact=category))

    if len(comparables) < 2 and craft_technique:
        seen_ids = {p.id for p in comparables}
        by_technique = qs.filter(craft_technique__iexact=craft_technique)
        comparables += [p for p in by_technique if p.id not in seen_ids]

    if len(comparables) < 2 and tags:
        seen_ids = {p.id for p in comparables}
        tag_q = Q()
        for t in tags:
            t = str(t).strip()
            if t:
                tag_q |= Q(tags__icontains=t)
        if tag_q:
            by_tags = qs.filter(tag_q)
            comparables += [p for p in by_tags if p.id not in seen_ids]

    return comparables


def suggest_price(category="", craft_technique="", tags=None, min_comparables=2):
    """Derive a suggested price band from comparable published
    listings. Returns None when there isn't enough market data yet
    (fewer than min_comparables matches) so the caller can fall back
    to the AI's own one-shot suggestion instead.
    """
    comparables = find_comparables(category=category, craft_technique=craft_technique, tags=tags)

    if len(comparables) < min_comparables:
        return None

    lows = [p.price_min_inr for p in comparables if p.price_min_inr]
    highs = [p.price_max_inr for p in comparables if p.price_max_inr]

    suggested_min = _median(lows)
    suggested_max = _median(highs)

    if suggested_min is None or suggested_max is None:
        return None

    suggested_min, suggested_max = round(suggested_min), round(suggested_max)
    if suggested_min > suggested_max:
        suggested_min, suggested_max = suggested_max, suggested_min

    sample = sorted(
        (
            {
                "title": p.title,
                "price_min_inr": p.price_min_inr,
                "price_max_inr": p.price_max_inr,
            }
            for p in comparables
        ),
        key=lambda d: d["price_min_inr"] or 0,
    )[:5]

    return {
        "suggested_min_inr": suggested_min,
        "suggested_max_inr": suggested_max,
        "comparable_count": len(comparables),
        "sample_comparables": sample,
    }