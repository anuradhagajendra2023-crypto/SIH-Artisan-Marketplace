"""
Cluster Fulfillment Engine
Given a bulk order and a pool of artisans, forms a "micro-cooperative"
that together can fulfill an order no single artisan could take alone,
splitting revenue proportionally to units contributed.
"""
import math


def distance_km(a, b):
    if not a or not b:
        return None
    R = 6371
    d_lat = math.radians(b["lat"] - a["lat"])
    d_lng = math.radians(b["lng"] - a["lng"])
    lat1 = math.radians(a["lat"])
    lat2 = math.radians(b["lat"])
    h = math.sin(d_lat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(d_lng / 2) ** 2
    return R * 2 * math.asin(math.sqrt(h))


def form_cluster(order, artisans):
    product_type = order["productType"]
    quantity_needed = order["quantityNeeded"]
    unit_price_inr = order.get("unitPriceInr", 0)
    buyer_location = order.get("buyerLocation")

    candidates = [a for a in artisans if a["productType"].lower() == product_type.lower()]

    if not candidates:
        return {
            "success": False,
            "reason": f'No artisans found producing "{product_type}".',
            "allocation": [],
        }

    scored = []
    for a in candidates:
        dist = distance_km(a.get("location"), buyer_location) if buyer_location and a.get("location") else None
        dist_score = 0.5 if dist is None else max(0, 1 - dist / 500)
        cap_score = min(1, a["capacityPerWeek"] / 100)
        rating_score = a.get("rating", 4) / 5
        score = cap_score * 0.5 + dist_score * 0.3 + rating_score * 0.2
        scored.append({**a, "distanceKm": dist, "score": score})

    scored.sort(key=lambda x: x["score"], reverse=True)

    remaining = quantity_needed
    allocation = []

    for artisan in scored:
        if remaining <= 0:
            break
        units = min(artisan["capacityPerWeek"], remaining)
        if units <= 0:
            continue
        allocation.append({
            "artisanId": artisan["id"],
            "name": artisan["name"],
            "unitsAllocated": units,
            "distanceKm": round(artisan["distanceKm"]) if artisan["distanceKm"] is not None else None,
            "matchScore": round(artisan["score"] * 100),
        })
        remaining -= units

    total_allocated = quantity_needed - remaining
    fulfilled = remaining <= 0
    total_revenue = total_allocated * unit_price_inr

    for a in allocation:
        a["revenueShareInr"] = round((a["unitsAllocated"] / total_allocated) * total_revenue) if unit_price_inr else None

    return {
        "success": fulfilled,
        "reason": None if fulfilled else f"Only {total_allocated}/{quantity_needed} units could be allocated — not enough capacity in the artisan pool.",
        "clusterSize": len(allocation),
        "totalUnitsAllocated": total_allocated,
        "unitsShort": max(0, remaining),
        "totalRevenueInr": total_revenue if unit_price_inr else None,
        "allocation": allocation,
    }