import json
import base64
import requests
import os

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate, login as django_login, logout
from django.contrib.auth import get_user_model
User = get_user_model()
from .cluster_engine import form_cluster
from .sample_artisans import SAMPLE_ARTISANS
from .models import Artisan
from django.db.models import Q
from .models import Product, Order
from .serializers import ProductSerializer, OrderSerializer, OrderStatusSerializer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
MODEL = "gemini-3.6-flash"


# ============================================================
# HEALTH
# ============================================================

def health(request):
    return JsonResponse({
        "status": "ok",
        "keyConfigured": bool(GEMINI_API_KEY),
    })


# ============================================================
# SAMPLE ARTISANS
# ============================================================

def sample_artisans(request):
    return JsonResponse(SAMPLE_ARTISANS, safe=False)


# ============================================================
# AUTH - REGISTER
# ============================================================

@csrf_exempt
def register(request):
    if request.method != "POST":
        return JsonResponse(
            {"error": "POST required"},
            status=405
        )

    try:
        body = json.loads(request.body)

        username = body.get("username", "").strip()
        email = body.get("email", "").strip()
        password = body.get("password", "")
        role = body.get("role", "artisan")
        phone = body.get("phone", "").strip()

        # Required fields
        if not username or not password:
            return JsonResponse(
                {"error": "Username and password are required."},
                status=400
            )

        # Username already exists
        if User.objects.filter(username=username).exists():
            return JsonResponse(
                {"error": "Username already exists."},
                status=400
            )

        # Create Django user
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
        )

        # Store extra information if available
        # without depending on a custom User model.
        user.first_name = role
        user.last_name = phone
        user.save()

        return JsonResponse({
            "message": "Registration successful.",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": role,
                "phone": phone,
            }
        }, status=201)

    except json.JSONDecodeError:
        return JsonResponse(
            {"error": "Invalid JSON."},
            status=400
        )

    except Exception as e:
        return JsonResponse(
            {
                "error": "Registration failed.",
                "details": str(e),
            },
            status=500
        )


# ============================================================
# AUTH - LOGIN
# ============================================================

@csrf_exempt
def login(request):
    if request.method != "POST":
        return JsonResponse(
            {"error": "POST required"},
            status=405
        )

    try:
        body = json.loads(request.body)

        username = body.get("username", "").strip()
        password = body.get("password", "")

        if not username or not password:
            return JsonResponse(
                {"error": "Username and password are required."},
                status=400
            )

        user = authenticate(
            request,
            username=username,
            password=password,
        )

        if user is None:
            return JsonResponse(
                {"error": "Invalid username or password."},
                status=401
            )

        # Create Django session
        django_login(request, user)

        return JsonResponse({
            "message": "Login successful.",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.first_name or "artisan",
                "phone": user.last_name or "",
            }
        })

    except json.JSONDecodeError:
        return JsonResponse(
            {"error": "Invalid JSON."},
            status=400
        )

    except Exception as e:
        return JsonResponse(
            {
                "error": "Login failed.",
                "details": str(e),
            },
            status=500
        )


# ============================================================
# AUTH - LOGOUT
# ============================================================

@csrf_exempt
def logout_view(request):
    logout(request)

    return JsonResponse({
        "message": "Logged out successfully."
    })


# ============================================================
# ARTISAN DATABASE
# ============================================================

def db_artisans_to_dicts():
    """Convert Artisan DB rows into the same dict shape
    the cluster engine expects.
    """

    artisans = Artisan.objects.all()

    result = []

    for a in artisans:
        location = None

        if a.latitude is not None and a.longitude is not None:
            location = {
                "lat": a.latitude,
                "lng": a.longitude,
            }

        result.append({
            "id": str(a.id),
            "name": a.name,
            "productType": a.product_type,
            "location": location,
            "capacityPerWeek": a.capacity_per_week,
            "rating": a.rating,
        })

    return result


