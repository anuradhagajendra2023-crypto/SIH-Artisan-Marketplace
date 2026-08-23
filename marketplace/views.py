import json
import requests
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import os

from .cluster_engine import form_cluster
from .sample_artisans import SAMPLE_ARTISANS
from .models import Artisan

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
MODEL = "gemini-3.6-flash"


def health(request):
    return JsonResponse({"status": "ok", "keyConfigured": bool(GEMINI_API_KEY)})


def sample_artisans(request):
    return JsonResponse(SAMPLE_ARTISANS, safe=False)


def db_artisans_to_dicts():
    """Convert Artisan DB rows into the same dict shape the cluster engine expects."""
    artisans = Artisan.objects.all()
    result = []
    for a in artisans:
        location = None
        if a.latitude is not None and a.longitude is not None:
            location = {"lat": a.latitude, "lng": a.longitude}
        result.append({
            "id": str(a.id),
            "name": a.name,
            "productType": a.product_type,
            "location": location,
            "capacityPerWeek": a.capacity_per_week,
            "rating": a.rating,
        })
    return result


@csrf_exempt
def cluster(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)

    body = json.loads(request.body)
    order = body.get("order")
    artisans = body.get("artisans")

    if not order or not order.get("productType") or not order.get("quantityNeeded"):
        return JsonResponse({"error": "order.productType and order.quantityNeeded are required."}, status=400)

    if artisans:
        pool = artisans
    else:
        pool = db_artisans_to_dicts()
        if not pool:
            pool = SAMPLE_ARTISANS

    result = form_cluster(order, pool)
    return JsonResponse(result)


@csrf_exempt
def catalog(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)

    body = json.loads(request.body)
    image_base64 = body.get("imageBase64")
    media_type = body.get("mediaType")

    if not image_base64 or not media_type:
        return JsonResponse({"error": "imageBase64 and mediaType are required."}, status=400)

    prompt = """You are an assistant embedded in a mobile app for marginalized Indian artisans. An artisan has photographed a handmade product. Analyze the image and produce a market-ready catalog listing.

Respond ONLY with valid JSON (no markdown fences, no preamble), in exactly this shape:
{
  "title": "short catchy product title, under 8 words",
  "category": "one or two word product category",
  "description": "2-3 sentence buyer-facing description highlighting craftsmanship and materials",
  "tags": ["4-6 short search tags"],
  "suggested_price_range_inr": "e.g. ₹450 - ₹650",
  "price_reasoning": "one short sentence explaining the price logic based on visible materials/complexity",
  "craft_technique_guess": "best guess at the traditional technique or art form visible, or 'Not clearly identifiable' if unsure"
}"""

    try:
        response = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent",
            headers={"Content-Type": "application/json"},
            params={"key": GEMINI_API_KEY},
            json={
                "contents": [
                    {
                        "parts": [
                            {"inline_data": {"mime_type": media_type, "data": image_base64}},
                            {"text": prompt},
                        ]
                    }
                ]
            },
        )

        if response.status_code != 200:
            return JsonResponse({"error": "AI service error", "details": response.text}, status=502)

        data = response.json()
        candidates = data.get("candidates", [])

        if not candidates:
            return JsonResponse({"error": "No response from model"}, status=502)

        text = candidates[0]["content"]["parts"][0]["text"]
        cleaned = text.replace("```json", "").replace("```", "").strip()
        parsed = json.loads(cleaned)
        return JsonResponse(parsed)

    except Exception as e:
        return JsonResponse({"error": "Internal server error", "details": str(e)}, status=500)