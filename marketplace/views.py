import json
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
# GALLERY
# ============================================================

from .models import GalleryItem
from .serializers import GalleryItemSerializer


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def gallery(request):
    if request.method == "GET":
        qs = GalleryItem.objects.all()
        return Response(GalleryItemSerializer(qs, many=True).data)

    if not request.user.is_authenticated:
        return Response({"error": "Authentication required."}, status=401)

    serializer = GalleryItemSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(artisan=request.user)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)