# ============================================================
# CLUSTER
# ============================================================

@csrf_exempt
def cluster(request):
    if request.method != "POST":
        return JsonResponse(
            {"error": "POST required"},
            status=405
        )

    try:
        body = json.loads(request.body)

        order = body.get("order")
        artisans = body.get("artisans")

        if (
            not order
            or not order.get("productType")
            or not order.get("quantityNeeded")
        ):
            return JsonResponse(
                {
                    "error": (
                        "order.productType and "
                        "order.quantityNeeded are required."
                    )
                },
                status=400
            )

        if artisans:
            pool = artisans
        else:
            pool = db_artisans_to_dicts()

            if not pool:
                pool = SAMPLE_ARTISANS

        result = form_cluster(order, pool)

        return JsonResponse(result)

    except json.JSONDecodeError:
        return JsonResponse(
            {"error": "Invalid JSON."},
            status=400
        )

    except Exception as e:
        return JsonResponse(
            {
                "error": "Cluster processing failed.",
                "details": str(e),
            },
            status=500
        )


# ============================================================
# CATALOG / AI IMAGE ANALYSIS
# ============================================================

@csrf_exempt
def catalog(request):
    if request.method != "POST":
        return JsonResponse(
            {"error": "POST required"},
            status=405
        )

    try:
        body = json.loads(request.body)

        image_base64 = body.get("imageBase64")
        media_type = body.get("mediaType")

        if not image_base64 or not media_type:
            return JsonResponse(
                {
                    "error": (
                        "imageBase64 and mediaType "
                        "are required."
                    )
                },
                status=400
            )

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

        response = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent",
            headers={
                "Content-Type": "application/json"
            },
            params={
                "key": GEMINI_API_KEY
            },
            json={
                "contents": [
                    {
                        "parts": [
                            {
                                "inline_data": {
                                    "mime_type": media_type,
                                    "data": image_base64,
                                }
                            },
                            {
                                "text": prompt
                            },
                        ]
                    }
                ]
            },
        )

        if response.status_code != 200:
            return JsonResponse(
                {
                    "error": "AI service error",
                    "details": response.text,
                },
                status=502
            )

        data = response.json()

        candidates = data.get("candidates", [])

        if not candidates:
            return JsonResponse(
                {
                    "error": "No response from model"
                },
                status=502
            )

        text = candidates[0]["content"]["parts"][0]["text"]

        cleaned = (
            text
            .replace("```json", "")
            .replace("```", "")
            .strip()
        )

        parsed = json.loads(cleaned)

        return JsonResponse(parsed)

    except json.JSONDecodeError:
        return JsonResponse(
            {
                "error": "Invalid JSON response from AI."
            },
            status=502
        )

    except Exception as e:
        return JsonResponse(
            {
                "error": "Internal server error",
                "details": str(e),
            },
            status=500
        )


# ============================================================
# VOICE CATALOGING / AI AUDIO ANALYSIS
# ============================================================

@csrf_exempt
def voice_catalog(request):
    if request.method != "POST":
        return JsonResponse(
            {"error": "POST required"},
            status=405
        )

    try:
        body = json.loads(request.body)

        audio_base64 = body.get("audioBase64")
        media_type = body.get("mediaType")

        if not audio_base64 or not media_type:
            return JsonResponse(
                {
                    "error": (
                        "audioBase64 and mediaType "
                        "are required."
                    )
                },
                status=400
            )

        prompt = """You are an assistant embedded in a mobile app for marginalized Indian artisans. An artisan has recorded a spoken description of a handmade product, in ANY Indian language (Hindi, Tamil, Bengali, Marathi, Telugu, Kannada, Odia, Punjabi, Gujarati, Malayalam, English, or a mix of languages). First detect which language was actually spoken. Then transcribe exactly what was said in that language's native script. Then produce a market-ready bilingual catalog listing: one version in English, and one version in the artisan's own detected spoken language (native script).

Respond ONLY with valid JSON (no markdown fences, no preamble), in exactly this shape:
{
  "detected_language": "name of the detected language in English, e.g. 'Tamil' or 'Bengali' or 'Hindi'",
  "transcript": "exact transcription of the spoken audio, in the language(s) spoken, native script",
  "english": {
    "title": "short catchy product title in English, under 8 words",
    "description": "2-3 sentence buyer-facing description in English",
    "tags": ["4-6 short English search tags"]
  },
  "local": {
    "title": "same product title translated into the detected language (native script)",
    "description": "same description translated into the detected language (native script)",
    "tags": ["4-6 short search tags in the detected language (native script)"]
  }
}

If the transcript has very little product information, still produce a reasonable generic handmade-craft listing in both languages rather than leaving fields empty. If the spoken language cannot be confidently identified, default detected_language to 'Hindi'."""

        response = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent",
            headers={
                "Content-Type": "application/json"
            },
            params={
                "key": GEMINI_API_KEY
            },
            json={
                "contents": [
                    {
                        "parts": [
                            {
                                "inline_data": {
                                    "mime_type": media_type,
                                    "data": audio_base64,
                                }
                            },
                            {
                                "text": prompt
                            },
                        ]
                    }
                ]
            },
        )

        if response.status_code != 200:
            return JsonResponse(
                {
                    "error": "AI service error",
                    "details": response.text,
                },
                status=502
            )

        data = response.json()

        candidates = data.get("candidates", [])

        if not candidates:
            return JsonResponse(
                {
                    "error": "No response from model"
                },
                status=502
            )

        text = candidates[0]["content"]["parts"][0]["text"]

        cleaned = (
            text
            .replace("```json", "")
            .replace("```", "")
            .strip()
        )

        parsed = json.loads(cleaned)

        return JsonResponse(parsed)

    except json.JSONDecodeError:
        return JsonResponse(
            {
                "error": "Invalid JSON response from AI."
            },
            status=502
        )

    except Exception as e:
        return JsonResponse(
            {
                "error": "Internal server error",
                "details": str(e),
            },
            status=500
        )
    # ============================================================
# PRODUCTS
# ============================================================

@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def products(request):
    if request.method == "GET":
        qs = Product.objects.filter(status=Product.Status.PUBLISHED)
        search = request.GET.get("search", "").strip()
        if search:
            qs = qs.filter(
                Q(title__icontains=search)
                | Q(description__icontains=search)
                | Q(category__icontains=search)
                | Q(craft_technique__icontains=search)
            )
        return Response(ProductSerializer(qs, many=True).data)

    if not request.user.is_authenticated:
        return Response({"error": "Authentication required."}, status=401)

    serializer = ProductSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(artisan=request.user)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


# ============================================================
# ORDERS
# ============================================================

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def orders(request):
    if request.method == "GET":
        qs = Order.objects.filter(product__artisan=request.user)
        return Response(OrderSerializer(qs, many=True).data)

    serializer = OrderSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(buyer=request.user)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_orders(request):
    qs = Order.objects.filter(buyer=request.user)
    return Response(OrderSerializer(qs, many=True).data)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def order_status(request, order_id):
    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return Response({"error": "Order not found."}, status=404)

    if request.user != order.buyer and request.user != order.product.artisan:
        return Response({"error": "Not allowed."}, status=403)

    serializer = OrderStatusSerializer(order, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(OrderSerializer(order).data)
    return Response(serializer.errors, status=400)
@api_view(["GET"])
@permission_classes([AllowAny])
def product_detail(request, product_id):
    try:
        product = Product.objects.get(id=product_id, status=Product.Status.PUBLISHED)
    except Product.DoesNotExist:
        return Response({"error": "Product not found."}, status=404)

    return Response(ProductSerializer(product).data)
# ============================================================
# ============================================================
# CRAFT GALLERY
# ============================================================

from .models import GalleryMedia
from .serializers import GalleryMediaSerializer


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def gallery(request):
    if request.method == "GET":
        qs = GalleryMedia.objects.all()
        craft = request.GET.get("craft_type", "").strip()
        if craft:
            qs = qs.filter(craft_type__icontains=craft)
        return Response(GalleryMediaSerializer(qs, many=True).data)

    if not request.user.is_authenticated:
        return Response({"error": "Authentication required."}, status=401)

    serializer = GalleryMediaSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(artisan=request.user)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


# ============================================================
# TRANSLATION (AI-powered, any language)
# ============================================================

@api_view(["POST"])
@permission_classes([AllowAny])
def translate(request):
    """Takes a dict of {key: englishText} and a target language name,
    returns {key: translatedText} using Gemini. Used to translate the
    whole UI into whatever language the person picks, including
    regional and tribal languages not covered by a fixed language list.
    """
    texts = request.data.get("texts")
    target_language = request.data.get("targetLanguage")

    if not texts or not target_language:
        return Response({"error": "texts and targetLanguage are required."}, status=400)

    if target_language.strip().lower() in ("english", "en"):
        return Response(texts)

    prompt = (
        "Translate each value in this JSON object into "
        f"{target_language}. Keep the same keys. Keep translations "
        "short and natural for buttons/labels in a mobile app. "
        "Respond ONLY with valid JSON, no markdown fences, no preamble, "
        "same keys as input:\n\n" + json.dumps(texts)
    )

    try:
        resp = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent",
            headers={"Content-Type": "application/json"},
            params={"key": GEMINI_API_KEY},
            json={"contents": [{"parts": [{"text": prompt}]}]},
            timeout=30,
        )
        resp.raise_for_status()
        raw = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.strip("`")
            if raw.lower().startswith("json"):
                raw = raw[4:]
        translated = json.loads(raw)
        return Response(translated)
    except Exception as e:
        return Response({"error": f"Translation failed: {str(e)}"}, status=500)


# ============================================================
# DYNAMIC PRICING ASSISTANT (market-data based)
# ============================================================

from .pricing_engine import suggest_price


@api_view(["POST"])
@permission_classes([AllowAny])
def pricing(request):
    """Standalone Dynamic Pricing Assistant.

    Given a category / craft_technique / tags, returns a price band
    grounded in comparable listings already published on Kaarigar,
    plus how many comparables it used. This complements (doesn't
    replace) the single AI guess already returned inline by
    views.catalog — the frontend shows both side by side.

    Returns {"has_market_data": False} when there isn't yet enough
    comparable data (fewer than 2 similar published listings), so
    the frontend can fall back to the AI-only price_reasoning.
    """
    category = (request.data.get("category") or "").strip()
    craft_technique = (request.data.get("craft_technique") or "").strip()
    tags = request.data.get("tags") or []

    if not category and not craft_technique and not tags:
        return Response(
            {"error": "category, craft_technique, or tags is required."},
            status=400,
        )

    result = suggest_price(category=category, craft_technique=craft_technique, tags=tags)

    if result is None:
        return Response({"has_market_data": False})

    return Response({"has_market_data": True, **result})


# ============================================================
# AI IMAGE STUDIO — preset enhancement
# ============================================================

from .image_engine import enhance as run_image_enhance, PRESETS as IMAGE_PRESETS


@csrf_exempt
def enhance_image(request):
    """Runs the shared lighting-correction + background-removal pipeline
    with a chosen finish preset, and returns the result as a data URL so
    the artisan can preview it (before/after) without saving anything yet.
    """
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)

    try:
        body = json.loads(request.body)

        image_base64 = body.get("imageBase64")
        preset = body.get("preset", "marketplace_standard")

        if not image_base64:
            return JsonResponse({"error": "imageBase64 is required."}, status=400)

        if preset not in IMAGE_PRESETS:
            preset = "marketplace_standard"

        image_bytes = base64.b64decode(image_base64)
        enhanced_bytes = run_image_enhance(image_bytes, preset=preset)
        enhanced_b64 = base64.b64encode(enhanced_bytes).decode("utf-8")

        return JsonResponse({
            "preset": preset,
            "imageDataUrl": f"data:image/png;base64,{enhanced_b64}",
        })

    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON."}, status=400)

    except Exception as e:
        return JsonResponse(
            {"error": "Image enhancement failed.", "details": str(e)},
            status=500,
        )


# ============================================================
# TRUST BADGE (reference-based verification)
# ============================================================

from .models import VerificationRequest
from .serializers import VerificationRequestSerializer


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def verification(request):
    if request.method == "GET":
        latest = VerificationRequest.objects.filter(artisan=request.user).first()
        if latest is None:
            return Response(None)
        return Response(VerificationRequestSerializer(latest).data)

    # POST — submit a new verification request
    photo_data_url = (request.data.get("photo_data_url") or "").strip()
    reference_name = (request.data.get("reference_name") or "").strip()

    if not photo_data_url:
        return Response({"error": "Please add a photo first."}, status=400)
    if not reference_name:
        return Response({"error": "Please add at least one reference name."}, status=400)

    already_pending = VerificationRequest.objects.filter(
        artisan=request.user, status=VerificationRequest.Status.PENDING
    ).exists()
    if already_pending:
        return Response(
            {"error": "You already have a verification request under review."},
            status=400,
        )

    vr = VerificationRequest.objects.create(
        artisan=request.user,
        photo_data_url=photo_data_url,
        reference_name=reference_name,
        reference_phone=(request.data.get("reference_phone") or "").strip(),
        reference_relation=(request.data.get("reference_relation") or "").strip(),
        note=(request.data.get("note") or "").strip(),
    )

    return Response(VerificationRequestSerializer(vr).data, status=201)
# ============================================================
# ASK THE ARTISAN (AI Q&A grounded in the product listing)
# ============================================================

@api_view(["POST"])
@permission_classes([AllowAny])
def ask_product_question(request, product_id):
    """Buyer-facing Q&A: answers a buyer's free-text question about a
    specific listing, grounded only in that product's own data (title,
    description, category, craft_technique, tags). Does not invent facts
    the listing doesn't contain — tells the buyer to ask the artisan
    directly for anything it can't answer from the listing.
    """
    try:
        product = Product.objects.get(id=product_id, status=Product.Status.PUBLISHED)
    except Product.DoesNotExist:
        return Response({"error": "Product not found."}, status=404)

    question = (request.data.get("question") or "").strip()
    if not question:
        return Response({"error": "question is required."}, status=400)

    context = f"""Title: {product.title}
Category: {product.category}
Craft technique: {product.craft_technique}
Description: {product.description}
Tags: {", ".join(product.tags or [])}
Price range: ₹{product.price_min_inr or "?"} - ₹{product.price_max_inr or "?"}"""

    prompt = f"""You are a helpful shopping assistant for Kaarigar, a marketplace for Indian artisans. A buyer is asking a question about ONE specific product listing. Answer ONLY using the listing details below — do not invent materials, dimensions, care instructions, or delivery timelines that aren't stated. If the listing doesn't contain enough information to answer confidently, say so plainly and suggest the buyer message the artisan directly for that detail. Keep the answer to 2-3 short sentences, friendly and direct.

LISTING DETAILS:
{context}

BUYER QUESTION:
{question}

Respond with plain text only, no markdown, no JSON."""

    try:
        resp = requests.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent",
            headers={"Content-Type": "application/json"},
            params={"key": GEMINI_API_KEY},
            json={"contents": [{"parts": [{"text": prompt}]}]},
            timeout=30,
        )
        resp.raise_for_status()
        answer = resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
        return Response({"answer": answer})
    except Exception as e:
        return Response({"error": f"Could not get an answer right now: {str(e)}"}, status=500)