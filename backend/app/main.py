import base64
import copy
import hmac
import json
import logging
import os
import re
import secrets
import threading
from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional
from uuid import uuid4

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from supabase import Client, create_client

APP_DIR = os.path.dirname(__file__)
BACKEND_DIR = os.path.abspath(os.path.join(APP_DIR, ".."))
load_dotenv(os.path.join(BACKEND_DIR, ".env"))

# ─── Python Console Logger ────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("gfm.backend")

# ─── FastAPI App ──────────────────────────────────────────────────────────────
app = FastAPI(title="GrowForMe - User Backend API", version="1.1.0")

default_cors_allow_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "https://gfm-admin.netlify.app",
    "https://gfm-user.netlify.app",
]
default_cors_allow_origin_regex = (
    r"^https?://(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$"
    r"|^https://[a-z0-9-]+\.netlify\.app$"
    r"|^https://[a-z0-9-]+\.vercel\.app$"
)
cors_allow_origins_raw = os.getenv("CORS_ALLOW_ORIGINS", "").strip()
env_cors_allow_origins = [origin.strip() for origin in cors_allow_origins_raw.split(",") if origin.strip()]
cors_allow_origins = list(dict.fromkeys(default_cors_allow_origins + env_cors_allow_origins))
cors_allow_origin_regex_raw = os.getenv("CORS_ALLOW_ORIGIN_REGEX", "").strip()
if cors_allow_origin_regex_raw:
    cors_allow_origin_regex = f"(?:{default_cors_allow_origin_regex})|(?:{cors_allow_origin_regex_raw})"
else:
    cors_allow_origin_regex = default_cors_allow_origin_regex

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_allow_origins,
    allow_origin_regex=cors_allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Runtime Configuration ────────────────────────────────────────────────────
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_KEY = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY

OTP_TTL_MINUTES = int(os.getenv("OTP_TTL_MINUTES", "5"))
OTP_MAX_ATTEMPTS = int(os.getenv("OTP_MAX_ATTEMPTS", "5"))
OTP_SIGNING_SECRET = os.getenv("OTP_SIGNING_SECRET") or (SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY or "")

SMS_DELIVERY_MODE = os.getenv("SMS_DELIVERY_MODE", "log").strip().lower()
SMS_FALLBACK_TO_LOG = os.getenv("SMS_FALLBACK_TO_LOG", "true").strip().lower() in {"1", "true", "yes", "on"}
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER")
MNOTIFY_BASE_URL = os.getenv("MNOTIFY_BASE_URL", "https://api.mnotify.com/api").strip()
MNOTIFY_API_KEY = os.getenv("MNOTIFY_API_KEY")
MNOTIFY_SENDER_ID = os.getenv("MNOTIFY_SENDER_ID")
MNOTIFY_SMS_TYPE = os.getenv("MNOTIFY_SMS_TYPE", "otp").strip().lower()
PAYSTACK_BASE_URL = os.getenv("PAYSTACK_BASE_URL", "https://api.paystack.co").strip()
PAYSTACK_SECRET_KEY = os.getenv("PAYSTACK_SECRET_KEY")
PAYSTACK_CALLBACK_URL = os.getenv("PAYSTACK_CALLBACK_URL")
AUDIT_LOG_DB_WRITES = os.getenv("AUDIT_LOG_DB_WRITES", "false").strip().lower() in {"1", "true", "yes", "on"}
CATALOG_CACHE_TTL_SECONDS = int(os.getenv("CATALOG_CACHE_TTL_SECONDS", "45"))
ADMIN_SUMMARY_CACHE_TTL_SECONDS = int(os.getenv("ADMIN_SUMMARY_CACHE_TTL_SECONDS", "15"))
TABLE_SUPPORT_CACHE_TTL_SECONDS = int(os.getenv("TABLE_SUPPORT_CACHE_TTL_SECONDS", "120"))
ADMIN_ACTIVITY_CACHE_TTL_SECONDS = int(os.getenv("ADMIN_ACTIVITY_CACHE_TTL_SECONDS", "12"))
ADMIN_NOTIFICATIONS_CACHE_TTL_SECONDS = int(os.getenv("ADMIN_NOTIFICATIONS_CACHE_TTL_SECONDS", "8"))
AUTH_PROFILE_CACHE_TTL_SECONDS = int(os.getenv("AUTH_PROFILE_CACHE_TTL_SECONDS", "900"))
OTP_SMS_ASYNC = os.getenv("OTP_SMS_ASYNC", "true").strip().lower() in {"1", "true", "yes", "on"}
DISTRIBUTION_WEBHOOK_TOKEN = os.getenv("DISTRIBUTION_WEBHOOK_TOKEN", "").strip()
ADMIN_API_TOKEN = os.getenv("ADMIN_API_TOKEN", "").strip()
PAYSTACK_CALLBACK_URL_RUNTIME = PAYSTACK_CALLBACK_URL
DISTRIBUTION_WEBHOOK_TOKEN_RUNTIME = DISTRIBUTION_WEBHOOK_TOKEN
ADMIN_API_TOKEN_RUNTIME = ADMIN_API_TOKEN
ADMIN_SESSION_TTL_HOURS = int(os.getenv("ADMIN_SESSION_TTL_HOURS", "8"))
ADMIN_ALERT_PHONES_RAW = os.getenv("ADMIN_ALERT_PHONES", "").strip()
ADMIN_PREDEFINED_ACCOUNTS_RAW = os.getenv(
    "ADMIN_PREDEFINED_ACCOUNTS",
    "Naa Lamle Boye|naalamle@gfm.ia|naalamle123|;"
    "Elijah Boateng|elijahboateng@gfm.ia|elijahboateng123|;"
    "Thomas Quarshie|thomasquarshie@gfm.ia|thomasquarshie123|;"
    "Kasim Ibrahim|kasimibrahim@gfm.ia|kasimibrahim123|",
)

if not SUPABASE_URL or not SUPABASE_KEY:
    supabase: Client | None = None
    supabase_service: Client | None = None
    supabase_public: Client | None = None
    logger.warning("Supabase credentials not found. Database features disabled.")
else:
    supabase_service = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) if SUPABASE_SERVICE_ROLE_KEY else None
    supabase_public = create_client(SUPABASE_URL, SUPABASE_ANON_KEY) if SUPABASE_ANON_KEY else None
    supabase = supabase_service or supabase_public
    if SUPABASE_SERVICE_ROLE_KEY:
        logger.info("Supabase connected with SERVICE ROLE key.")
    else:
        logger.info("Supabase connected with anon/public key.")

if not OTP_SIGNING_SECRET:
    logger.warning("OTP_SIGNING_SECRET is empty. OTP verification will be insecure.")

catalog_cache_data: list[dict[str, Any]] = []
catalog_cache_expires_at = datetime.fromtimestamp(0, tz=timezone.utc)
admin_summary_cache_payload: Optional[dict[str, Any]] = None
admin_summary_cache_expires_at = datetime.fromtimestamp(0, tz=timezone.utc)
admin_summary_cache_lock = threading.Lock()
admin_activity_cache_feed: list[dict[str, Any]] = []
admin_activity_cache_expires_at = datetime.fromtimestamp(0, tz=timezone.utc)
admin_activity_cache_lock = threading.Lock()
admin_notifications_cache_feeds: dict[bool, list[dict[str, Any]]] = {}
admin_notifications_cache_expires_at: dict[bool, datetime] = {}
admin_notifications_cache_lock = threading.Lock()
auth_profile_cache: dict[str, tuple[Optional[dict[str, Any]], datetime]] = {}
auth_profile_cache_lock = threading.Lock()
table_support_cache: dict[str, tuple[bool, datetime]] = {}
table_support_cache_lock = threading.Lock()


# ─── Helpers ──────────────────────────────────────────────────────────────────
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
E164_PHONE_RE = re.compile(r"^\+[1-9]\d{7,14}$")
INVENTORY_NAME_PREFIX_RE = re.compile(r"^\s*\[\s*([^\]]+)\s*\]\s*(.+)$")
INVENTORY_TYPE_ALIASES = {
    "seed": "SEED",
    "seeds": "SEED",
    "hybrid seed": "SEED",
    "hybrid seeds": "SEED",
    "hybride seed": "SEED",
    "hybride seeds": "SEED",
    "fertilizer": "FERTILIZER",
    "fertilizers": "FERTILIZER",
    "fert": "FERTILIZER",
    "mineral fertilizer": "FERTILIZER",
    "mineral fertilizers": "FERTILIZER",
    "chemical": "CHEMICAL",
    "chemicals": "CHEMICAL",
    "chem": "CHEMICAL",
    "chemi": "CHEMICAL",
    "tool": "TOOL",
    "tools": "TOOL",
    "equipment": "EQUIPMENT",
    "equip": "EQUIPMENT",
    "machinery": "EQUIPMENT",
    "machine": "EQUIPMENT",
    "equipment machinery": "EQUIPMENT",
    "equipment-machinery": "EQUIPMENT",
    "nutrient": "NUTRIENT",
    "nutrients": "NUTRIENT",
    "organic nutrient": "NUTRIENT",
    "organic nutrients": "NUTRIENT",
    "pesticide": "PESTICIDE",
    "pesticides": "PESTICIDE",
    "livestock": "LIVESTOCK",
    "animal": "LIVESTOCK",
    "animals": "LIVESTOCK",
    "feed": "FEED",
    "animal feed": "FEED",
    "veterinary": "VETERINARY",
    "vet": "VETERINARY",
    "irrigation": "IRRIGATION",
    "service": "SERVICE",
    "services": "SERVICE",
}
ORDER_STATUS_LABELS = {
    "ordered": "Ordered",
    "pending": "Pending",
    "en_route": "In Transit",
    "order_placed": "Ordered",
    "payment_confirmed": "Ordered",
    "processing": "Pending",
    "packed": "Packed",
    "in_transit": "In Transit",
    "out_for_delivery": "Out for Delivery",
    "delivered": "Delivered",
    "cancelled": "Cancelled",
    "failed": "Failed",
}
ORDER_REFUNDABLE_STATUSES = {"cancelled", "failed"}
ORDER_NON_REVENUE_STATUSES = {"cancelled", "failed"}
DEFAULT_DELIVERY_WINDOW_DAYS = int(os.getenv("DEFAULT_DELIVERY_WINDOW_DAYS", "2"))
DEFAULT_DELIVERY_WINDOW_DAYS_RUNTIME = DEFAULT_DELIVERY_WINDOW_DAYS
CREDIT_DOC_UPLOAD_DIR = os.path.join(BACKEND_DIR, "uploads", "credit_docs")
CREDIT_DOC_MAX_BYTES = int(os.getenv("CREDIT_DOC_MAX_BYTES", str(8 * 1024 * 1024)))
CREDIT_APPLICATION_USER_STATUSES = {"submitted", "under_review", "pending_documents", "approved", "rejected"}
CREDIT_ACCOUNT_SPENDABLE_STATUSES = {"approved", "active"}
CREDIT_APPLICATION_DECISION_STATUSES = {"under_review", "pending_documents", "approved", "rejected"}
CONSIGNMENT_STATUSES = {"pending", "approved", "rejected"}
AGGREGATE_DEAL_TYPES = {"bulk", "auction"}
AGGREGATE_DEAL_STATUSES = {"draft", "active", "closed", "cancelled"}
BULK_PAYMENT_HOLD_MINUTES = int(os.getenv("BULK_PAYMENT_HOLD_MINUTES", "60"))
BULK_INTENT_TERMINAL_STATUSES = {
    "completed",
    "expired",
    "initialize_failed",
    "payment_not_successful",
    "payment_amount_mismatch",
    "verification_failed",
    "fulfilment_failed",
    "capacity_full_post_payment",
    "cancelled",
}


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def ensure_supabase() -> Client:
    if not supabase:
        raise HTTPException(status_code=500, detail="Database configuration missing.")
    return supabase


def ensure_service_role():
    if not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(
            status_code=500,
            detail="SUPABASE_SERVICE_ROLE_KEY is required for OTP authentication endpoints.",
        )


def ensure_service_supabase() -> Client:
    ensure_service_role()
    if not supabase_service:
        raise HTTPException(status_code=500, detail="Service-role Supabase client is not configured.")
    return supabase_service


def create_signup_auth_client() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise HTTPException(status_code=500, detail="Supabase credentials not found.")
    auth_key = SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY
    if not auth_key:
        raise HTTPException(status_code=500, detail="No Supabase key available for signup.")
    return create_client(SUPABASE_URL, auth_key)


def ensure_paystack_config():
    if not PAYSTACK_SECRET_KEY:
        raise HTTPException(
            status_code=500,
            detail="PAYSTACK_SECRET_KEY is required for Paystack payment endpoints.",
        )


def ensure_admin_token(header_value: Optional[str]):
    if not ADMIN_API_TOKEN_RUNTIME:
        raise HTTPException(status_code=500, detail="ADMIN_API_TOKEN is not configured.")
    if not header_value or header_value.strip() != ADMIN_API_TOKEN_RUNTIME:
        raise HTTPException(status_code=401, detail="Invalid admin token.")


def require_admin_session_or_token(
    authorization: Optional[str] = None,
    x_admin_token: Optional[str] = None,
) -> dict[str, str]:
    if authorization and authorization.strip():
        return require_admin_session(authorization)
    if x_admin_token and x_admin_token.strip():
        ensure_admin_token(x_admin_token)
        return {"name": "Admin Token", "email": "admin-token"}
    raise HTTPException(status_code=401, detail="Admin authentication is required.")


def parse_predefined_admin_accounts(raw: str) -> dict[str, dict[str, str]]:
    admins: dict[str, dict[str, str]] = {}
    for row in raw.split(";"):
        item = row.strip()
        if not item:
            continue
        parts = [part.strip() for part in item.split("|")]
        if len(parts) < 3:
            continue
        name, email, password = parts[:3]
        phone = parts[3] if len(parts) > 3 else ""
        email_key = email.lower()
        if not EMAIL_RE.match(email_key):
            continue
        admins[email_key] = {
            "name": name,
            "email": email_key,
            "password": password,
            "phone": phone,
        }
    return admins


ADMIN_PREDEFINED_ACCOUNTS = parse_predefined_admin_accounts(ADMIN_PREDEFINED_ACCOUNTS_RAW)


def supports_admin_otp_tables(sb: Client) -> bool:
    try:
        sb.table("admin_otp_challenges").select("id").limit(1).execute()
        return True
    except Exception as exc:
        return "public.admin_otp_challenges" not in str(exc)


def hash_admin_otp(email: str, otp: str) -> str:
    if not OTP_SIGNING_SECRET:
        raise HTTPException(status_code=500, detail="OTP signing secret is not configured.")
    payload = f"admin:{email}:{otp}".encode("utf-8")
    return hmac.new(OTP_SIGNING_SECRET.encode("utf-8"), payload, digestmod="sha256").hexdigest()


def mask_phone(phone: str) -> str:
    digits = re.sub(r"\D", "", phone)
    if len(digits) < 4:
        return "***"
    return f"***{digits[-4:]}"


def dispatch_admin_otp(admin: dict[str, str], otp: str) -> tuple[str, str]:
    phone = (admin.get("phone") or "").strip()
    if not phone:
        if SMS_FALLBACK_TO_LOG:
            logger.info(f"[ADMIN_OTP_DEV_ONLY] OTP for {admin.get('email')}: {otp}")
            return "log", admin.get("email") or ""
        raise HTTPException(status_code=500, detail="Admin phone number is not configured for OTP SMS.")

    try:
        normalized_phone = normalize_phone(phone)
        dispatch_sms_otp(normalized_phone, otp)
        return "sms", mask_phone(normalized_phone)
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning(f"Admin OTP SMS dispatch failed for {admin.get('email')}: {exc}")
        if SMS_FALLBACK_TO_LOG:
            logger.info(f"[ADMIN_OTP_DEV_ONLY] OTP for {admin.get('email')}: {otp}")
            return "log", admin.get("email") or ""
        raise HTTPException(status_code=502, detail=f"Failed to dispatch admin OTP SMS: {exc}")


def list_admin_alert_phones() -> list[str]:
    values: list[str] = []
    for admin in ADMIN_PREDEFINED_ACCOUNTS.values():
        raw = str(admin.get("phone") or "").strip()
        if raw:
            values.append(raw)

    if ADMIN_ALERT_PHONES_RAW:
        values.extend([chunk.strip() for chunk in ADMIN_ALERT_PHONES_RAW.split(",") if chunk.strip()])

    phones: list[str] = []
    seen: set[str] = set()
    for raw in values:
        try:
            normalized = normalize_phone(raw)
        except HTTPException:
            logger.warning(f"Skipping invalid admin alert phone: {raw}")
            continue
        if normalized in seen:
            continue
        seen.add(normalized)
        phones.append(normalized)
    return phones


def resolve_order_items_description(sb: Client, items: list) -> str:
    if not items:
        return "Items"
    
    unique_ids = list({str(item.get("id") or "") for item in items if str(item.get("id") or "").strip()})
    if not unique_ids:
        return "Items"
    
    try:
        res = sb.table("catalog").select("id, name").in_("id", unique_ids).execute()
        name_map = {row["id"]: row["name"] for row in res.data}
    except Exception as exc:
        logger.warning(f"Could not resolve product names for SMS description: {exc}")
        name_map = {}

    labels = []
    for item in items:
        pid = str(item.get("id") or "")
        qty = int(item.get("quantity") or 1)
        pname = name_map.get(pid) or f"Product {pid[:4]}"
        labels.append(f"{qty}x {pname}")
    
    full_desc = ", ".join(labels)
    if len(full_desc) > 80:
        return f"{labels[0]} and {len(labels)-1} others"
    return full_desc


def build_follow_up_sms_message(order_id: str, user_label: str, tracking_status: str, message: str) -> str:
    status_label = format_order_status(normalize_tracking_status(tracking_status))
    cleaned_note = re.sub(r"\s+", " ", (message or "").strip())
    if len(cleaned_note) > 90:
        cleaned_note = f"{cleaned_note[:87]}..."
    
    order_short = str(order_id or "").strip()[:8].upper()
    
    return (
        f"GFM Alert: Follow-up on order\n"
        f"Order ID: {order_short}\n\n"
        f"Customer: {user_label}\n"
        f"Status: {status_label}\n\n"
        f"Message: {cleaned_note or 'No note provided'}"
    )


def notify_admins_order_follow_up_sms(order_id: str, user_id: str, tracking_status: str, message: str) -> dict[str, int]:
    phones = list_admin_alert_phones()
    if not phones:
        logger.info(f"No admin phones configured for follow-up SMS alert (order={order_id}).")
        return {"attempted": 0, "queued": 0, "failed": 0}

    user_label = resolve_user_display_name(user_id)
    sms_message = build_follow_up_sms_message(order_id, user_label, tracking_status, message)
    attempted = len(phones)
    queued = 0
    failed = 0
    for phone in phones:
        try:
            dispatch_sms_message(phone, sms_message, log_tag="ADMIN_FOLLOW_UP_DEV_ONLY")
            queued += 1
        except Exception as exc:
            failed += 1
            logger.error(f"Could not dispatch admin follow-up SMS to {phone} for order {order_id}: {exc}")
    return {"attempted": attempted, "queued": queued, "failed": failed}


def format_credit_application_status(status: Optional[str]) -> str:
    normalized = normalize_credit_application_status(status)
    labels = {
        "submitted": "Submitted",
        "under_review": "Under Review",
        "pending_documents": "Pending Documents",
        "approved": "Approved",
        "rejected": "Rejected",
    }
    return labels.get(normalized, normalized.replace("_", " ").title())


def build_credit_application_submitted_admin_sms(
    application_id: str,
    user_label: str,
    final_score: float,
    creditworthiness: str,
    suggested_credit_limit: float,
) -> str:
    app_short = str(application_id or "").strip()[:8].upper()
    return (
        "GFM Alert: New credit application submitted\n"
        f"Application ID: {app_short}\n\n"
        f"Applicant: {user_label}\n"
        f"Score: {round(to_float(final_score), 2):.2f}\n"
        f"Creditworthiness: {str(creditworthiness or 'unknown').title()}\n"
        f"Suggested Limit: GH\u20b5{round(to_float(suggested_credit_limit), 2):.2f}"
    )


def notify_admins_credit_application_submitted_sms(
    application_id: str,
    user_id: str,
    final_score: float,
    creditworthiness: str,
    suggested_credit_limit: float,
) -> dict[str, int]:
    phones = list_admin_alert_phones()
    if not phones:
        logger.info(f"No admin phones configured for credit-application SMS alert (application={application_id}).")
        return {"attempted": 0, "queued": 0, "failed": 0}

    user_label = resolve_user_display_name(user_id)
    sms_message = build_credit_application_submitted_admin_sms(
        application_id=application_id,
        user_label=user_label,
        final_score=final_score,
        creditworthiness=creditworthiness,
        suggested_credit_limit=suggested_credit_limit,
    )
    attempted = len(phones)
    queued = 0
    failed = 0
    for phone in phones:
        try:
            dispatch_sms_message(phone, sms_message, log_tag="ADMIN_CREDIT_APP_DEV_ONLY")
            queued += 1
        except Exception as exc:
            failed += 1
            logger.error(
                f"Could not dispatch admin credit-application SMS to {phone} for application {application_id}: {exc}"
            )
    return {"attempted": attempted, "queued": queued, "failed": failed}


def build_credit_status_update_user_sms(
    application_id: str,
    status: str,
    approved_credit_limit: Optional[float] = None,
    review_note: Optional[str] = None,
) -> str:
    status_label = format_credit_application_status(status)
    app_short = str(application_id or "").strip()[:8].upper()
    lines = [
        "GrowForMe Credit Update",
        f"Application ID: {app_short}",
        "",
        f"Status: {status_label}",
    ]
    if normalize_credit_application_status(status) == "approved" and approved_credit_limit is not None:
        lines.append(f"Approved Limit: GH\u20b5{round(to_float(approved_credit_limit), 2):.2f}")
    clean_note = re.sub(r"\s+", " ", (review_note or "").strip())
    if clean_note:
        if len(clean_note) > 90:
            clean_note = f"{clean_note[:87]}..."
        lines.append(f"Note: {clean_note}")
    lines.append("")
    lines.append("Open the app to view full details.")
    return "\n".join(lines)


def notify_user_credit_status_update_sms(
    sb: Client,
    user_id: str,
    application_id: str,
    status: str,
    approved_credit_limit: Optional[float] = None,
    review_note: Optional[str] = None,
) -> dict[str, Any]:
    customer_phone = resolve_user_phone_for_notifications(sb, user_id)
    if not customer_phone:
        return {"sent": False, "reason": "phone_not_found", "phone_masked": None}

    phone_masked = mask_phone(customer_phone)
    sms_message = build_credit_status_update_user_sms(
        application_id=application_id,
        status=status,
        approved_credit_limit=approved_credit_limit,
        review_note=review_note,
    )
    try:
        dispatch_sms_message(customer_phone, sms_message, log_tag="CREDIT_STATUS_USER_ALERT")
        return {
            "sent": True,
            "reason": "queued" if OTP_SMS_ASYNC else "sent",
            "phone_masked": phone_masked,
        }
    except Exception as exc:
        return {"sent": False, "reason": f"sms_send_failed: {exc}", "phone_masked": phone_masked}


def fetch_auth_user_profile(user_id: str) -> Optional[dict[str, Any]]:
    safe_user_id = str(user_id or "").strip()
    if not safe_user_id or not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        return None

    if AUTH_PROFILE_CACHE_TTL_SECONDS > 0:
        with auth_profile_cache_lock:
            cached = auth_profile_cache.get(safe_user_id)
            if cached and now_utc() < cached[1]:
                return copy.deepcopy(cached[0]) if cached[0] is not None else None

    cached_profile: Optional[dict[str, Any]] = None
    try:
        response = httpx.get(
            f"{SUPABASE_URL.rstrip('/')}/auth/v1/admin/users/{safe_user_id}",
            headers={
                "apikey": SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            },
            timeout=20.0,
        )
        if response.status_code >= 300:
            logger.warning(f"Could not fetch auth profile for user {safe_user_id} (status={response.status_code}).")
            cached_profile = None
        else:
            body = response.json()
            if isinstance(body, dict):
                if isinstance(body.get("user"), dict):
                    cached_profile = body.get("user")
                else:
                    cached_profile = body
            else:
                cached_profile = None
    except Exception as exc:
        logger.warning(f"Could not fetch auth profile for user {safe_user_id}: {exc}")
        cached_profile = None

    if AUTH_PROFILE_CACHE_TTL_SECONDS > 0:
        with auth_profile_cache_lock:
            auth_profile_cache[safe_user_id] = (
                copy.deepcopy(cached_profile) if cached_profile is not None else None,
                now_utc() + timedelta(seconds=AUTH_PROFILE_CACHE_TTL_SECONDS),
            )
    return cached_profile


def resolve_user_display_name(user_id: str) -> str:
    safe_user_id = str(user_id or "").strip()
    if not safe_user_id:
        return "Customer"

    profile = fetch_auth_user_profile(safe_user_id)
    if isinstance(profile, dict):
        metadata = profile.get("user_metadata")
        if isinstance(metadata, dict):
            for field in ("name", "full_name", "display_name"):
                value = str(metadata.get(field) or "").strip()
                if value:
                    return value

        email = str(profile.get("email") or "").strip()
        if email and "@" in email:
            return email.split("@", 1)[0]

    return "Customer"


def resolve_user_phone_for_notifications(sb: Client, user_id: str) -> Optional[str]:
    if not user_id:
        return None

    try:
        phone_res = (
            sb.table("user_phone_verifications")
            .select("phone,verified_at")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if phone_res.data:
            row = phone_res.data[0]
            raw_phone = str(row.get("phone") or "").strip()
            if raw_phone:
                try:
                    return normalize_phone(raw_phone)
                except HTTPException:
                    logger.warning(f"Invalid phone format in user_phone_verifications for user {user_id}.")
    except Exception as exc:
        logger.warning(f"Could not resolve phone from user_phone_verifications for user {user_id}: {exc}")

    profile = fetch_auth_user_profile(user_id)
    if isinstance(profile, dict):
        metadata = profile.get("user_metadata")
        candidates = [
            profile.get("phone"),
            (metadata or {}).get("phone") if isinstance(metadata, dict) else None,
        ]
        for candidate in candidates:
            raw = str(candidate or "").strip()
            if not raw:
                continue
            try:
                return normalize_phone(raw)
            except HTTPException:
                continue
    return None


def build_order_status_update_user_sms(order_id: str, status: str, items_label: str = "Items", note: str = "") -> str:
    status_label = format_order_status(normalize_tracking_status(status))
    
    # Use a separator line to visual 'underline' effect in plain text
    return (
        f"GrowForMe:\n"
        f"Order for {items_label}\n"
        f"------------------\n"
        f"is now {status_label}"
    )


def _b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")


def _b64url_decode(value: str) -> bytes:
    pad = "=" * ((4 - len(value) % 4) % 4)
    return base64.urlsafe_b64decode(value + pad)


def create_admin_session_token(admin: dict[str, str]) -> tuple[str, datetime]:
    if not OTP_SIGNING_SECRET:
        raise HTTPException(status_code=500, detail="OTP signing secret is not configured.")
    expires_at = now_utc() + timedelta(hours=ADMIN_SESSION_TTL_HOURS)
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": admin["email"],
        "name": admin["name"],
        "role": "admin",
        "exp": int(expires_at.timestamp()),
    }
    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    signature = hmac.new(OTP_SIGNING_SECRET.encode("utf-8"), signing_input, digestmod="sha256").digest()
    token = f"{header_b64}.{payload_b64}.{_b64url_encode(signature)}"
    return token, expires_at


def verify_admin_session_token(token: str) -> dict[str, Any]:
    if not OTP_SIGNING_SECRET:
        raise HTTPException(status_code=500, detail="OTP signing secret is not configured.")
    parts = token.split(".")
    if len(parts) != 3:
        raise HTTPException(status_code=401, detail="Invalid admin session token.")
    header_b64, payload_b64, sig_b64 = parts
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    expected_sig = hmac.new(OTP_SIGNING_SECRET.encode("utf-8"), signing_input, digestmod="sha256").digest()
    provided_sig = _b64url_decode(sig_b64)
    if not hmac.compare_digest(expected_sig, provided_sig):
        raise HTTPException(status_code=401, detail="Invalid admin session token signature.")
    try:
        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid admin session token payload.")
    exp = int(payload.get("exp", 0))
    if exp <= int(now_utc().timestamp()):
        raise HTTPException(status_code=401, detail="Admin session token has expired.")
    if str(payload.get("role", "")).lower() != "admin":
        raise HTTPException(status_code=401, detail="Invalid admin role in token.")
    return payload


def extract_bearer_token(authorization: Optional[str]) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header.")
    scheme, _, value = authorization.partition(" ")
    if scheme.lower() != "bearer" or not value.strip():
        raise HTTPException(status_code=401, detail="Invalid Authorization header format.")
    return value.strip()


def require_admin_session(authorization: Optional[str]) -> dict[str, str]:
    token = extract_bearer_token(authorization)
    payload = verify_admin_session_token(token)
    email = str(payload.get("sub", "")).strip().lower()
    admin = ADMIN_PREDEFINED_ACCOUNTS.get(email)
    if not admin:
        raise HTTPException(status_code=401, detail="Admin session is invalid.")
    return admin


def parse_db_timestamp(value: str) -> datetime:
    raw = str(value or "").strip()
    if not raw:
        raise ValueError("Empty timestamp value.")

    normalized = raw.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(normalized)
    except ValueError:
        pass

    # Some DB drivers may return fractional seconds with non-6 precision.
    match = re.match(
        r"^(?P<base>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})"
        r"(?:\.(?P<fraction>\d+))?"
        r"(?P<tz>Z|[+-]\d{2}:\d{2}|[+-]\d{4}|[+-]\d{2})?$",
        raw,
    )
    if not match:
        raise ValueError(f"Invalid timestamp format: {raw}")

    base = match.group("base")
    fraction = match.group("fraction")
    tz = match.group("tz") or ""

    if tz == "Z":
        tz = "+00:00"
    elif re.match(r"[+-]\d{4}$", tz):
        tz = f"{tz[:3]}:{tz[3:]}"
    elif re.match(r"[+-]\d{2}$", tz):
        tz = f"{tz}:00"

    if fraction:
        fraction = (fraction + "000000")[:6]
        rebuilt = f"{base}.{fraction}{tz}"
    else:
        rebuilt = f"{base}{tz}"

    return datetime.fromisoformat(rebuilt)


def invalidate_catalog_cache():
    global catalog_cache_data, catalog_cache_expires_at
    catalog_cache_data = []
    catalog_cache_expires_at = datetime.fromtimestamp(0, tz=timezone.utc)


def get_cached_admin_summary_payload() -> Optional[dict[str, Any]]:
    if ADMIN_SUMMARY_CACHE_TTL_SECONDS <= 0:
        return None
    with admin_summary_cache_lock:
        if not admin_summary_cache_payload:
            return None
        if now_utc() >= admin_summary_cache_expires_at:
            return None
        return copy.deepcopy(admin_summary_cache_payload)


def set_cached_admin_summary_payload(payload: dict[str, Any]):
    global admin_summary_cache_payload, admin_summary_cache_expires_at
    if ADMIN_SUMMARY_CACHE_TTL_SECONDS <= 0:
        return
    with admin_summary_cache_lock:
        admin_summary_cache_payload = copy.deepcopy(payload)
        admin_summary_cache_expires_at = now_utc() + timedelta(seconds=ADMIN_SUMMARY_CACHE_TTL_SECONDS)


def get_cached_admin_activity_feed() -> Optional[list[dict[str, Any]]]:
    if ADMIN_ACTIVITY_CACHE_TTL_SECONDS <= 0:
        return None
    with admin_activity_cache_lock:
        if not admin_activity_cache_feed:
            return None
        if now_utc() >= admin_activity_cache_expires_at:
            return None
        return copy.deepcopy(admin_activity_cache_feed)


def set_cached_admin_activity_feed(feed: list[dict[str, Any]]):
    global admin_activity_cache_feed, admin_activity_cache_expires_at
    if ADMIN_ACTIVITY_CACHE_TTL_SECONDS <= 0:
        return
    with admin_activity_cache_lock:
        admin_activity_cache_feed = copy.deepcopy(feed)
        admin_activity_cache_expires_at = now_utc() + timedelta(seconds=ADMIN_ACTIVITY_CACHE_TTL_SECONDS)


def get_cached_admin_notifications_feed(include_info: bool) -> Optional[list[dict[str, Any]]]:
    if ADMIN_NOTIFICATIONS_CACHE_TTL_SECONDS <= 0:
        return None
    key = bool(include_info)
    with admin_notifications_cache_lock:
        cached_feed = admin_notifications_cache_feeds.get(key)
        cached_expiry = admin_notifications_cache_expires_at.get(key)
        if not cached_feed or not cached_expiry:
            return None
        if now_utc() >= cached_expiry:
            return None
        return copy.deepcopy(cached_feed)


def set_cached_admin_notifications_feed(include_info: bool, feed: list[dict[str, Any]]):
    if ADMIN_NOTIFICATIONS_CACHE_TTL_SECONDS <= 0:
        return
    key = bool(include_info)
    with admin_notifications_cache_lock:
        admin_notifications_cache_feeds[key] = copy.deepcopy(feed)
        admin_notifications_cache_expires_at[key] = now_utc() + timedelta(
            seconds=ADMIN_NOTIFICATIONS_CACHE_TTL_SECONDS
        )


def get_catalog_snapshot(sb: Client) -> tuple[list[dict[str, Any]], bool]:
    global catalog_cache_data, catalog_cache_expires_at
    if (
        CATALOG_CACHE_TTL_SECONDS > 0
        and catalog_cache_data
        and now_utc() < catalog_cache_expires_at
    ):
        return catalog_cache_data, True

    response = sb.table("catalog").select("*").eq("is_archived", False).execute()
    data = response.data or []
    if CATALOG_CACHE_TTL_SECONDS > 0:
        catalog_cache_data = data
        catalog_cache_expires_at = now_utc() + timedelta(seconds=CATALOG_CACHE_TTL_SECONDS)
    return data, False


def normalize_email(email: str) -> str:
    cleaned = email.strip().lower()
    if not EMAIL_RE.match(cleaned):
        raise HTTPException(status_code=400, detail="Provide a valid email address.")
    return cleaned


def normalize_inventory_type(value: str) -> str:
    cleaned = re.sub(r"[_-]+", " ", (value or "").strip()).strip().lower()
    cleaned = re.sub(r"\s+", " ", cleaned)
    if not cleaned:
        raise HTTPException(status_code=400, detail="Inventory type/category is required.")
    return INVENTORY_TYPE_ALIASES.get(cleaned, cleaned.upper())


def extract_inventory_type_from_name(name: str) -> tuple[Optional[str], str]:
    raw = (name or "").strip()
    if not raw:
        return None, raw
    match = INVENTORY_NAME_PREFIX_RE.match(raw)
    if not match:
        return None, raw
    inferred_type = (match.group(1) or "").strip()
    cleaned_name = (match.group(2) or "").strip()
    return (inferred_type or None), (cleaned_name or raw)


def normalize_inventory_name_and_type(name: str, item_type: str) -> tuple[str, str, bool]:
    inferred_type, cleaned_name = extract_inventory_type_from_name(name)
    normalized_name = (cleaned_name or "").strip()
    if not normalized_name:
        raise HTTPException(status_code=400, detail="Item name is required.")
    source_type = inferred_type or item_type
    normalized_type = normalize_inventory_type(source_type)
    return normalized_name, normalized_type, inferred_type is not None


def build_inventory_id(name: str, item_type: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")
    if not slug:
        slug = "item"
    raw_prefix = re.sub(r"[^a-z0-9]+", "-", item_type.strip().lower()).strip("-")
    prefix = (raw_prefix or "item")[:10]
    return f"{prefix}-{slug[:18]}-{secrets.token_hex(2)}"


def normalize_aggregate_deal_type(value: str) -> str:
    cleaned = (value or "").strip().lower()
    if cleaned not in AGGREGATE_DEAL_TYPES:
        raise HTTPException(status_code=400, detail=f"deal_type must be one of: {', '.join(sorted(AGGREGATE_DEAL_TYPES))}.")
    return cleaned


def normalize_aggregate_deal_status(value: Optional[str]) -> str:
    cleaned = (value or "").strip().lower() or "active"
    if cleaned not in AGGREGATE_DEAL_STATUSES:
        raise HTTPException(status_code=400, detail=f"status must be one of: {', '.join(sorted(AGGREGATE_DEAL_STATUSES))}.")
    return cleaned


def parse_optional_datetime(value: Optional[str], field_name: str) -> Optional[str]:
    raw = (value or "").strip()
    if not raw:
        return None
    try:
        dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except Exception:
        raise HTTPException(status_code=400, detail=f"{field_name} must be a valid ISO datetime.")
    if not dt.tzinfo:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()


def normalize_phone(phone: str) -> str:
    cleaned = re.sub(r"[\s()-]+", "", phone.strip())
    if cleaned.startswith("00"):
        cleaned = f"+{cleaned[2:]}"
    if not cleaned.startswith("+"):
        raise HTTPException(status_code=400, detail="Phone must be in E.164 format (e.g. +233xxxxxxxxx).")
    if not E164_PHONE_RE.match(cleaned):
        raise HTTPException(status_code=400, detail="Invalid phone format. Use E.164 format.")
    return cleaned


def generate_otp() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_otp(user_id: str, phone: str, otp: str) -> str:
    if not OTP_SIGNING_SECRET:
        raise HTTPException(status_code=500, detail="OTP signing secret is not configured.")
    payload = f"{user_id}:{phone}:{otp}".encode("utf-8")
    return hmac.new(OTP_SIGNING_SECRET.encode("utf-8"), payload, digestmod="sha256").hexdigest()


def format_mnotify_recipient(phone: str) -> str:
    # mNotify examples use numeric strings without "+".
    return re.sub(r"\D", "", phone)


def log_sms_fallback(phone: str, message: str, reason: str, log_tag: str = "SMS_DEV_ONLY"):
    logger.warning(f"SMS delivery failed. Falling back to log mode. reason={reason}")
    logger.info(f"[{log_tag}] SMS for {phone}: {message}")


def send_sms_message(phone: str, message: str, log_tag: str = "SMS_DEV_ONLY"):
    if SMS_DELIVERY_MODE == "twilio":
        try:
            if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN or not TWILIO_FROM_NUMBER:
                raise RuntimeError("Twilio credentials are missing.")
            twilio_url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Messages.json"
            response = httpx.post(
                twilio_url,
                data={"To": phone, "From": TWILIO_FROM_NUMBER, "Body": message},
                auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN),
                timeout=15.0,
            )
            if response.status_code >= 300:
                raise RuntimeError(f"Twilio send failed ({response.status_code}): {response.text}")
            return
        except Exception as exc:
            if SMS_FALLBACK_TO_LOG:
                log_sms_fallback(phone, message, str(exc), log_tag=log_tag)
                return
            raise HTTPException(status_code=502, detail=f"Failed to dispatch SMS via Twilio: {exc}")

    if SMS_DELIVERY_MODE == "mnotify":
        try:
            if not MNOTIFY_API_KEY or not MNOTIFY_SENDER_ID:
                raise RuntimeError("mNotify credentials are missing.")

            endpoint = f"{MNOTIFY_BASE_URL.rstrip('/')}/sms/quick"
            payload = {
                "recipient": [format_mnotify_recipient(phone)],
                "sender": MNOTIFY_SENDER_ID,
                "message": message,
                "is_schedule": False,
                "schedule_date": "",
            }
            if MNOTIFY_SMS_TYPE:
                payload["sms_type"] = MNOTIFY_SMS_TYPE

            response = httpx.post(
                f"{endpoint}?key={MNOTIFY_API_KEY}",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=20.0,
            )
            if response.status_code >= 300:
                raise RuntimeError(f"mNotify send failed ({response.status_code}): {response.text}")

            try:
                body = response.json()
            except Exception:
                raise RuntimeError(f"mNotify returned non-JSON response: {response.text}")

            if str(body.get("status", "")).lower() != "success":
                raise RuntimeError(body.get("message", "mNotify SMS dispatch failed."))
            return
        except Exception as exc:
            if SMS_FALLBACK_TO_LOG:
                log_sms_fallback(phone, message, str(exc), log_tag=log_tag)
                return
            raise HTTPException(status_code=502, detail=f"Failed to dispatch SMS via mNotify: {exc}")

    logger.info(f"[{log_tag}] SMS for {phone}: {message}")


def dispatch_sms_message(phone: str, message: str, log_tag: str = "SMS_DEV_ONLY"):
    if not OTP_SMS_ASYNC:
        send_sms_message(phone, message, log_tag=log_tag)
        return

    def worker():
        try:
            send_sms_message(phone, message, log_tag=log_tag)
        except Exception as exc:
            logger.error(f"Asynchronous SMS dispatch failed for {phone}: {exc}")

    threading.Thread(target=worker, daemon=True).start()


def send_sms_otp(phone: str, otp: str):
    message = f"Your GrowForMe OTP is {otp}. It expires in {OTP_TTL_MINUTES} minutes."
    send_sms_message(phone, message, log_tag="OTP_DEV_ONLY")


def dispatch_sms_otp(phone: str, otp: str):
    message = f"Your GrowForMe OTP is {otp}. It expires in {OTP_TTL_MINUTES} minutes."
    dispatch_sms_message(phone, message, log_tag="OTP_DEV_ONLY")


# ─── Audit Logger ─────────────────────────────────────────────────────────────
def audit_log(
    event_type: str,
    user_id: Optional[str] = None,
    description: str = "",
    metadata: Optional[dict] = None,
):
    """
    Writes a structured audit event to Supabase system_logs table.
    Powers the admin dashboard analytics pipeline.
    Falls back to console-only logging if DB is unavailable.
    """
    log_entry = {
        "event_type": event_type,
        "user_id": user_id,
        "description": description,
        "metadata": metadata or {},
    }
    # Always print to console
    logger.info(f"[AUDIT] {event_type} | user={user_id} | {description}")

    # Persist admin activity even when generic DB writes are disabled.
    should_persist = AUDIT_LOG_DB_WRITES or event_type.strip().upper().startswith("ADMIN_")
    if supabase and should_persist:
        try:
            supabase.table("system_logs").insert(log_entry).execute()
        except Exception as e:
            logger.error(f"Audit log write failed: {e}")


# ─── Pydantic Models ──────────────────────────────────────────────────────────
class OrderItem(BaseModel):
    id: str
    quantity: int
    price: float

class CheckoutPayload(BaseModel):
    userId: str
    totalAmount: float
    credit_applied: float = 0.0   # how much of the credit limit the user chose to use
    items: List[OrderItem]


class PaystackInitializePayload(CheckoutPayload):
    email: str
    address: str
    callback_url: Optional[str] = None


class PaystackVerifyPayload(BaseModel):
    reference: str


class RegisterInitiatePayload(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: str
    password: str = Field(min_length=8, max_length=128)
    phone: str


class OtpVerifyPayload(BaseModel):
    userId: str
    phone: str
    otp: str


class OtpResendPayload(BaseModel):
    userId: str
    phone: str


class AdminLoginInitiatePayload(BaseModel):
    email: str
    password: str = Field(min_length=8, max_length=128)


class AdminOtpVerifyPayload(BaseModel):
    email: str
    challenge_id: str
    otp: str = Field(min_length=4, max_length=10)


class AdminInventoryCreatePayload(BaseModel):
    id: Optional[str] = None
    name: str = Field(min_length=2, max_length=150)
    type: str = Field(min_length=3, max_length=30)
    price: float = Field(ge=0)
    stock: int = Field(ge=0)
    location: Optional[str] = None
    imageUrl: Optional[str] = None
    size: Optional[str] = None
    weight: Optional[str] = None
    brand: Optional[str] = None


class AdminInventoryUpdatePayload(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=150)
    type: Optional[str] = Field(default=None, min_length=3, max_length=30)
    price: Optional[float] = Field(default=None, ge=0)
    stock: Optional[int] = Field(default=None, ge=0)
    location: Optional[str] = None
    imageUrl: Optional[str] = None
    size: Optional[str] = None
    weight: Optional[str] = None
    brand: Optional[str] = None


class AdminInventoryDeletePayload(BaseModel):
    password: str = Field(min_length=8, max_length=128)


class AdminAggregateDealCreatePayload(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    description: Optional[str] = Field(default=None, max_length=800)
    deal_type: str
    item_name: str = Field(min_length=2, max_length=160)
    item_category: Optional[str] = Field(default=None, max_length=80)
    unit: Optional[str] = Field(default=None, max_length=40)
    image_url: Optional[str] = Field(default=None, max_length=500)
    base_price: float = Field(ge=0)
    discount_percent: float = Field(default=0.0, ge=0, le=95)
    deal_price: Optional[float] = Field(default=None, ge=0)
    target_quantity: Optional[int] = Field(default=None, ge=1)
    min_join_quantity: int = Field(default=1, ge=1)
    max_join_quantity: Optional[int] = Field(default=None, ge=1)
    starting_bid: Optional[float] = Field(default=None, ge=0)
    start_at: Optional[str] = None
    end_at: Optional[str] = None
    status: Optional[str] = "active"
    source_inventory_item_id: Optional[str] = Field(default=None, max_length=200)
    reserve_inventory_quantity: Optional[int] = Field(default=None, ge=1)


class AdminAggregateDealUpdatePayload(BaseModel):
    title: Optional[str] = Field(default=None, min_length=3, max_length=160)
    description: Optional[str] = Field(default=None, max_length=800)
    item_name: Optional[str] = Field(default=None, min_length=2, max_length=160)
    item_category: Optional[str] = Field(default=None, max_length=80)
    unit: Optional[str] = Field(default=None, max_length=40)
    image_url: Optional[str] = Field(default=None, max_length=500)
    base_price: Optional[float] = Field(default=None, ge=0)
    discount_percent: Optional[float] = Field(default=None, ge=0, le=95)
    deal_price: Optional[float] = Field(default=None, ge=0)
    target_quantity: Optional[int] = Field(default=None, ge=1)
    min_join_quantity: Optional[int] = Field(default=None, ge=1)
    max_join_quantity: Optional[int] = Field(default=None, ge=1)
    starting_bid: Optional[float] = Field(default=None, ge=0)
    start_at: Optional[str] = None
    end_at: Optional[str] = None
    status: Optional[str] = None


class AdminOrderStatusUpdatePayload(BaseModel):
    status: str = Field(min_length=2, max_length=50)
    note: Optional[str] = Field(default=None, max_length=500)
    status_label: Optional[str] = Field(default=None, max_length=80)
    estimated_delivery_at: Optional[str] = None
    delivery_address: Optional[str] = Field(default=None, max_length=400)
    payment_status: Optional[str] = Field(default=None, max_length=80)


class ConsignmentCreatePayload(BaseModel):
    userId: str
    product_category: str = Field(min_length=2, max_length=80)
    product_name: Optional[str] = Field(default=None, max_length=180)
    quantity: float = Field(gt=0)
    unit: str = Field(min_length=1, max_length=40)
    expected_price: float = Field(ge=0)


class AdminConsignmentApprovePayload(BaseModel):
    approved_deal_id: Optional[str] = Field(default=None, max_length=120)


class AdminConsignmentRejectPayload(BaseModel):
    reason: str = Field(min_length=3, max_length=500)


class AggregateDealJoinPayload(BaseModel):
    user_id: str
    email: str
    quantity: int = Field(ge=1)
    callback_url: Optional[str] = None


class AggregateDealBidPayload(BaseModel):
    user_id: str
    bid_amount: float = Field(gt=0)


class OrderFollowUpPayload(BaseModel):
    userId: str
    message: str = Field(min_length=3, max_length=500)


class CreditApplicationCreatePayload(BaseModel):
    userId: str
    consent_credit_assessment: bool
    drought_flood_index: float = Field(ge=0, le=100)
    gender: str
    national_id: Optional[str] = None
    savings: float = Field(ge=0)
    payment_frequency: int = Field(ge=0)
    crop_types: str
    is_association_member: bool
    has_motorbike: bool
    acres: float = Field(ge=0)
    satellite_verified: bool
    repayment_rate: float = Field(ge=0, le=100)
    yield_data: str
    yield_precise: bool = False
    yield_unit: Optional[str] = None
    endorsements: int = Field(ge=0)
    has_irrigation: str
    irrigation_scheme: bool
    market_access_index: float = Field(ge=0, le=100)
    training_sessions: int = Field(ge=0)
    livestock_value: float = Field(ge=0)
    alternative_income: float = Field(ge=0)
    has_insurance: str
    insurance_subscription: bool
    digital_score: float = Field(ge=0, le=100)
    soil_health_index: float = Field(ge=0, le=100)
    soil_health_observation: Optional[str] = None
    farmer_id: Optional[int] = None
    region: Optional[str] = None
    district: Optional[str] = None
    town: Optional[str] = None
    momo_number: Optional[str] = None
    momo_provider: Optional[str] = None
    full_name: Optional[str] = None
    dob: Optional[str] = None
    has_loan_history: bool = False
    loan_referee_name: Optional[str] = None
    loan_referee_phone: Optional[str] = None
    referee_1_name: Optional[str] = None
    referee_1_phone: Optional[str] = None
    referee_2_name: Optional[str] = None
    referee_2_phone: Optional[str] = None


class CreditApplicationDecisionPayload(BaseModel):
    status: str
    reviewer: Optional[str] = None
    review_note: Optional[str] = None
    approved_credit_limit: Optional[float] = Field(default=None, ge=0)


class BulkCreditApprovalPayload(BaseModel):
    approved_credit_limit: float = Field(default=12000, ge=0)
    final_score: float = Field(default=72.0, ge=0, le=100)
    reviewer: Optional[str] = None
    review_note: Optional[str] = None


class DistributionStatusWebhookPayload(BaseModel):
    order_id: str
    status: str
    note: str = Field(min_length=2, max_length=500)
    event_time: Optional[str] = None
    estimated_delivery_at: Optional[str] = None
    delivery_address: Optional[str] = None
    status_label: Optional[str] = None


def normalize_tracking_status(value: Optional[str]) -> str:
    raw = (value or "").strip().lower()
    if not raw:
        return "ordered"
    alias_map = {
        "order_placed": "ordered",
        "payment_confirmed": "ordered",
        "processing": "pending",
        "in_transit": "en_route",
        "out_for_delivery": "en_route",
        "enroute": "en_route",
        "en-route": "en_route",
    }
    return alias_map.get(raw, raw)


ADMIN_ORDER_MUTABLE_STATUSES = {"ordered", "pending", "en_route", "delivered", "cancelled", "failed"}


def normalize_admin_order_status(value: str) -> str:
    status = normalize_tracking_status(value)
    if status not in ADMIN_ORDER_MUTABLE_STATUSES:
        allowed = ", ".join(sorted(ADMIN_ORDER_MUTABLE_STATUSES))
        raise HTTPException(status_code=400, detail=f"Unsupported order status '{status}'. Allowed statuses: {allowed}.")
    return status


def normalize_admin_payment_status(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    raw = value.strip().lower()
    if not raw:
        return None
    alias_map = {
        "success": "paid",
        "successful": "paid",
        "completed": "paid",
        "paid": "paid",
        "pending_user_authorization": "pending",
        "initialized": "pending",
        "processing": "pending",
        "unknown": "unknown",
    }
    return alias_map.get(raw, raw)


def parse_admin_datetime_filter(
    value: Optional[str],
    field_name: str,
    *,
    end_of_day: bool = False,
) -> Optional[datetime]:
    raw = (value or "").strip()
    if not raw:
        return None

    normalized = raw
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", raw):
        normalized = f"{raw}T23:59:59.999999+00:00" if end_of_day else f"{raw}T00:00:00+00:00"
    try:
        dt = datetime.fromisoformat(normalized.replace("Z", "+00:00"))
    except Exception:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} must be an ISO datetime or YYYY-MM-DD date.",
        )
    if not dt.tzinfo:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def parse_admin_activity_timestamp(value: Any) -> datetime:
    raw = str(value or "").strip()
    if not raw:
        return datetime.fromtimestamp(0, tz=timezone.utc)
    try:
        parsed = parse_db_timestamp(raw)
    except Exception:
        return datetime.fromtimestamp(0, tz=timezone.utc)
    if not parsed.tzinfo:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def admin_entity_action_url(entity: str) -> Optional[str]:
    key = (entity or "").strip().lower()
    if key == "order":
        return "/admin/orders"
    if key == "credit_application":
        return "/admin/credit"
    if key == "deal":
        return "/admin/deals"
    if key == "inventory":
        return "/admin/inventory"
    return None


def format_order_status(status: Optional[str]) -> str:
    key = normalize_tracking_status(status)
    if key in ORDER_STATUS_LABELS:
        return ORDER_STATUS_LABELS[key]
    if not key:
        return "Order Placed"
    return key.replace("_", " ").title()


def normalize_yes_no(value: bool) -> int:
    return 1 if bool(value) else 0


def clamp_score(value: float) -> float:
    return round(max(0.0, min(100.0, float(value))), 2)


def parse_csv_floats(value: str) -> list[float]:
    if not value.strip():
        return []
    numbers: list[float] = []
    for chunk in value.split(","):
        piece = chunk.strip()
        if not piece:
            continue
        numbers.append(float(piece))
    return numbers


def compute_credit_component_scores(payload: CreditApplicationCreatePayload) -> dict[str, float]:
    crop_map = {"staple": 30, "cash_crop": 40, "vegetable": 20, "other": 10}
    irrigation_map = {"drip": 90, "canal": 70, "none": 30}
    insurance_map = {"crop": 80, "livestock": 80, "both": 90, "none": 30}

    staple_keywords = {"maize", "corn", "rice", "sorghum", "millet", "cassava", "yam", "wheat"}
    cash_crop_keywords = {"cocoa", "coffee", "cotton", "cashew", "oil_palm", "sugarcane", "tobacco"}
    vegetable_keywords = {"tomato", "onion", "pepper", "okra", "cabbage", "lettuce", "carrot", "cucumber"}

    raw_crop_tokens = [chunk.strip().lower().replace("-", "_").replace(" ", "_") for chunk in str(payload.crop_types or "").split(",")]
    crop_scores: list[float] = []
    for token in raw_crop_tokens:
        if not token:
            continue
        if token in crop_map:
            crop_scores.append(float(crop_map[token]))
            continue
        plain = token.replace("_", " ")
        if token in staple_keywords or plain in staple_keywords:
            crop_scores.append(float(crop_map["staple"]))
        elif token in cash_crop_keywords or plain in cash_crop_keywords:
            crop_scores.append(float(crop_map["cash_crop"]))
        elif token in vegetable_keywords or plain in vegetable_keywords:
            crop_scores.append(float(crop_map["vegetable"]))
        else:
            crop_scores.append(float(crop_map["other"]))
    crop_score = sum(crop_scores) / len(crop_scores) if crop_scores else float(crop_map["other"])

    # Mobile money score balances account savings and transaction regularity.
    mobile_savings_component = min((payload.savings / 1000.0) * 50.0, 50.0)
    mobile_frequency_component = min(float(payload.payment_frequency) * 5.0, 50.0)

    # Scoring logic for soil health observation
    soil_obs = (payload.soil_health_observation or "").strip().lower()
    soil_score = payload.soil_health_index
    if soil_obs == "rich": soil_score = max(soil_score, 85.0)
    elif soil_obs == "sandy": soil_score = min(soil_score, 45.0)
    elif soil_obs == "rocky": soil_score = min(soil_score, 30.0)

    # Loan repayment history boost if verified by referee
    loan_score = payload.repayment_rate
    if payload.has_loan_history and payload.loan_referee_name and payload.loan_referee_phone:
        loan_score = min(loan_score + 15.0, 100.0)

    # Seasonal yield score logic
    yield_vals = parse_csv_floats(payload.yield_data)
    avg_yield_raw = sum(yield_vals) / len(yield_vals) if yield_vals else 50.0
    # Normalize yield based on unit if precise
    if payload.yield_precise and payload.yield_unit:
        # Simple heuristic: tonnes are better than bags
        unit_multiplier = {"tonnes": 1.2, "kgs": 1.0, "bags": 0.8, "sacks": 0.7}.get(payload.yield_unit.lower(), 1.0)
        yield_score = min(avg_yield_raw * unit_multiplier, 100.0)
    else:
        yield_score = avg_yield_raw

    components = {
        "farm_location_risk_score": 100.0 - payload.drought_flood_index,
        "gender_score": 75.0 if payload.gender.strip().lower() in {"female", "other", "non_binary", "non-binary"} else 50.0,
        "mobile_money_score": mobile_savings_component + mobile_frequency_component,
        "crop_type_score": crop_score,
        "association_score": 75.0 if payload.is_association_member else 25.0,
        "motorbike_score": 75.0 if payload.has_motorbike else 25.0,
        "farm_size_score": min((payload.acres * 10.0), 80.0) + (20.0 if payload.satellite_verified else 0.0),
        "loan_repayment_score": loan_score,
        "seasonal_yield_score": yield_score,
        "peer_endorsement_score": payload.endorsements * 10.0 + (10.0 if payload.referee_1_name and payload.referee_2_name else 0),
        "irrigation_type_score": float(irrigation_map.get(payload.has_irrigation.strip().lower(), 30.0)),
        "irrigation_scheme_score": 80.0 if payload.irrigation_scheme else 30.0,
        "market_access_score": payload.market_access_index,
        "training_score": payload.training_sessions * 20.0,
        "livestock_score": (payload.livestock_value / 100.0) * 50.0,
        "alternative_income_score": (payload.alternative_income / 50.0) * 50.0,
        "insurance_type_score": float(insurance_map.get(payload.has_insurance.strip().lower(), 30.0)),
        "insurance_subscription_score": 80.0 if payload.insurance_subscription else 30.0,
        "digital_footprint_score": payload.digital_score,
        "soil_health_score": soil_score,
    }
    return {key: clamp_score(value) for key, value in components.items()}


def credit_scoring_weights() -> dict[str, float]:
    # Gender weight kept at 0.12 as requested for inclusivity emphasis.
    return {
        "farm_location_risk_score": 0.05,
        "gender_score": 0.12,
        "mobile_money_score": 0.07,
        "crop_type_score": 0.04,
        "association_score": 0.04,
        "motorbike_score": 0.03,
        "farm_size_score": 0.06,
        "loan_repayment_score": 0.11,
        "seasonal_yield_score": 0.07,
        "peer_endorsement_score": 0.04,
        "irrigation_type_score": 0.04,
        "irrigation_scheme_score": 0.04,
        "market_access_score": 0.05,
        "training_score": 0.03,
        "livestock_score": 0.03,
        "alternative_income_score": 0.03,
        "insurance_type_score": 0.03,
        "insurance_subscription_score": 0.03,
        "digital_footprint_score": 0.03,
        "soil_health_score": 0.06,
    }


def compute_credit_score_result(payload: CreditApplicationCreatePayload) -> dict[str, Any]:
    component_scores = compute_credit_component_scores(payload)
    weights = credit_scoring_weights()
    weighted_scores = {key: round(component_scores.get(key, 0.0) * weight, 4) for key, weight in weights.items()}
    final_score = round(sum(weighted_scores.values()), 2)
    creditworthiness = get_creditworthiness_label(final_score)
    suggested_credit_limit = compute_credit_limit(final_score, creditworthiness)
    return {
        "final_score": final_score,
        "creditworthiness": creditworthiness,
        "suggested_credit_limit": suggested_credit_limit,
        "component_scores": component_scores,
        "weights": weights,
        "weighted_scores": weighted_scores,
    }


def sanitize_filename(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", name).strip("._")
    return cleaned or f"document_{uuid4().hex}.bin"


def ensure_credit_upload_dir(application_id: str) -> str:
    app_dir = os.path.join(CREDIT_DOC_UPLOAD_DIR, application_id)
    os.makedirs(app_dir, exist_ok=True)
    return app_dir


def verify_user_owns_credit_application(sb: Client, application_id: str, user_id: str) -> dict[str, Any]:
    res = (
        sb.table("credit_applications")
        .select("*")
        .eq("id", application_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Credit application not found for this user.")
    return res.data[0]


def get_credit_account(sb: Client, user_id: str) -> Optional[dict[str, Any]]:
    try:
        res = sb.table("credit_accounts").select("*").eq("user_id", user_id).limit(1).execute()
        return res.data[0] if res.data else None
    except Exception:
        return None


def to_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def to_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        try:
            return int(float(value))
        except (TypeError, ValueError):
            return default


def normalize_credit_application_status(status: Optional[str]) -> str:
    raw = (status or "").strip().lower()
    return raw if raw in CREDIT_APPLICATION_USER_STATUSES else "submitted"


def normalize_admin_credit_status_filter(value: Optional[str]) -> Optional[str]:
    cleaned = (value or "").strip().lower()
    if not cleaned:
        return None
    aliases = {
        "pending": "submitted",
        "submitted": "submitted",
        "under_review": "under_review",
        "review": "under_review",
        "pending_docs": "pending_documents",
        "pending_documents": "pending_documents",
        "approved": "approved",
        "rejected": "rejected",
    }
    resolved = aliases.get(cleaned, cleaned)
    if resolved not in CREDIT_APPLICATION_USER_STATUSES:
        allowed = ", ".join(sorted(CREDIT_APPLICATION_USER_STATUSES))
        raise HTTPException(status_code=400, detail=f"Invalid status filter. Allowed values: {allowed}.")
    return resolved


def build_admin_credit_application_response(
    application: dict[str, Any],
    *,
    account: Optional[dict[str, Any]] = None,
    documents_count: int = 0,
) -> dict[str, Any]:
    payload = parse_json_object(application.get("application_payload"))
    full_name = str(payload.get("full_name") or "").strip()
    region = str(payload.get("region") or "").strip()
    district = str(payload.get("district") or "").strip()
    town = str(payload.get("town") or "").strip()
    location = ", ".join([part for part in [town, district, region] if part])
    user_id = str(application.get("user_id") or "").strip()
    account_snapshot = normalize_credit_account_snapshot(account)
    status = normalize_credit_application_status(application.get("status"))
    return {
        "id": str(application.get("id") or ""),
        "user_id": user_id,
        "farmer_id": application.get("farmer_id"),
        "full_name": full_name or user_id or "Unknown User",
        "location": location or None,
        "status": status,
        "submitted_at": application.get("submitted_at") or application.get("created_at"),
        "updated_at": application.get("updated_at"),
        "reviewed_at": application.get("reviewed_at"),
        "reviewer": application.get("reviewer"),
        "review_note": application.get("review_note"),
        "final_score": round(to_float(application.get("final_score")), 2),
        "creditworthiness": application.get("creditworthiness"),
        "suggested_credit_limit": round(to_float(application.get("suggested_credit_limit")), 2),
        "approved_credit_limit": round(to_float(application.get("approved_credit_limit")), 2),
        "documents_count": int(max(documents_count, 0)),
        "account_status": account_snapshot.get("status"),
        "account_available_credit": round(to_float(account_snapshot.get("available_credit")), 2),
        "account_assigned_credit_limit": round(to_float(account_snapshot.get("assigned_credit_limit")), 2),
        "application_payload": payload,
    }


def compute_admin_credit_summary(applications: list[dict[str, Any]]) -> dict[str, Any]:
    status_counts = {
        "submitted": 0,
        "under_review": 0,
        "pending_documents": 0,
        "approved": 0,
        "rejected": 0,
    }
    score_total = 0.0
    score_count = 0
    approved_today = 0
    today = now_utc().date()

    for row in applications:
        status = normalize_credit_application_status(row.get("status"))
        if status in status_counts:
            status_counts[status] += 1
        score = to_float(row.get("final_score"), -1)
        if score >= 0:
            score_total += score
            score_count += 1

        if status == "approved":
            reviewed_at_raw = row.get("reviewed_at") or row.get("updated_at") or row.get("created_at")
            if reviewed_at_raw:
                try:
                    if parse_db_timestamp(str(reviewed_at_raw)).date() == today:
                        approved_today += 1
                except Exception:
                    pass

    pending_review = status_counts["submitted"] + status_counts["under_review"] + status_counts["pending_documents"]
    avg_score = round(score_total / score_count, 2) if score_count > 0 else 0.0
    return {
        "total": len(applications),
        "pending_review": pending_review,
        "approved_today": approved_today,
        "avg_score": avg_score,
        "status_breakdown": status_counts,
    }


def supports_credit_application_tables(sb: Client) -> bool:
    try:
        sb.table("credit_applications").select("id").limit(1).execute()
        return True
    except Exception as exc:
        return "public.credit_applications" not in str(exc)


def supports_aggregate_deals_tables(sb: Client) -> bool:
    try:
        sb.table("aggregate_deals").select("id").limit(1).execute()
        return True
    except Exception as exc:
        return "public.aggregate_deals" not in str(exc)


def supports_table(sb: Client, table_name: str) -> bool:
    if TABLE_SUPPORT_CACHE_TTL_SECONDS > 0:
        with table_support_cache_lock:
            cached = table_support_cache.get(table_name)
            if cached and now_utc() < cached[1]:
                return cached[0]

    try:
        sb.table(table_name).select("*").limit(1).execute()
        exists = True
    except Exception as exc:
        exists = f"public.{table_name}" not in str(exc)

    if TABLE_SUPPORT_CACHE_TTL_SECONDS > 0:
        with table_support_cache_lock:
            table_support_cache[table_name] = (
                exists,
                now_utc() + timedelta(seconds=TABLE_SUPPORT_CACHE_TTL_SECONDS),
            )
    return exists


def fetch_table_rows(
    sb: Client,
    table_name: str,
    columns: str,
    *,
    limit: int = 5000,
    order_by: Optional[str] = None,
    desc: bool = False,
) -> list[dict[str, Any]]:
    query = sb.table(table_name).select(columns)
    if order_by:
        query = query.order(order_by, desc=desc)
    if limit > 0:
        query = query.limit(limit)
    res = query.execute()
    return res.data or []


def parse_json_object(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return dict(value)
    if isinstance(value, str):
        raw = value.strip()
        if not raw:
            return {}
        try:
            parsed = json.loads(raw)
        except Exception:
            return {}
        if isinstance(parsed, dict):
            return parsed
    return {}


def build_catalog_snapshot(item: dict[str, Any]) -> dict[str, Any]:
    item_type = str(item.get("type") or "SEED").strip().upper()
    if item_type not in {"SEED", "FERTILIZER"}:
        item_type = "SEED"
    return {
        "id": str(item.get("id") or "").strip(),
        "name": str(item.get("name") or "").strip(),
        "type": item_type,
        "price": round(to_float(item.get("price")), 2),
        "location": item.get("location"),
        "imageUrl": item.get("imageUrl") or item.get("image_url"),
        "size": item.get("size"),
        "weight": item.get("weight"),
        "brand": item.get("brand") or "Grow For Me",
    }


def reserve_inventory_for_bulk_deal(sb: Client, source_item_id: str, reserve_quantity: int) -> dict[str, Any]:
    safe_item_id = source_item_id.strip()
    if not safe_item_id:
        raise HTTPException(status_code=400, detail="source_inventory_item_id is required for inventory conversion.")
    if reserve_quantity < 1:
        raise HTTPException(status_code=400, detail="reserve_inventory_quantity must be at least 1.")

    source_res = sb.table("catalog").select("*").eq("id", safe_item_id).limit(1).execute()
    if not source_res.data:
        raise HTTPException(status_code=404, detail="Source inventory item not found.")
    source_item = source_res.data[0]
    current_stock = max(to_int(source_item.get("stock")), 0)
    if current_stock < reserve_quantity:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot reserve {reserve_quantity} units from inventory. Only {current_stock} units are available.",
        )

    remaining_stock = current_stock - reserve_quantity
    if remaining_stock > 0:
        sb.table("catalog").update({"stock": remaining_stock}).eq("id", safe_item_id).execute()
    else:
        sb.table("catalog").update({"stock": 0, "is_archived": True}).eq("id", safe_item_id).execute()

    snapshot = build_catalog_snapshot(source_item)
    return {
        "source_item_id": safe_item_id,
        "reserved_quantity": reserve_quantity,
        "snapshot": snapshot,
        "metadata": {
            "source_inventory_item_id": safe_item_id,
            "inventory_reserved_quantity": reserve_quantity,
            "inventory_returned_quantity": 0,
            "source_inventory_snapshot": snapshot,
        },
    }


def rollback_inventory_reservation(sb: Client, reservation: dict[str, Any]):
    safe_item_id = str(reservation.get("source_item_id") or "").strip()
    reserved_quantity = max(to_int(reservation.get("reserved_quantity")), 0)
    if not safe_item_id or reserved_quantity <= 0:
        return

    if existing_res.data:
        current_stock = max(to_int(existing_res.data[0].get("stock")), 0)
        sb.table("catalog").update({"stock": current_stock + reserved_quantity, "is_archived": False}).eq("id", safe_item_id).execute()
        return

    snapshot = reservation.get("snapshot")
    source_snapshot = snapshot if isinstance(snapshot, dict) else {}
    item_type = str(source_snapshot.get("type") or "SEED").strip().upper()
    if item_type not in {"SEED", "FERTILIZER"}:
        item_type = "SEED"

    row = {
        "id": safe_item_id,
        "name": str(source_snapshot.get("name") or safe_item_id).strip() or safe_item_id,
        "type": item_type,
        "price": round(to_float(source_snapshot.get("price")), 2),
        "stock": reserved_quantity,
        "location": source_snapshot.get("location"),
        "imageUrl": source_snapshot.get("imageUrl"),
        "size": source_snapshot.get("size"),
        "weight": source_snapshot.get("weight"),
        "brand": source_snapshot.get("brand") or "Grow For Me",
        "is_archived": False,
    }
    sb.table("catalog").insert(row).execute()


def restock_unsold_bulk_inventory(sb: Client, deal_row: dict[str, Any], next_status: str) -> tuple[int, dict[str, Any]]:
    deal_type = str(deal_row.get("deal_type") or "bulk").strip().lower()
    metadata = parse_json_object(deal_row.get("metadata"))
    if deal_type != "bulk":
        return 0, metadata

    source_item_id = str(metadata.get("source_inventory_item_id") or "").strip()
    reserved_quantity = max(to_int(metadata.get("inventory_reserved_quantity")), 0)
    returned_quantity = max(to_int(metadata.get("inventory_returned_quantity")), 0)
    if not source_item_id or reserved_quantity <= 0:
        return 0, metadata

    sold_quantity = max(to_int(deal_row.get("current_quantity")), 0)
    restock_quantity = max(reserved_quantity - sold_quantity - returned_quantity, 0)
    if restock_quantity <= 0:
        return 0, metadata

    existing_res = sb.table("catalog").select("id, stock").eq("id", source_item_id).limit(1).execute()
    if existing_res.data:
        current_stock = max(to_int(existing_res.data[0].get("stock")), 0)
        sb.table("catalog").update({"stock": current_stock + restock_quantity, "is_archived": False}).eq("id", source_item_id).execute()
    else:
        snapshot = metadata.get("source_inventory_snapshot")
        source_snapshot = snapshot if isinstance(snapshot, dict) else {}
        item_type = str(source_snapshot.get("type") or "SEED").strip().upper()
        if item_type not in {"SEED", "FERTILIZER"}:
            item_type = "SEED"
        row = {
            "id": source_item_id,
            "name": str(source_snapshot.get("name") or deal_row.get("item_name") or source_item_id).strip() or source_item_id,
            "type": item_type,
            "price": round(to_float(source_snapshot.get("price"), to_float(deal_row.get("base_price"))), 2),
            "stock": restock_quantity,
            "location": source_snapshot.get("location"),
            "imageUrl": source_snapshot.get("imageUrl"),
            "size": source_snapshot.get("size"),
            "weight": source_snapshot.get("weight"),
            "brand": source_snapshot.get("brand") or "Grow For Me",
            "is_archived": False,
        }
        sb.table("catalog").insert(row).execute()

    metadata["inventory_returned_quantity"] = returned_quantity + restock_quantity
    metadata["inventory_last_restock_at"] = now_utc().isoformat()
    metadata["inventory_last_restock_reason"] = f"deal_status:{next_status}"
    return restock_quantity, metadata


def decorate_aggregate_deal(row: dict[str, Any]) -> dict[str, Any]:
    deal_type = str(row.get("deal_type") or "bulk").strip().lower()
    base_price = round(to_float(row.get("base_price")), 2)
    deal_price = round(to_float(row.get("deal_price"), base_price), 2)
    discount_percent = round(to_float(row.get("discount_percent")), 2)
    target_quantity = int(row.get("target_quantity") or 0)
    current_quantity = int(row.get("current_quantity") or 0)
    starting_bid = round(to_float(row.get("starting_bid")), 2)
    highest_bid = round(to_float(row.get("highest_bid")), 2)
    now = now_utc()

    progress_percent = 0.0
    if deal_type == "bulk" and target_quantity > 0:
        progress_percent = round(min((current_quantity / max(target_quantity, 1)) * 100.0, 100.0), 2)

    end_at_iso = row.get("end_at")
    is_expired = False
    if end_at_iso:
        try:
            is_expired = now > parse_db_timestamp(str(end_at_iso))
        except Exception:
            is_expired = False

    current_display_price = deal_price
    if deal_type == "auction":
        current_display_price = highest_bid if highest_bid > 0 else max(starting_bid, base_price)

    remaining_quantity: Optional[int] = None
    if deal_type == "bulk" and target_quantity > 0:
        remaining_quantity = max(target_quantity - current_quantity, 0)

    max_join_raw = row.get("max_join_quantity")
    max_join_quantity = int(max_join_raw) if max_join_raw is not None else None
    effective_max_join_quantity = max_join_quantity
    if remaining_quantity is not None:
        effective_max_join_quantity = min(remaining_quantity, max_join_quantity) if max_join_quantity is not None else remaining_quantity

    return {
        **row,
        "deal_type": deal_type,
        "status": str(row.get("status") or "active").strip().lower(),
        "base_price": base_price,
        "deal_price": deal_price,
        "discount_percent": discount_percent,
        "starting_bid": starting_bid,
        "highest_bid": highest_bid,
        "target_quantity": target_quantity if target_quantity > 0 else None,
        "current_quantity": current_quantity,
        "progress_percent": progress_percent,
        "remaining_quantity": remaining_quantity,
        "effective_max_join_quantity": effective_max_join_quantity,
        "is_full": bool(remaining_quantity == 0) if remaining_quantity is not None else False,
        "current_display_price": round(current_display_price, 2),
        "is_expired": is_expired,
    }


def extract_bulk_intent_metadata(intent: dict[str, Any]) -> Optional[dict[str, Any]]:
    payload = intent.get("provider_payload")
    if not isinstance(payload, dict):
        return None
    if str(payload.get("flow") or "").strip().lower() != "aggregate_bulk":
        return None
    deal_id = str(payload.get("deal_id") or "").strip()
    if not deal_id:
        return None
    quantity = int(payload.get("quantity") or 0)
    if quantity <= 0:
        return None
    return {"deal_id": deal_id, "quantity": quantity}


def get_bulk_intent_expiry(intent: dict[str, Any]) -> datetime:
    payload = intent.get("provider_payload")
    if isinstance(payload, dict):
        expires_raw = str(payload.get("expires_at") or "").strip()
        if expires_raw:
            try:
                return parse_db_timestamp(expires_raw)
            except Exception:
                pass

    created_at_raw = str(intent.get("created_at") or "").strip()
    if created_at_raw:
        try:
            return parse_db_timestamp(created_at_raw) + timedelta(minutes=BULK_PAYMENT_HOLD_MINUTES)
        except Exception:
            pass
    return now_utc() + timedelta(minutes=BULK_PAYMENT_HOLD_MINUTES)


def find_active_bulk_intent_for_user_deal(
    sb: Client,
    user_id: str,
    deal_id: str,
) -> Optional[dict[str, Any]]:
    intents = (
        sb.table("payment_intents")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(80)
        .execute()
        .data
        or []
    )
    now = now_utc()
    for intent in intents:
        metadata = extract_bulk_intent_metadata(intent)
        if not metadata or metadata["deal_id"] != deal_id:
            continue
        if intent.get("order_id"):
            continue
        status = str(intent.get("status") or "").strip().lower()
        if status in BULK_INTENT_TERMINAL_STATUSES:
            continue
        expires_at = get_bulk_intent_expiry(intent)
        if now >= expires_at:
            try:
                update_payment_intent(
                    sb,
                    str(intent.get("reference") or ""),
                    {"status": "expired", "provider_status": "expired"},
                )
            except Exception:
                pass
            continue
        return {
            **intent,
            "bulk_deal_id": metadata["deal_id"],
            "bulk_quantity": metadata["quantity"],
            "bulk_expires_at": expires_at.isoformat(),
        }
    return None


def attach_user_bulk_deal_state(sb: Client, deals: list[dict[str, Any]], user_id: str):
    cleaned_user = user_id.strip()
    if not cleaned_user or not deals:
        return

    deal_ids = [str(deal.get("id") or "").strip() for deal in deals if str(deal.get("id") or "").strip()]
    if not deal_ids:
        return

    paid_by_deal: dict[str, int] = {deal_id: 0 for deal_id in deal_ids}
    pending_by_deal: dict[str, dict[str, Any]] = {}

    try:
        participant_rows = (
            sb.table("aggregate_deal_participants")
            .select("deal_id, quantity")
            .eq("user_id", cleaned_user)
            .eq("join_type", "bulk_join")
            .in_("deal_id", deal_ids)
            .execute()
            .data
            or []
        )
        for row in participant_rows:
            key = str(row.get("deal_id") or "").strip()
            if not key:
                continue
            paid_by_deal[key] = paid_by_deal.get(key, 0) + int(row.get("quantity") or 0)
    except Exception as exc:
        logger.warning(f"Could not fetch user bulk participation state: {exc}")

    try:
        intents = (
            sb.table("payment_intents")
            .select("*")
            .eq("user_id", cleaned_user)
            .order("created_at", desc=True)
            .limit(120)
            .execute()
            .data
            or []
        )
        now = now_utc()
        for intent in intents:
            metadata = extract_bulk_intent_metadata(intent)
            if not metadata:
                continue
            deal_id = metadata["deal_id"]
            if deal_id not in paid_by_deal or paid_by_deal.get(deal_id, 0) > 0:
                continue
            if intent.get("order_id"):
                continue
            status = str(intent.get("status") or "").strip().lower()
            if status in BULK_INTENT_TERMINAL_STATUSES:
                continue
            expires_at = get_bulk_intent_expiry(intent)
            if now >= expires_at:
                try:
                    update_payment_intent(
                        sb,
                        str(intent.get("reference") or ""),
                        {"status": "expired", "provider_status": "expired"},
                    )
                except Exception:
                    pass
                continue
            if deal_id in pending_by_deal:
                continue
            pending_by_deal[deal_id] = {
                "reference": str(intent.get("reference") or ""),
                "quantity": metadata["quantity"],
                "expires_at": expires_at.isoformat(),
                "authorization_url": intent.get("provider_authorization_url"),
            }
    except Exception as exc:
        logger.warning(f"Could not fetch user pending bulk payments: {exc}")

    for deal in deals:
        deal_id = str(deal.get("id") or "").strip()
        paid_quantity = int(paid_by_deal.get(deal_id, 0))
        pending = pending_by_deal.get(deal_id)
        if paid_quantity > 0:
            deal["user_bulk_state"] = "paid"
            deal["user_paid_quantity"] = paid_quantity
        elif pending:
            deal["user_bulk_state"] = "pending"
            deal["user_paid_quantity"] = 0
            deal["user_pending_reference"] = pending["reference"]
            deal["user_pending_quantity"] = pending["quantity"]
            deal["user_pending_expires_at"] = pending["expires_at"]
            deal["user_pending_authorization_url"] = pending["authorization_url"]
        else:
            deal["user_bulk_state"] = "none"
            deal["user_paid_quantity"] = 0


def normalize_credit_account_snapshot(account: Optional[dict[str, Any]]) -> dict[str, Any]:
    if not account:
        return {
            "status": "not_applied",
            "assigned_credit_limit": 0.0,
            "available_credit": 0.0,
            "consumed_credit": 0.0,
            "last_score": 0.0,
            "creditworthiness": None,
        }

    # Prefer modern columns when present. Legacy fields may exist but be stale.
    has_modern_fields = any(
        field in account for field in ("assigned_credit_limit", "available_credit", "consumed_credit")
    )

    if has_modern_fields:
        assigned = round(to_float(account.get("assigned_credit_limit")), 2)
        available = round(to_float(account.get("available_credit")), 2)
        consumed = round(to_float(account.get("consumed_credit")), 2)
        raw_status = (account.get("status") or "").strip().lower()
        status = raw_status or ("approved" if assigned > 0 else "submitted")
    else:
        assigned = round(to_float(account.get("assigned_limit")), 2)
        consumed = round(to_float(account.get("outstanding_balance")), 2)
        available = round(max(assigned - consumed, 0.0), 2)
        status = "approved" if assigned > 0 else "submitted"

    return {
        "status": status,
        "assigned_credit_limit": assigned,
        "available_credit": available,
        "consumed_credit": consumed,
        "last_score": round(to_float(account.get("last_score")), 2),
        "creditworthiness": account.get("creditworthiness"),
    }


def is_credit_account_spendable(status: Optional[str]) -> bool:
    return (status or "").strip().lower() in CREDIT_ACCOUNT_SPENDABLE_STATUSES


def upsert_credit_account_record(
    sb: Client,
    *,
    user_id: str,
    status: str,
    assigned_credit_limit: float,
    available_credit: float,
    consumed_credit: float,
    last_score: float = 0.0,
    creditworthiness: Optional[str] = None,
    last_application_id: Optional[str] = None,
    reviewer: Optional[str] = None,
    approved_at: Optional[str] = None,
) -> str:
    now_iso = now_utc().isoformat()
    modern_row: dict[str, Any] = {
        "user_id": user_id,
        "status": status,
        "assigned_credit_limit": round(assigned_credit_limit, 2),
        "available_credit": round(available_credit, 2),
        "consumed_credit": round(consumed_credit, 2),
        "last_score": round(last_score, 2),
        "creditworthiness": creditworthiness,
        "last_application_id": last_application_id,
        "reviewer": reviewer,
        "approved_at": approved_at,
        "updated_at": now_iso,
    }
    try:
        sb.table("credit_accounts").upsert(modern_row, on_conflict="user_id").execute()
        return "modern"
    except Exception:
        legacy_row = {
            "user_id": user_id,
            "assigned_limit": round(assigned_credit_limit, 2),
            "outstanding_balance": round(consumed_credit, 2),
            "updated_at": now_iso,
        }
        sb.table("credit_accounts").upsert(legacy_row, on_conflict="user_id").execute()
        return "legacy"


def get_latest_credit_application(sb: Client, user_id: str) -> Optional[dict[str, Any]]:
    try:
        res = (
            sb.table("credit_applications")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        return res.data[0] if res.data else None
    except Exception:
        return None


def fetch_all_auth_user_ids() -> list[str]:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(status_code=500, detail="Supabase service role credentials are not configured.")

    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    }
    page = 1
    per_page = 200
    user_ids: list[str] = []

    while True:
        response = httpx.get(
            f"{SUPABASE_URL.rstrip('/')}/auth/v1/admin/users",
            headers=headers,
            params={"page": page, "per_page": per_page},
            timeout=20.0,
        )
        if response.status_code >= 300:
            raise HTTPException(
                status_code=502,
                detail=f"Could not list auth users from Supabase (status {response.status_code}).",
            )

        body = response.json()
        users = body.get("users") if isinstance(body, dict) else []
        if not isinstance(users, list):
            users = []

        batch_ids = [str(user.get("id")) for user in users if isinstance(user, dict) and user.get("id")]
        user_ids.extend(batch_ids)

        if len(users) < per_page:
            break
        page += 1

    deduped: list[str] = []
    seen: set[str] = set()
    for user_id in user_ids:
        if user_id not in seen:
            deduped.append(user_id)
            seen.add(user_id)
    return deduped


def fetch_all_auth_users() -> list[dict[str, Any]]:
    if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(status_code=500, detail="Supabase service role credentials are not configured.")

    headers = {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    }
    page = 1
    per_page = 200
    users: list[dict[str, Any]] = []

    while True:
        response = httpx.get(
            f"{SUPABASE_URL.rstrip('/')}/auth/v1/admin/users",
            headers=headers,
            params={"page": page, "per_page": per_page},
            timeout=20.0,
        )
        if response.status_code >= 300:
            raise HTTPException(
                status_code=502,
                detail=f"Could not list auth users from Supabase (status {response.status_code}).",
            )

        body = response.json()
        batch = body.get("users") if isinstance(body, dict) else []
        if not isinstance(batch, list):
            batch = []
        users.extend([row for row in batch if isinstance(row, dict) and row.get("id")])

        if len(batch) < per_page:
            break
        page += 1

    deduped: list[dict[str, Any]] = []
    seen: set[str] = set()
    for user in users:
        user_id = str(user.get("id") or "").strip()
        if not user_id or user_id in seen:
            continue
        seen.add(user_id)
        deduped.append(user)
    return deduped


def normalize_operations_credit_status(
    account_snapshot: Optional[dict[str, Any]],
    latest_application_status: Optional[str],
) -> str:
    snapshot = account_snapshot or {}
    if is_credit_account_spendable(snapshot.get("status")):
        return "approved"

    status_hint = normalize_credit_application_status(latest_application_status or snapshot.get("status"))
    if status_hint in {"submitted", "under_review", "pending_documents"}:
        return "submitted"
    if status_hint == "rejected":
        return "rejected"
    return "not_applied"


def normalize_consignment_status(value: Optional[str]) -> str:
    cleaned = str(value or "").strip().lower()
    return cleaned if cleaned in CONSIGNMENT_STATUSES else "pending"


def normalize_consignment_unit(value: Optional[str]) -> str:
    cleaned = str(value or "").strip().lower()
    if not cleaned:
        return "unit"
    aliases = {
        "bag": "bags",
        "bags": "bags",
        "tonne": "tonnes",
        "tonnes": "tonnes",
        "unit": "units",
        "units": "units",
    }
    return aliases.get(cleaned, cleaned)


def build_consignment_item_label(product_name: Optional[str], product_category: Optional[str]) -> str:
    name = str(product_name or "").strip()
    if name:
        return name
    category = str(product_category or "").strip()
    return category.title() if category else "your item"


def build_consignment_submitted_admin_sms(
    consignment_id: str,
    user_label: str,
    quantity: float,
    unit: str,
    product_label: str,
    expected_price: float,
) -> str:
    safe_id = str(consignment_id or "").strip()[:8].upper()
    return (
        "GFM Alert: New consignment request\n"
        f"Listing ID: {safe_id}\n\n"
        f"Farmer: {user_label}\n"
        f"Item: {product_label}\n"
        f"Quantity: {round(to_float(quantity), 2)} {unit}\n"
        f"Expected Price: GH\u20b5{round(to_float(expected_price), 2):.2f}"
    )


def notify_admins_consignment_submitted_sms(
    consignment_id: str,
    user_id: str,
    quantity: float,
    unit: str,
    product_label: str,
    expected_price: float,
) -> dict[str, int]:
    phones = list_admin_alert_phones()
    if not phones:
        logger.info(f"No admin phones configured for consignment SMS alert (consignment={consignment_id}).")
        return {"attempted": 0, "queued": 0, "failed": 0}

    user_label = resolve_user_display_name(user_id)
    sms_message = build_consignment_submitted_admin_sms(
        consignment_id=consignment_id,
        user_label=user_label,
        quantity=quantity,
        unit=unit,
        product_label=product_label,
        expected_price=expected_price,
    )
    attempted = len(phones)
    queued = 0
    failed = 0
    for phone in phones:
        try:
            dispatch_sms_message(phone, sms_message, log_tag="ADMIN_CONSIGNMENT_DEV_ONLY")
            queued += 1
        except Exception as exc:
            failed += 1
            logger.error(f"Could not dispatch admin consignment SMS to {phone} for consignment {consignment_id}: {exc}")
    return {"attempted": attempted, "queued": queued, "failed": failed}


def build_consignment_status_user_sms(
    consignment_id: str,
    status: str,
    product_label: str,
    reason: Optional[str] = None,
) -> str:
    safe_id = str(consignment_id or "").strip()[:8].upper()
    normalized_status = normalize_consignment_status(status)
    lines = [
        "GrowForMe Consignment Update",
        f"Listing ID: {safe_id}",
        "",
        f"Item: {product_label}",
        f"Status: {normalized_status.title()}",
    ]
    clean_reason = re.sub(r"\s+", " ", (reason or "").strip())
    if clean_reason:
        if len(clean_reason) > 90:
            clean_reason = f"{clean_reason[:87]}..."
        lines.append(f"Reason: {clean_reason}")
    lines.append("")
    lines.append("Open the app to view details.")
    return "\n".join(lines)


def notify_user_consignment_status_sms(
    sb: Client,
    user_id: str,
    consignment_id: str,
    status: str,
    product_label: str,
    reason: Optional[str] = None,
) -> dict[str, Any]:
    customer_phone = resolve_user_phone_for_notifications(sb, user_id)
    if not customer_phone:
        return {"sent": False, "reason": "phone_not_found", "phone_masked": None}

    phone_masked = mask_phone(customer_phone)
    sms_message = build_consignment_status_user_sms(
        consignment_id=consignment_id,
        status=status,
        product_label=product_label,
        reason=reason,
    )
    try:
        dispatch_sms_message(customer_phone, sms_message, log_tag="CONSIGNMENT_STATUS_USER_ALERT")
        return {"sent": True, "reason": "queued" if OTP_SMS_ASYNC else "sent", "phone_masked": phone_masked}
    except Exception as exc:
        return {"sent": False, "reason": f"sms_send_failed: {exc}", "phone_masked": phone_masked}


def build_admin_consignment_response(
    row: dict[str, Any],
    *,
    farmer_name: Optional[str] = None,
    farmer_phone: Optional[str] = None,
) -> dict[str, Any]:
    user_id = str(row.get("user_id") or "").strip()
    status = normalize_consignment_status(row.get("status"))
    return {
        "id": str(row.get("id") or ""),
        "user_id": user_id,
        "farmer_name": farmer_name or "Farmer",
        "farmer_phone": farmer_phone,
        "product_category": str(row.get("product_category") or "").strip() or "other",
        "product_name": str(row.get("product_name") or "").strip() or None,
        "quantity": round(to_float(row.get("quantity")), 2),
        "unit": normalize_consignment_unit(row.get("unit")),
        "expected_price": round(to_float(row.get("expected_price")), 2),
        "status": status,
        "rejection_reason": str(row.get("rejection_reason") or "").strip() or None,
        "approved_deal_id": str(row.get("approved_deal_id") or "").strip() or None,
        "created_at": row.get("created_at"),
        "reviewed_at": row.get("reviewed_at"),
    }


def upsert_auto_approved_credit_for_user(
    sb: Client,
    user_id: str,
    approved_credit_limit: float,
    final_score: float,
    reviewer: str,
    review_note: Optional[str],
) -> tuple[str, str]:
    now_iso = now_utc().isoformat()
    final_score = round(final_score, 2)
    approved_credit_limit = round(approved_credit_limit, 2)
    creditworthiness = get_creditworthiness_label(final_score)
    review_note_value = (review_note or "Bulk approval applied to existing user accounts.").strip()
    has_application_tables = supports_credit_application_tables(sb)
    application_id = ""
    action = "updated"

    if has_application_tables:
        latest_application = get_latest_credit_application(sb, user_id)
        if latest_application:
            application_id = str(latest_application["id"])
            sb.table("credit_applications").update(
                {
                    "status": "approved",
                    "final_score": final_score,
                    "creditworthiness": creditworthiness,
                    "suggested_credit_limit": approved_credit_limit,
                    "approved_credit_limit": approved_credit_limit,
                    "reviewer": reviewer,
                    "review_note": review_note_value,
                    "reviewed_at": now_iso,
                    "updated_at": now_iso,
                }
            ).eq("id", application_id).execute()
        else:
            row = {
                "user_id": user_id,
                "consent_credit_assessment": True,
                "application_payload": {},
                "component_scores": {},
                "weighted_scores": {},
                "weights": {},
                "final_score": final_score,
                "creditworthiness": creditworthiness,
                "suggested_credit_limit": approved_credit_limit,
                "approved_credit_limit": approved_credit_limit,
                "status": "approved",
                "reviewer": reviewer,
                "review_note": review_note_value,
                "submitted_at": now_iso,
                "reviewed_at": now_iso,
                "updated_at": now_iso,
            }
            inserted = sb.table("credit_applications").insert(row).execute().data or []
            if not inserted:
                raise HTTPException(status_code=500, detail=f"Could not create credit application for user {user_id}.")
            application_id = str(inserted[0]["id"])
            action = "created"

    upsert_credit_account_record(
        sb,
        user_id=user_id,
        status="approved",
        assigned_credit_limit=approved_credit_limit,
        available_credit=approved_credit_limit,
        consumed_credit=0.0,
        last_score=final_score,
        creditworthiness=creditworthiness,
        last_application_id=application_id or None,
        reviewer=reviewer,
        approved_at=now_iso,
    )

    if has_application_tables and application_id:
        sb.table("credit_application_events").insert(
            {
                "application_id": application_id,
                "user_id": user_id,
                "event_type": "bulk_approved",
                "note": "Bulk approval applied for existing user.",
                "metadata": {
                    "approved_credit_limit": approved_credit_limit,
                    "final_score": final_score,
                    "reviewer": reviewer,
                    "review_note": review_note_value,
                },
                "event_time": now_iso,
            }
        ).execute()
    return action, application_id


def write_order_tracking_records(
    sb: Client,
    order_id: str,
    user_id: str,
    total_amount: float,
    credit_applied: float,
    cash_component: float,
    delivery_address: Optional[str] = None,
    payment_provider: str = "credit",
    payment_reference: Optional[str] = None,
    payment_status: str = "paid",
):
    now_iso = now_utc().isoformat()
    estimated_delivery = (now_utc() + timedelta(days=DEFAULT_DELIVERY_WINDOW_DAYS_RUNTIME)).isoformat()
    tracking_row = {
        "order_id": order_id,
        "user_id": user_id,
        "status": "ordered",
        "status_label": format_order_status("ordered"),
        "delivery_address": delivery_address,
        "payment_provider": payment_provider,
        "payment_reference": payment_reference,
        "payment_status": payment_status,
        "total_amount": total_amount,
        "credit_applied": credit_applied,
        "cash_component": cash_component,
        "estimated_delivery_at": estimated_delivery,
        "updated_at": now_iso,
    }

    sb.table("order_tracking").upsert(tracking_row, on_conflict="order_id").execute()

    events = [
        {
            "order_id": order_id,
            "user_id": user_id,
            "event_type": "ordered",
            "status": "ordered",
            "note": "Order placed successfully.",
            "event_time": now_iso,
        },
        {
            "order_id": order_id,
            "user_id": user_id,
            "event_type": "payment_confirmed",
            "status": "ordered",
            "note": f"Payment confirmed via {payment_provider}.",
            "event_time": now_iso,
        },
    ]
    sb.table("order_tracking_events").insert(events).execute()


def verify_user_owns_order(sb: Client, order_id: str, user_id: str) -> dict[str, Any]:
    order_res = sb.table("orders").select("*").eq("id", order_id).eq("user_id", user_id).limit(1).execute()
    if not order_res.data:
        try:
            numeric_order_id = int(order_id)
            order_res = sb.table("orders").select("*").eq("id", numeric_order_id).eq("user_id", user_id).limit(1).execute()
        except ValueError:
            pass
    if not order_res.data:
        raise HTTPException(status_code=404, detail="Order not found for this user.")
    return order_res.data[0]


def fetch_order_by_id(sb: Client, order_id: str) -> dict[str, Any]:
    order_res = sb.table("orders").select("*").eq("id", order_id).limit(1).execute()
    if not order_res.data:
        try:
            numeric_order_id = int(order_id)
            order_res = sb.table("orders").select("*").eq("id", numeric_order_id).limit(1).execute()
        except ValueError:
            pass
    if not order_res.data:
        raise HTTPException(status_code=404, detail="Order not found.")
    return order_res.data[0]


def build_admin_order_response(
    order: dict[str, Any],
    tracking: Optional[dict[str, Any]] = None,
    latest_event: Optional[dict[str, Any]] = None,
    payment_intent: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    tracking_row = tracking or {}
    latest = latest_event or {}
    intent = payment_intent or {}

    order_id = str(order.get("id") or "")
    user_id = str(order.get("user_id") or "")
    items = order.get("items") if isinstance(order.get("items"), list) else []
    total_quantity = 0
    for item in items:
        if isinstance(item, dict):
            total_quantity += max(to_int(item.get("quantity")), 0)

    status = normalize_tracking_status(str(tracking_row.get("status") or "ordered"))
    status_label = str(tracking_row.get("status_label") or format_order_status(status))
    payment_status = normalize_admin_payment_status(str(tracking_row.get("payment_status") or "")) or normalize_admin_payment_status(
        str(intent.get("provider_status") or "")
    ) or normalize_admin_payment_status(str(intent.get("status") or "")) or "unknown"
    payment_provider = (
        str(tracking_row.get("payment_provider") or "").strip()
        or str(intent.get("provider") or "").strip()
        or "unknown"
    )
    payment_reference = (
        str(tracking_row.get("payment_reference") or "").strip()
        or str(intent.get("reference") or "").strip()
        or None
    )

    return {
        "order_id": order_id,
        "user_id": user_id,
        "created_at": order.get("created_at"),
        "total_amount": round(to_float(order.get("total_amount")), 2),
        "item_count": len(items),
        "total_quantity": total_quantity,
        "items": items,
        "status": status,
        "status_label": status_label,
        "payment_status": payment_status,
        "payment_provider": payment_provider,
        "payment_reference": payment_reference,
        "credit_applied": round(to_float(tracking_row.get("credit_applied"), to_float(intent.get("credit_applied"))), 2),
        "cash_component": round(to_float(tracking_row.get("cash_component"), to_float(intent.get("cash_component"))), 2),
        "delivery_address": tracking_row.get("delivery_address") or intent.get("address"),
        "estimated_delivery_at": tracking_row.get("estimated_delivery_at"),
        "updated_at": tracking_row.get("updated_at") or intent.get("updated_at"),
        "last_update": latest.get("note"),
        "last_update_time": latest.get("event_time"),
        "last_event_type": latest.get("event_type"),
    }


def extract_order_restock_items(order: dict[str, Any]) -> list[tuple[str, int]]:
    raw_items = order.get("items")
    if not isinstance(raw_items, list):
        return []

    parsed_items: list[tuple[str, int]] = []
    for raw_item in raw_items:
        if not isinstance(raw_item, dict):
            continue
        item_id = str(
            raw_item.get("id")
            or raw_item.get("item_id")
            or raw_item.get("product_id")
            or ""
        ).strip()
        quantity = max(to_int(raw_item.get("quantity")), 0)
        if not item_id or quantity <= 0:
            continue
        parsed_items.append((item_id, quantity))
    return parsed_items


def restock_order_inventory(sb: Client, order: dict[str, Any]) -> dict[str, Any]:
    restocked_units = 0
    restocked_items: list[str] = []
    for item_id, quantity in extract_order_restock_items(order):
        try:
            row_res = sb.table("catalog").select("id,stock").eq("id", item_id).limit(1).execute()
        except Exception as exc:
            logger.warning(f"Could not fetch inventory item {item_id} for restock: {exc}")
            continue
        if not row_res.data:
            logger.warning(f"Could not restock missing inventory item {item_id} for order {order.get('id')}.")
            continue

        current_stock = max(to_int(row_res.data[0].get("stock")), 0)
        next_stock = current_stock + quantity
        try:
            sb.table("catalog").update({"stock": next_stock, "is_archived": False}).eq("id", item_id).execute()
            restocked_units += quantity
            restocked_items.append(item_id)
        except Exception as exc:
            logger.warning(f"Could not restock item {item_id} for order {order.get('id')}: {exc}")

    if restocked_units > 0:
        invalidate_catalog_cache()
    return {
        "restocked_units": restocked_units,
        "restocked_items": restocked_items,
    }


def restore_credit_account_after_refund(sb: Client, user_id: str, credit_applied: float) -> float:
    if credit_applied <= 0:
        return 0.0

    account = get_credit_account(sb, user_id)
    if not account:
        return 0.0

    snapshot = normalize_credit_account_snapshot(account)
    if snapshot.get("status") != "approved":
        return 0.0

    assigned_credit_limit = round(to_float(snapshot.get("assigned_credit_limit")), 2)
    available_credit = round(to_float(snapshot.get("available_credit")), 2)
    consumed_credit = round(to_float(snapshot.get("consumed_credit")), 2)
    if assigned_credit_limit <= 0 or consumed_credit <= 0:
        return 0.0

    reversible_amount = round(min(credit_applied, consumed_credit), 2)
    if reversible_amount <= 0:
        return 0.0

    next_consumed = round(max(consumed_credit - reversible_amount, 0.0), 2)
    next_available = round(min(assigned_credit_limit, available_credit + reversible_amount), 2)
    upsert_credit_account_record(
        sb,
        user_id=user_id,
        status="approved",
        assigned_credit_limit=assigned_credit_limit,
        available_credit=next_available,
        consumed_credit=next_consumed,
        last_score=to_float(snapshot.get("last_score")),
        creditworthiness=snapshot.get("creditworthiness"),
    )
    return reversible_amount


def apply_order_terminal_compensation(
    sb: Client,
    *,
    order: dict[str, Any],
    tracking: Optional[dict[str, Any]],
    payment_intent: Optional[dict[str, Any]],
    next_status: str,
) -> dict[str, Any]:
    previous_status = normalize_tracking_status(str((tracking or {}).get("status") or "ordered"))
    if next_status not in ORDER_REFUNDABLE_STATUSES:
        return {
            "applied": False,
            "previous_status": previous_status,
            "restocked_units": 0,
            "restocked_items": [],
            "credit_restored": 0.0,
            "payment_refund_synced": False,
        }
    if previous_status in ORDER_REFUNDABLE_STATUSES:
        return {
            "applied": False,
            "previous_status": previous_status,
            "restocked_units": 0,
            "restocked_items": [],
            "credit_restored": 0.0,
            "payment_refund_synced": False,
        }

    restock_result = restock_order_inventory(sb, order)
    user_id = str(order.get("user_id") or "").strip()
    credit_applied = round(
        to_float((tracking or {}).get("credit_applied"), to_float((payment_intent or {}).get("credit_applied"))),
        2,
    )
    credit_restored = restore_credit_account_after_refund(sb, user_id, credit_applied) if user_id else 0.0

    payment_reference = str(
        (tracking or {}).get("payment_reference")
        or (payment_intent or {}).get("reference")
        or ""
    ).strip()
    payment_refund_synced = False
    if payment_reference and supports_table(sb, "payment_intents"):
        try:
            update_payment_intent(
                sb,
                payment_reference,
                {"status": "cancelled", "provider_status": "refunded"},
            )
            payment_refund_synced = True
        except Exception as exc:
            logger.warning(f"Could not mark payment intent as refunded for {payment_reference}: {exc}")

    return {
        "applied": True,
        "previous_status": previous_status,
        "restocked_units": int(restock_result.get("restocked_units") or 0),
        "restocked_items": restock_result.get("restocked_items") or [],
        "credit_restored": round(credit_restored, 2),
        "payment_refund_synced": payment_refund_synced,
    }


async def validate_checkout_credit(payload: CheckoutPayload):
    credit_res = await get_credit_score(payload.userId)
    credit_limit = float(credit_res["credit_limit"])
    credit_score = float(credit_res["credit_score"])

    credit_applied = float(payload.credit_applied)
    cash_component = round(float(payload.totalAmount) - credit_applied, 2)

    if credit_applied < 0:
        raise HTTPException(status_code=400, detail="Credit applied cannot be negative.")
    if cash_component < 0:
        raise HTTPException(status_code=400, detail="Credit applied cannot exceed cart total.")
    if credit_applied > credit_limit:
        audit_log(
            event_type="CREDIT_LIMIT_EXCEEDED",
            user_id=payload.userId,
            description=f"Checkout blocked. Attempted to apply GH₵{credit_applied:.2f} credit, limit is GH₵{credit_limit:.2f}.",
            metadata={
                "credit_applied_attempted": credit_applied,
                "credit_limit": credit_limit,
                "credit_score": credit_score,
                "cart_total": payload.totalAmount,
            },
        )
        raise HTTPException(
            status_code=400,
            detail=f"Credit applied (GH₵{credit_applied:.2f}) exceeds your approved limit of GH₵{credit_limit:.2f}.",
        )

    return {
        "credit_limit": credit_limit,
        "credit_score": credit_score,
        "credit_applied": credit_applied,
        "cash_component": cash_component,
    }


def update_credit_account_after_purchase(
    sb: Client,
    user_id: str,
    credit_applied: float,
):
    if credit_applied <= 0:
        return

    account = get_credit_account(sb, user_id)
    if not account:
        raise ValueError("No approved credit account found for this user.")

    snapshot = normalize_credit_account_snapshot(account)
    status = snapshot["status"]
    if not is_credit_account_spendable(status):
        raise ValueError("Credit account is not approved for checkout usage.")

    available_credit = snapshot["available_credit"]
    if credit_applied > available_credit:
        raise ValueError(
            f"Credit applied (GH₵{credit_applied:.2f}) exceeds remaining available credit GH₵{available_credit:.2f}."
        )

    consumed_credit = snapshot["consumed_credit"]
    assigned_credit_limit = snapshot["assigned_credit_limit"]
    next_consumed = round(consumed_credit + credit_applied, 2)
    next_available = round(max(assigned_credit_limit - next_consumed, 0.0), 2)
    upsert_credit_account_record(
        sb,
        user_id=user_id,
        status="approved",
        assigned_credit_limit=assigned_credit_limit,
        available_credit=next_available,
        consumed_credit=next_consumed,
        last_score=snapshot["last_score"],
        creditworthiness=snapshot["creditworthiness"],
    )


def finalize_order_and_deduct_stock(
    sb: Client,
    payload: CheckoutPayload,
    credit_score: float,
    credit_limit: float,
    credit_applied: float,
    cash_component: float,
    delivery_address: Optional[str] = None,
    payment_provider: str = "credit",
    payment_reference: Optional[str] = None,
    payment_status: str = "paid",
):
    item_snapshots = []
    for item in payload.items:
        res = sb.table("catalog").select("stock, name, type, price, brand").eq("id", item.id).execute()
        if not res.data:
            raise ValueError(f"Product not found: {item.id}")

        row = res.data[0]
        current_stock = row["stock"]
        product_name = row["name"]

        if current_stock < item.quantity:
            raise ValueError(f"Insufficient stock. Only {current_stock} units of '{product_name}' available.")

        next_stock = current_stock - item.quantity
        if next_stock > 0:
            sb.table("catalog").update({"stock": next_stock}).eq("id", item.id).execute()
        else:
            sb.table("catalog").update({"stock": 0, "is_archived": True}).eq("id", item.id).execute()

        item_snapshots.append(
            {
                "product_id": item.id,
                "product_name": product_name,
                "product_type": row.get("type"),
                "brand": row.get("brand"),
                "unit_price": item.price,
                "quantity_ordered": item.quantity,
                "line_total": round(item.price * item.quantity, 2),
            }
        )

    order_packet = {
        "user_id": payload.userId,
        "total_amount": payload.totalAmount,
        "items": [item.dict() for item in payload.items],
    }
    receipt = sb.table("orders").insert(order_packet).execute()
    order_id = str(receipt.data[0].get("id", "PROCESSED"))

    if credit_applied > 0:
        try:
            update_credit_account_after_purchase(
                sb=sb,
                user_id=payload.userId,
                credit_applied=credit_applied,
            )
        except Exception as exc:
            logger.error(f"Credit account update failed for order {order_id}: {exc}")

    try:
        write_order_tracking_records(
            sb=sb,
            order_id=order_id,
            user_id=payload.userId,
            total_amount=payload.totalAmount,
            credit_applied=credit_applied,
            cash_component=cash_component,
            delivery_address=delivery_address,
            payment_provider=payment_provider,
            payment_reference=payment_reference,
            payment_status=payment_status,
        )
    except Exception as exc:
        logger.warning(f"Could not persist order tracking records for order {order_id}: {exc}")

    audit_log(
        event_type="ORDER_PROCESSED",
        user_id=payload.userId,
        description=f"Order {order_id} completed. Revenue: GH₵{payload.totalAmount:.2f} (Credit: GH₵{credit_applied:.2f} / Cash: GH₵{cash_component:.2f}).",
        metadata={
            "order_id": order_id,
            "total_revenue": payload.totalAmount,
            "credit_applied": credit_applied,
            "cash_component": cash_component,
            "credit_score_at_purchase": credit_score,
            "credit_limit_at_purchase": credit_limit,
            "credit_utilisation_pct": round((credit_applied / credit_limit) * 100, 2) if credit_limit else 0,
            "unique_products": len(payload.items),
            "items": item_snapshots,
        },
    )
    invalidate_catalog_cache()
    logger.info(f"Order {order_id} successfully committed for user {payload.userId}.")
    return order_id


def cents_from_amount(amount: float) -> int:
    return int(round(amount * 100))


def amount_from_cents(cents: int) -> float:
    return round(float(cents) / 100.0, 2)


def validate_stock_availability(sb: Client, payload: CheckoutPayload):
    for item in payload.items:
        res = sb.table("catalog").select("stock, name").eq("id", item.id).execute()
        if not res.data:
            raise ValueError(f"Product not found: {item.id}")

        row = res.data[0]
        current_stock = int(row.get("stock") or 0)
        product_name = row.get("name") or item.id

        if item.quantity <= 0:
            raise ValueError(f"Quantity for '{product_name}' must be at least 1.")
        if current_stock < item.quantity:
            raise ValueError(f"Insufficient stock. Only {current_stock} units of '{product_name}' available.")


def generate_payment_reference() -> str:
    return f"gfm_{uuid4().hex}"


def get_payment_intent_by_reference(sb: Client, reference: str) -> Optional[dict[str, Any]]:
    intent_res = (
        sb.table("payment_intents")
        .select("*")
        .eq("reference", reference)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    return intent_res.data[0] if intent_res.data else None


def update_payment_intent(sb: Client, reference: str, updates: dict[str, Any]):
    updates = {**updates, "updated_at": now_utc().isoformat()}
    sb.table("payment_intents").update(updates).eq("reference", reference).execute()


def build_checkout_payload_from_intent(intent: dict[str, Any]) -> CheckoutPayload:
    raw_items = intent.get("items")
    if not isinstance(raw_items, list) or not raw_items:
        raise ValueError("Stored payment intent has invalid cart items.")
    items = [OrderItem(**row) for row in raw_items]
    return CheckoutPayload(
        userId=str(intent.get("user_id") or ""),
        totalAmount=float(intent.get("total_amount") or 0),
        credit_applied=float(intent.get("credit_applied") or 0),
        items=items,
    )


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.post("/api/admin/auth/login/initiate")
async def admin_login_initiate(payload: AdminLoginInitiatePayload):
    sb = ensure_service_supabase()
    if not supports_admin_otp_tables(sb):
        raise HTTPException(
            status_code=503,
            detail="Admin OTP table is not installed. Run backend/sql/supabase_phone_otp_schema.sql in Supabase first.",
        )

    email = normalize_email(payload.email)
    admin = ADMIN_PREDEFINED_ACCOUNTS.get(email)
    if not admin or not hmac.compare_digest(payload.password, admin.get("password", "")):
        audit_log(
            event_type="ADMIN_LOGIN_FAILED",
            user_id=email,
            description="Admin login initiation failed due to invalid credentials.",
        )
        raise HTTPException(status_code=401, detail="Invalid admin credentials.")

    otp = generate_otp()
    otp_hash = hash_admin_otp(email, otp)
    expires_at = now_utc() + timedelta(minutes=OTP_TTL_MINUTES)

    insert_res = sb.table("admin_otp_challenges").insert(
        {
            "admin_email": email,
            "otp_hash": otp_hash,
            "attempts": 0,
            "created_at": now_utc().isoformat(),
            "expires_at": expires_at.isoformat(),
        }
    ).execute()
    if not insert_res.data:
        raise HTTPException(status_code=500, detail="Could not initialize admin OTP challenge.")
    challenge_id = str(insert_res.data[0].get("id"))

    delivery_mode, target_hint = dispatch_admin_otp(admin, otp)

    audit_log(
        event_type="ADMIN_OTP_CHALLENGE_CREATED",
        user_id=email,
        description=f"Admin OTP challenge created (delivery={delivery_mode}).",
        metadata={"challenge_id": challenge_id, "delivery_mode": delivery_mode},
    )

    return {
        "status": "otp_sent",
        "challenge_id": challenge_id,
        "delivery_mode": delivery_mode,
        "target_hint": target_hint,
        "expires_in_minutes": OTP_TTL_MINUTES,
    }


@app.post("/api/admin/auth/login/verify")
async def admin_login_verify(payload: AdminOtpVerifyPayload):
    sb = ensure_service_supabase()
    if not supports_admin_otp_tables(sb):
        raise HTTPException(
            status_code=503,
            detail="Admin OTP table is not installed. Run backend/sql/supabase_phone_otp_schema.sql in Supabase first.",
        )

    email = normalize_email(payload.email)
    admin = ADMIN_PREDEFINED_ACCOUNTS.get(email)
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid admin credentials.")

    challenge_id = payload.challenge_id.strip()
    otp_value = payload.otp.strip()
    if not challenge_id:
        raise HTTPException(status_code=400, detail="challenge_id is required.")
    if not otp_value:
        raise HTTPException(status_code=400, detail="otp is required.")

    challenge_res = (
        sb.table("admin_otp_challenges")
        .select("*")
        .eq("id", challenge_id)
        .eq("admin_email", email)
        .is_("consumed_at", "null")
        .limit(1)
        .execute()
    )
    if not challenge_res.data:
        raise HTTPException(status_code=400, detail="OTP challenge is invalid or already used.")
    challenge = challenge_res.data[0]

    attempts = int(challenge.get("attempts") or 0)
    if attempts >= OTP_MAX_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Maximum OTP attempts reached. Request a new challenge.")

    expires_at_raw = challenge.get("expires_at")
    if not expires_at_raw:
        raise HTTPException(status_code=500, detail="Malformed OTP challenge.")
    expires_at = parse_db_timestamp(str(expires_at_raw))
    if now_utc() > expires_at:
        raise HTTPException(status_code=400, detail="OTP challenge has expired.")

    provided_hash = hash_admin_otp(email, otp_value)
    if not hmac.compare_digest(str(challenge.get("otp_hash") or ""), provided_hash):
        sb.table("admin_otp_challenges").update({"attempts": attempts + 1}).eq("id", challenge_id).execute()
        raise HTTPException(status_code=401, detail="Invalid OTP.")

    consumed_at = now_utc().isoformat()
    sb.table("admin_otp_challenges").update({"consumed_at": consumed_at}).eq("id", challenge_id).execute()

    token, expires_at_dt = create_admin_session_token(admin)
    audit_log(
        event_type="ADMIN_LOGIN_SUCCEEDED",
        user_id=email,
        description="Admin authenticated via OTP.",
        metadata={"challenge_id": challenge_id},
    )

    return {
        "status": "authenticated",
        "token": token,
        "expires_at": expires_at_dt.isoformat(),
        "admin": {"name": admin["name"], "email": admin["email"]},
    }


@app.get("/api/admin/auth/session")
async def admin_auth_session(authorization: Optional[str] = Header(default=None)):
    token = extract_bearer_token(authorization)
    payload = verify_admin_session_token(token)
    return {
        "authenticated": True,
        "admin": {"name": payload.get("name"), "email": payload.get("sub")},
        "expires_at_unix": payload.get("exp"),
    }


@app.get("/api/admin/inventory")
async def admin_list_inventory(authorization: Optional[str] = Header(default=None)):
    admin = require_admin_session(authorization)
    sb = ensure_service_supabase()
    try:
        data = sb.table("catalog").select("*").order("name").execute().data or []
    except Exception as exc:
        logger.error(f"Admin inventory list failed: {exc}")
        raise HTTPException(status_code=500, detail="Could not fetch inventory.")

    normalized_items: list[dict[str, Any]] = []
    should_invalidate_cache = False
    for row in data:
        normalized_row = dict(row)
        if not normalized_row.get("imageUrl") and normalized_row.get("image_url"):
            normalized_row["imageUrl"] = normalized_row.get("image_url")
        try:
            current_name = str(row.get("name") or "").strip()
            current_type = str(row.get("type") or "").strip() or "ITEM"
            normalized_name, normalized_type, _ = normalize_inventory_name_and_type(current_name, current_type)
            normalized_row["name"] = normalized_name
            normalized_row["type"] = normalized_type

            updates: dict[str, Any] = {}
            if normalized_name != current_name:
                updates["name"] = normalized_name
            if normalized_type != current_type.upper():
                updates["type"] = normalized_type
            if updates and row.get("id"):
                sb.table("catalog").update(updates).eq("id", row["id"]).execute()
                should_invalidate_cache = True
        except Exception:
            pass
        normalized_items.append(normalized_row)

    if should_invalidate_cache:
        invalidate_catalog_cache()

    return {"count": len(normalized_items), "items": normalized_items, "admin": {"name": admin["name"], "email": admin["email"]}}


@app.post("/api/admin/inventory")
async def admin_create_inventory_item(
    payload: AdminInventoryCreatePayload,
    authorization: Optional[str] = Header(default=None),
):
    admin = require_admin_session(authorization)
    sb = ensure_service_supabase()

    item_name, normalized_type, _ = normalize_inventory_name_and_type(payload.name, payload.type)
    item_id = (payload.id or "").strip() or build_inventory_id(item_name, normalized_type)
    item_id = re.sub(r"\s+", "-", item_id.lower())

    existing = sb.table("catalog").select("id").eq("id", item_id).limit(1).execute().data or []
    if existing:
        raise HTTPException(status_code=409, detail=f"Inventory item with id '{item_id}' already exists.")

    row = {
        "id": item_id,
        "name": item_name,
        "type": normalized_type,
        "price": round(float(payload.price), 2),
        "stock": int(payload.stock),
        "location": (payload.location or "").strip() or None,
        "imageUrl": (payload.imageUrl or "").strip() or None,
        "size": (payload.size or "").strip() or None,
        "weight": (payload.weight or "").strip() or None,
        "brand": (payload.brand or "").strip() or "Grow For Me",
        "is_archived": False,
    }

    try:
        insert_res = sb.table("catalog").insert(row).execute()
        created = insert_res.data[0] if insert_res.data else row
    except Exception as exc:
        logger.error(f"Admin inventory create failed for {item_id}: {exc}")
        raise HTTPException(status_code=500, detail="Could not create inventory item.")

    invalidate_catalog_cache()
    audit_log(
        event_type="ADMIN_INVENTORY_CREATED",
        user_id=admin["email"],
        description=f"Inventory item created: {item_id}.",
        metadata={"item_id": item_id, "type": normalized_type},
    )
    return {"status": "created", "item": created}


@app.put("/api/admin/inventory/{item_id}")
async def admin_update_inventory_item(
    item_id: str,
    payload: AdminInventoryUpdatePayload,
    authorization: Optional[str] = Header(default=None),
):
    admin = require_admin_session(authorization)
    sb = ensure_service_supabase()
    safe_item_id = item_id.strip()
    if not safe_item_id:
        raise HTTPException(status_code=400, detail="Missing item id.")

    existing_res = sb.table("catalog").select("*").eq("id", safe_item_id).limit(1).execute()
    if not existing_res.data:
        raise HTTPException(status_code=404, detail="Inventory item not found.")

    existing = existing_res.data[0]
    updates: dict[str, Any] = {}
    if payload.name is not None or payload.type is not None:
        next_name = payload.name if payload.name is not None else str(existing.get("name") or "")
        next_type = payload.type if payload.type is not None else str(existing.get("type") or "ITEM")
        normalized_name, normalized_type, inferred_type_from_name = normalize_inventory_name_and_type(next_name, next_type)
        if payload.name is not None:
            updates["name"] = normalized_name
        if payload.type is not None or inferred_type_from_name:
            updates["type"] = normalized_type
    if payload.price is not None:
        updates["price"] = round(float(payload.price), 2)
    if payload.stock is not None:
        updates["stock"] = int(payload.stock)
    if payload.location is not None:
        updates["location"] = payload.location.strip() or None
    if payload.imageUrl is not None:
        updates["imageUrl"] = payload.imageUrl.strip() or None
    if payload.size is not None:
        updates["size"] = payload.size.strip() or None
    if payload.weight is not None:
        updates["weight"] = payload.weight.strip() or None
    if payload.brand is not None:
        updates["brand"] = payload.brand.strip() or None

    if not updates:
        raise HTTPException(status_code=400, detail="No fields were provided for update.")

    try:
        sb.table("catalog").update(updates).eq("id", safe_item_id).execute()
        updated_res = sb.table("catalog").select("*").eq("id", safe_item_id).limit(1).execute()
        updated = updated_res.data[0] if updated_res.data else {**existing_res.data[0], **updates}
    except Exception as exc:
        logger.error(f"Admin inventory update failed for {safe_item_id}: {exc}")
        raise HTTPException(status_code=500, detail="Could not update inventory item.")

    invalidate_catalog_cache()
    audit_log(
        event_type="ADMIN_INVENTORY_UPDATED",
        user_id=admin["email"],
        description=f"Inventory item updated: {safe_item_id}.",
        metadata={"item_id": safe_item_id, "fields": sorted(updates.keys())},
    )
    return {"status": "updated", "item": updated}


@app.delete("/api/admin/inventory/{item_id}")
async def admin_delete_inventory_item(
    item_id: str,
    payload: AdminInventoryDeletePayload,
    authorization: Optional[str] = Header(default=None),
):
    admin = require_admin_session(authorization)
    safe_item_id = item_id.strip()
    if not safe_item_id:
        raise HTTPException(status_code=400, detail="Missing item id.")
    if not hmac.compare_digest(payload.password, admin.get("password", "")):
        raise HTTPException(status_code=401, detail="Invalid admin password confirmation.")

    sb = ensure_service_supabase()
    existing_res = sb.table("catalog").select("*").eq("id", safe_item_id).limit(1).execute()
    if not existing_res.data:
        raise HTTPException(status_code=404, detail="Inventory item not found.")

    try:
        sb.table("catalog").delete().eq("id", safe_item_id).execute()
    except Exception as exc:
        logger.error(f"Admin inventory delete failed for {safe_item_id}: {exc}")
        raise HTTPException(status_code=500, detail="Could not delete inventory item.")

    invalidate_catalog_cache()
    audit_log(
        event_type="ADMIN_INVENTORY_DELETED",
        user_id=admin["email"],
        description=f"Inventory item deleted: {safe_item_id}.",
        metadata={"item_id": safe_item_id},
    )
    return {"status": "deleted", "item_id": safe_item_id}


@app.get("/api/admin/aggregate-deals")
async def admin_list_aggregate_deals(
    status: Optional[str] = None,
    authorization: Optional[str] = Header(default=None),
):
    require_admin_session(authorization)
    sb = ensure_service_supabase()
    if not supports_aggregate_deals_tables(sb):
        raise HTTPException(
            status_code=503,
            detail="Aggregate deal tables are not installed. Run backend/sql/supabase_phone_otp_schema.sql in Supabase first.",
        )

    query = (
        sb.table("aggregate_deals")
        .select("*")
        .eq("deal_type", "bulk")
        .order("created_at", desc=True)
        .limit(200)
    )
    if (status or "").strip():
        query = query.eq("status", normalize_aggregate_deal_status(status))
    data = query.execute().data or []
    return {"count": len(data), "deals": [decorate_aggregate_deal(row) for row in data]}


@app.post("/api/admin/aggregate-deals")
async def admin_create_aggregate_deal(
    payload: AdminAggregateDealCreatePayload,
    authorization: Optional[str] = Header(default=None),
):
    admin = require_admin_session(authorization)
    sb = ensure_service_supabase()
    if not supports_aggregate_deals_tables(sb):
        raise HTTPException(
            status_code=503,
            detail="Aggregate deal tables are not installed. Run backend/sql/supabase_phone_otp_schema.sql in Supabase first.",
        )

    deal_type = normalize_aggregate_deal_type(payload.deal_type)
    if deal_type != "bulk":
        raise HTTPException(status_code=400, detail="Only bulk aggregate deals are enabled at the moment.")
    status = normalize_aggregate_deal_status(payload.status)
    start_at = parse_optional_datetime(payload.start_at, "start_at")
    end_at = parse_optional_datetime(payload.end_at, "end_at")
    if start_at and end_at and parse_db_timestamp(end_at) <= parse_db_timestamp(start_at):
        raise HTTPException(status_code=400, detail="end_at must be later than start_at.")
    if payload.max_join_quantity is not None and payload.max_join_quantity < payload.min_join_quantity:
        raise HTTPException(status_code=400, detail="max_join_quantity must be >= min_join_quantity.")
    source_inventory_item_id = (payload.source_inventory_item_id or "").strip() or None
    reserve_inventory_quantity = payload.reserve_inventory_quantity
    if source_inventory_item_id and reserve_inventory_quantity is None:
        reserve_inventory_quantity = payload.target_quantity
    if source_inventory_item_id and reserve_inventory_quantity is None:
        raise HTTPException(
            status_code=400,
            detail="reserve_inventory_quantity or target_quantity is required when source_inventory_item_id is provided.",
        )
    if (
        source_inventory_item_id
        and reserve_inventory_quantity is not None
        and payload.target_quantity is not None
        and reserve_inventory_quantity > payload.target_quantity
    ):
        raise HTTPException(
            status_code=400,
            detail="reserve_inventory_quantity cannot be greater than target_quantity.",
        )

    base_price = round(float(payload.base_price), 2)
    discount_percent = round(float(payload.discount_percent), 2)
    deal_price = round(float(payload.deal_price), 2) if payload.deal_price is not None else round(
        base_price * (1 - (discount_percent / 100.0)), 2
    )
    starting_bid = round(float(payload.starting_bid), 2) if payload.starting_bid is not None else 0.0
    if deal_type == "auction":
        discount_percent = 0.0
        deal_price = base_price
        if starting_bid <= 0:
            starting_bid = max(base_price, 1.0)

    target_quantity = payload.target_quantity if deal_type == "bulk" else None
    reservation: Optional[dict[str, Any]] = None
    deal_metadata: dict[str, Any] = {}
    if source_inventory_item_id:
        try:
            reservation = reserve_inventory_for_bulk_deal(sb, source_inventory_item_id, int(reserve_inventory_quantity or 0))
            deal_metadata = reservation.get("metadata") or {}
            invalidate_catalog_cache()
        except HTTPException:
            raise
        except Exception as exc:
            logger.error(f"Could not reserve inventory for aggregate deal creation: {exc}")
            raise HTTPException(status_code=500, detail="Could not reserve source inventory for this bulk deal.")
        if target_quantity is None:
            target_quantity = int(reserve_inventory_quantity or 0)

    row = {
        "title": payload.title.strip(),
        "description": (payload.description or "").strip() or None,
        "deal_type": deal_type,
        "item_name": payload.item_name.strip(),
        "item_category": (payload.item_category or "").strip() or None,
        "unit": (payload.unit or "").strip() or None,
        "image_url": (payload.image_url or "").strip() or None,
        "base_price": base_price,
        "discount_percent": discount_percent,
        "deal_price": deal_price,
        "target_quantity": target_quantity,
        "current_quantity": 0,
        "min_join_quantity": payload.min_join_quantity if deal_type == "bulk" else 1,
        "max_join_quantity": payload.max_join_quantity if deal_type == "bulk" else None,
        "starting_bid": starting_bid if deal_type == "auction" else None,
        "highest_bid": None,
        "highest_bidder": None,
        "start_at": start_at,
        "end_at": end_at,
        "status": status,
        "created_by": admin["email"],
        "metadata": deal_metadata,
        "updated_at": now_utc().isoformat(),
    }

    try:
        created_res = sb.table("aggregate_deals").insert(row).execute()
        created = created_res.data[0] if created_res.data else row
    except Exception as exc:
        if reservation:
            try:
                rollback_inventory_reservation(sb, reservation)
                invalidate_catalog_cache()
            except Exception as rollback_exc:
                logger.warning(f"Could not rollback inventory reservation after aggregate deal create failure: {rollback_exc}")
        logger.error(f"Could not create aggregate deal: {exc}")
        raise HTTPException(status_code=500, detail="Could not create aggregate deal.")

    audit_log(
        event_type="ADMIN_AGGREGATE_DEAL_CREATED",
        user_id=admin["email"],
        description=f"Aggregate deal created: {created.get('id')}.",
        metadata={
            "deal_type": deal_type,
            "status": status,
            "source_inventory_item_id": source_inventory_item_id,
            "reserved_inventory_quantity": reservation.get("reserved_quantity") if reservation else 0,
        },
    )
    return {"status": "created", "deal": decorate_aggregate_deal(created)}


@app.patch("/api/admin/aggregate-deals/{deal_id}")
@app.put("/api/admin/aggregate-deals/{deal_id}")
async def admin_update_aggregate_deal(
    deal_id: str,
    payload: AdminAggregateDealUpdatePayload,
    authorization: Optional[str] = Header(default=None),
):
    admin = require_admin_session(authorization)
    sb = ensure_service_supabase()
    if not supports_aggregate_deals_tables(sb):
        raise HTTPException(
            status_code=503,
            detail="Aggregate deal tables are not installed. Run backend/sql/supabase_phone_otp_schema.sql in Supabase first.",
        )

    safe_id = deal_id.strip()
    if not safe_id:
        raise HTTPException(status_code=400, detail="Missing deal id.")
    existing_res = sb.table("aggregate_deals").select("*").eq("id", safe_id).limit(1).execute()
    if not existing_res.data:
        raise HTTPException(status_code=404, detail="Aggregate deal not found.")
    existing = existing_res.data[0]

    updates: dict[str, Any] = {}
    if payload.title is not None:
        updates["title"] = payload.title.strip()
    if payload.description is not None:
        updates["description"] = payload.description.strip() or None
    if payload.item_name is not None:
        updates["item_name"] = payload.item_name.strip()
    if payload.item_category is not None:
        updates["item_category"] = payload.item_category.strip() or None
    if payload.unit is not None:
        updates["unit"] = payload.unit.strip() or None
    if payload.image_url is not None:
        updates["image_url"] = payload.image_url.strip() or None
    if payload.base_price is not None:
        updates["base_price"] = round(float(payload.base_price), 2)
    if payload.discount_percent is not None:
        updates["discount_percent"] = round(float(payload.discount_percent), 2)
    if payload.deal_price is not None:
        updates["deal_price"] = round(float(payload.deal_price), 2)
    if payload.target_quantity is not None:
        updates["target_quantity"] = payload.target_quantity
    if payload.min_join_quantity is not None:
        updates["min_join_quantity"] = payload.min_join_quantity
    if payload.max_join_quantity is not None:
        updates["max_join_quantity"] = payload.max_join_quantity
    if payload.starting_bid is not None:
        updates["starting_bid"] = round(float(payload.starting_bid), 2)
    if payload.start_at is not None:
        updates["start_at"] = parse_optional_datetime(payload.start_at, "start_at")
    if payload.end_at is not None:
        updates["end_at"] = parse_optional_datetime(payload.end_at, "end_at")
    if payload.status is not None:
        updates["status"] = normalize_aggregate_deal_status(payload.status)

    if "max_join_quantity" in updates and "min_join_quantity" in updates:
        if updates["max_join_quantity"] is not None and updates["max_join_quantity"] < updates["min_join_quantity"]:
            raise HTTPException(status_code=400, detail="max_join_quantity must be >= min_join_quantity.")
    elif "max_join_quantity" in updates and updates["max_join_quantity"] is not None:
        min_join = int(existing.get("min_join_quantity") or 1)
        if updates["max_join_quantity"] < min_join:
            raise HTTPException(status_code=400, detail="max_join_quantity must be >= min_join_quantity.")
    elif "min_join_quantity" in updates:
        max_join = existing.get("max_join_quantity")
        if max_join is not None and int(max_join) < updates["min_join_quantity"]:
            raise HTTPException(status_code=400, detail="max_join_quantity must be >= min_join_quantity.")

    if "start_at" in updates or "end_at" in updates:
        next_start = updates.get("start_at", existing.get("start_at"))
        next_end = updates.get("end_at", existing.get("end_at"))
        if next_start and next_end and parse_db_timestamp(str(next_end)) <= parse_db_timestamp(str(next_start)):
            raise HTTPException(status_code=400, detail="end_at must be later than start_at.")

    if "deal_price" not in updates and ("base_price" in updates or "discount_percent" in updates):
        next_base = round(to_float(updates.get("base_price"), to_float(existing.get("base_price"))), 2)
        next_discount = round(to_float(updates.get("discount_percent"), to_float(existing.get("discount_percent"))), 2)
        updates["deal_price"] = round(next_base * (1 - (next_discount / 100.0)), 2)

    existing_status = str(existing.get("status") or "active").strip().lower()
    next_status = str(updates.get("status") or existing_status).strip().lower()
    restocked_quantity = 0
    if next_status in {"closed", "cancelled"} and existing_status not in {"closed", "cancelled"}:
        try:
            restocked_quantity, next_metadata = restock_unsold_bulk_inventory(sb, existing, next_status)
            if restocked_quantity > 0:
                updates["metadata"] = next_metadata
        except HTTPException:
            raise
        except Exception as exc:
            logger.error(f"Could not restock inventory while closing aggregate deal {safe_id}: {exc}")
            raise HTTPException(status_code=500, detail="Could not return unsold inventory for this bulk deal.")

    if not updates:
        raise HTTPException(status_code=400, detail="No fields were provided for update.")

    updates["updated_at"] = now_utc().isoformat()
    try:
        sb.table("aggregate_deals").update(updates).eq("id", safe_id).execute()
        updated_res = sb.table("aggregate_deals").select("*").eq("id", safe_id).limit(1).execute()
        updated = updated_res.data[0] if updated_res.data else {**existing, **updates}
    except Exception as exc:
        logger.error(f"Could not update aggregate deal {safe_id}: {exc}")
        raise HTTPException(status_code=500, detail="Could not update aggregate deal.")

    if restocked_quantity > 0:
        invalidate_catalog_cache()

    audit_log(
        event_type="ADMIN_AGGREGATE_DEAL_UPDATED",
        user_id=admin["email"],
        description=f"Aggregate deal updated: {safe_id}.",
        metadata={"fields": sorted(updates.keys()), "restocked_quantity": restocked_quantity},
    )
    return {
        "status": "updated",
        "deal": decorate_aggregate_deal(updated),
        "restocked_quantity": restocked_quantity,
    }


@app.delete("/api/admin/aggregate-deals/{deal_id}")
async def admin_delete_aggregate_deal(
    deal_id: str,
    authorization: Optional[str] = Header(default=None),
):
    admin = require_admin_session(authorization)
    sb = ensure_service_supabase()
    if not supports_aggregate_deals_tables(sb):
        raise HTTPException(
            status_code=503,
            detail="Aggregate deal tables are not installed. Run backend/sql/supabase_phone_otp_schema.sql in Supabase first.",
        )
    safe_id = deal_id.strip()
    if not safe_id:
        raise HTTPException(status_code=400, detail="Missing deal id.")

    existing_res = sb.table("aggregate_deals").select("id").eq("id", safe_id).limit(1).execute()
    if not existing_res.data:
        raise HTTPException(status_code=404, detail="Aggregate deal not found.")

    try:
        sb.table("aggregate_deals").delete().eq("id", safe_id).execute()
    except Exception as exc:
        logger.error(f"Could not delete aggregate deal {safe_id}: {exc}")
        raise HTTPException(status_code=500, detail="Could not delete aggregate deal.")

    audit_log(
        event_type="ADMIN_AGGREGATE_DEAL_DELETED",
        user_id=admin["email"],
        description=f"Aggregate deal deleted: {safe_id}.",
    )
    return {"status": "deleted", "deal_id": safe_id}


@app.get("/api/admin/orders")
async def admin_list_orders(
    status: Optional[str] = None,
    payment_status: Optional[str] = None,
    query: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    authorization: Optional[str] = Header(default=None),
):
    admin = require_admin_session(authorization)
    sb = ensure_service_supabase()
    if not supports_table(sb, "orders"):
        raise HTTPException(status_code=503, detail="Orders table is not installed.")

    safe_limit = max(1, min(limit, 200))
    safe_offset = max(offset, 0)
    status_filter = normalize_admin_order_status(status) if (status or "").strip() else None
    payment_filter = normalize_admin_payment_status(payment_status)
    query_filter = (query or "").strip().lower()
    from_dt = parse_admin_datetime_filter(from_date, "from_date")
    to_dt = parse_admin_datetime_filter(to_date, "to_date", end_of_day=True)
    if from_dt and to_dt and to_dt < from_dt:
        raise HTTPException(status_code=400, detail="to_date must be later than or equal to from_date.")

    # Fast path for default list view: push pagination to DB and only hydrate visible rows.
    if not status_filter and not payment_filter and not query_filter and not from_dt and not to_dt:
        try:
            range_end = safe_offset + safe_limit - 1
            orders_page_res = (
                sb.table("orders")
                .select("*", count="exact")
                .order("created_at", desc=True)
                .range(safe_offset, range_end)
                .execute()
            )
            orders_page = orders_page_res.data or []
            total = int(orders_page_res.count or 0)
        except Exception as exc:
            logger.error(f"Admin orders fast list query failed: {exc}")
            raise HTTPException(status_code=500, detail="Could not fetch orders.")

        order_ids = [str(row.get("id") or "").strip() for row in orders_page if str(row.get("id") or "").strip()]
        tracking_map: dict[str, dict[str, Any]] = {}
        latest_event_map: dict[str, dict[str, Any]] = {}
        payment_map: dict[str, dict[str, Any]] = {}

        if order_ids and supports_table(sb, "order_tracking"):
            try:
                tracking_rows_res = (
                    sb.table("order_tracking")
                    .select("*")
                    .in_("order_id", order_ids)
                    .order("updated_at", desc=True)
                    .execute()
                )
                for row in tracking_rows_res.data or []:
                    order_id = str(row.get("order_id") or "").strip()
                    if order_id and order_id not in tracking_map:
                        tracking_map[order_id] = row
            except Exception as exc:
                logger.warning(f"Could not fetch paged tracking rows for admin list: {exc}")

        if order_ids and supports_table(sb, "order_tracking_events"):
            try:
                event_rows_res = (
                    sb.table("order_tracking_events")
                    .select("order_id,event_type,status,note,event_time")
                    .in_("order_id", order_ids)
                    .order("event_time", desc=True)
                    .execute()
                )
                for event in event_rows_res.data or []:
                    order_id = str(event.get("order_id") or "").strip()
                    if order_id and order_id not in latest_event_map:
                        latest_event_map[order_id] = event
            except Exception as exc:
                logger.warning(f"Could not fetch paged order events for admin list: {exc}")

        if order_ids and supports_table(sb, "payment_intents"):
            try:
                payment_rows_res = (
                    sb.table("payment_intents")
                    .select(
                        "order_id,reference,provider,status,provider_status,cash_component,credit_applied,address,updated_at,created_at"
                    )
                    .in_("order_id", order_ids)
                    .order("created_at", desc=True)
                    .execute()
                )
                for row in payment_rows_res.data or []:
                    order_id = str(row.get("order_id") or "").strip()
                    if order_id and order_id not in payment_map:
                        payment_map[order_id] = row
            except Exception as exc:
                logger.warning(f"Could not fetch paged payment intents for admin list: {exc}")

        paged_orders = [
            build_admin_order_response(
                order=order,
                tracking=tracking_map.get(str(order.get("id") or "").strip()),
                latest_event=latest_event_map.get(str(order.get("id") or "").strip()),
                payment_intent=payment_map.get(str(order.get("id") or "").strip()),
            )
            for order in orders_page
        ]
        return {
            "count": len(paged_orders),
            "total": total,
            "limit": safe_limit,
            "offset": safe_offset,
            "orders": paged_orders,
            "admin": {"name": admin["name"], "email": admin["email"]},
        }

    try:
        orders = fetch_table_rows(
            sb,
            "orders",
            "*",
            limit=5000,
            order_by="created_at",
            desc=True,
        )
    except Exception as exc:
        logger.error(f"Admin orders list failed: {exc}")
        raise HTTPException(status_code=500, detail="Could not fetch orders.")

    tracking_map: dict[str, dict[str, Any]] = {}
    latest_event_map: dict[str, dict[str, Any]] = {}
    payment_map: dict[str, dict[str, Any]] = {}

    if supports_table(sb, "order_tracking"):
        try:
            tracking_rows = fetch_table_rows(
                sb,
                "order_tracking",
                "*",
                limit=5000,
                order_by="updated_at",
                desc=True,
            )
            for row in tracking_rows:
                order_id = str(row.get("order_id") or "").strip()
                if order_id and order_id not in tracking_map:
                    tracking_map[order_id] = row
        except Exception as exc:
            logger.warning(f"Could not fetch order tracking rows for admin list: {exc}")

    if supports_table(sb, "order_tracking_events"):
        try:
            event_rows = fetch_table_rows(
                sb,
                "order_tracking_events",
                "order_id,event_type,status,note,event_time",
                limit=5000,
                order_by="event_time",
                desc=True,
            )
            for event in event_rows:
                order_id = str(event.get("order_id") or "").strip()
                if order_id and order_id not in latest_event_map:
                    latest_event_map[order_id] = event
        except Exception as exc:
            logger.warning(f"Could not fetch order events for admin list: {exc}")

    if supports_table(sb, "payment_intents"):
        try:
            payment_rows = fetch_table_rows(
                sb,
                "payment_intents",
                "order_id,reference,provider,status,provider_status,cash_component,credit_applied,address,updated_at,created_at",
                limit=5000,
                order_by="created_at",
                desc=True,
            )
            for row in payment_rows:
                order_id = str(row.get("order_id") or "").strip()
                if order_id and order_id not in payment_map:
                    payment_map[order_id] = row
        except Exception as exc:
            logger.warning(f"Could not fetch payment intents for admin list: {exc}")

    filtered: list[dict[str, Any]] = []
    for order in orders:
        order_id = str(order.get("id") or "")
        order_view = build_admin_order_response(
            order=order,
            tracking=tracking_map.get(order_id),
            latest_event=latest_event_map.get(order_id),
            payment_intent=payment_map.get(order_id),
        )

        if status_filter:
            current_status = normalize_tracking_status(str(order_view.get("status") or "ordered"))
            # Treat failed and cancelled as one terminal bucket for admin filtering.
            if status_filter == "cancelled":
                if current_status not in {"cancelled", "failed"}:
                    continue
            elif current_status != status_filter:
                continue
        if payment_filter:
            current_payment = normalize_admin_payment_status(str(order_view.get("payment_status") or "")) or "unknown"
            if current_payment != payment_filter:
                continue
        if query_filter:
            haystack = " ".join(
                [
                    str(order_view.get("order_id") or ""),
                    str(order_view.get("user_id") or ""),
                    str(order_view.get("payment_reference") or ""),
                    str(order_view.get("status_label") or ""),
                    str(order_view.get("payment_provider") or ""),
                ]
            ).lower()
            if query_filter not in haystack:
                continue

        created_at_raw = order_view.get("created_at")
        if from_dt or to_dt:
            if not created_at_raw:
                continue
            try:
                created_at_dt = parse_db_timestamp(str(created_at_raw))
            except Exception:
                continue
            if not created_at_dt.tzinfo:
                created_at_dt = created_at_dt.replace(tzinfo=timezone.utc)
            if from_dt and created_at_dt < from_dt:
                continue
            if to_dt and created_at_dt > to_dt:
                continue

        filtered.append(order_view)

    total = len(filtered)
    paged_orders = filtered[safe_offset : safe_offset + safe_limit]
    return {
        "count": len(paged_orders),
        "total": total,
        "limit": safe_limit,
        "offset": safe_offset,
        "orders": paged_orders,
        "admin": {"name": admin["name"], "email": admin["email"]},
    }


@app.get("/api/admin/orders/{order_id}")
async def admin_get_order_details(
    order_id: str,
    authorization: Optional[str] = Header(default=None),
):
    admin = require_admin_session(authorization)
    sb = ensure_service_supabase()
    if not supports_table(sb, "orders"):
        raise HTTPException(status_code=503, detail="Orders table is not installed.")
    safe_order_id = order_id.strip()
    if not safe_order_id:
        raise HTTPException(status_code=400, detail="Missing order id.")

    order = fetch_order_by_id(sb, safe_order_id)
    resolved_order_id = str(order.get("id") or safe_order_id)
    tracking: dict[str, Any] = {}
    timeline: list[dict[str, Any]] = []
    payment_intent: dict[str, Any] = {}

    if supports_table(sb, "order_tracking"):
        try:
            tracking_res = sb.table("order_tracking").select("*").eq("order_id", resolved_order_id).limit(1).execute()
            if tracking_res.data:
                tracking = tracking_res.data[0]
        except Exception as exc:
            logger.warning(f"Could not fetch tracking details for admin order view {resolved_order_id}: {exc}")

    if supports_table(sb, "order_tracking_events"):
        try:
            timeline_res = (
                sb.table("order_tracking_events")
                .select("*")
                .eq("order_id", resolved_order_id)
                .order("event_time", desc=False)
                .execute()
            )
            timeline = timeline_res.data or []
        except Exception as exc:
            logger.warning(f"Could not fetch timeline details for admin order view {resolved_order_id}: {exc}")

    if supports_table(sb, "payment_intents"):
        try:
            payment_res = (
                sb.table("payment_intents")
                .select(
                    "order_id,reference,provider,status,provider_status,cash_component,credit_applied,address,updated_at,created_at"
                )
                .eq("order_id", resolved_order_id)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            if payment_res.data:
                payment_intent = payment_res.data[0]
        except Exception as exc:
            logger.warning(f"Could not fetch payment details for admin order view {resolved_order_id}: {exc}")

    latest_event = timeline[-1] if timeline else None
    order_view = build_admin_order_response(
        order=order,
        tracking=tracking,
        latest_event=latest_event,
        payment_intent=payment_intent,
    )
    return {
        "order": order_view,
        "timeline": timeline,
        "admin": {"name": admin["name"], "email": admin["email"]},
    }


@app.patch("/api/admin/orders/{order_id}/status")
@app.put("/api/admin/orders/{order_id}/status")
async def admin_update_order_status(
    order_id: str,
    payload: AdminOrderStatusUpdatePayload,
    authorization: Optional[str] = Header(default=None),
):
    admin = require_admin_session(authorization)
    sb = ensure_service_supabase()
    if not supports_table(sb, "orders"):
        raise HTTPException(status_code=503, detail="Orders table is not installed.")
    safe_order_id = order_id.strip()
    if not safe_order_id:
        raise HTTPException(status_code=400, detail="Missing order id.")
    if not supports_table(sb, "order_tracking") or not supports_table(sb, "order_tracking_events"):
        raise HTTPException(
            status_code=503,
            detail="Order tracking tables are not installed. Run backend/sql/supabase_phone_otp_schema.sql in Supabase first.",
        )

    order = fetch_order_by_id(sb, safe_order_id)
    resolved_order_id = str(order.get("id") or safe_order_id)
    user_id = str(order.get("user_id") or "")
    status = normalize_admin_order_status(payload.status)
    status_label = (payload.status_label or "").strip() or format_order_status(status)
    normalized_payment_status = normalize_admin_payment_status(payload.payment_status)
    estimated_delivery_at = (
        parse_optional_datetime(payload.estimated_delivery_at, "estimated_delivery_at")
        if payload.estimated_delivery_at is not None
        else None
    )

    existing_tracking: dict[str, Any] = {}
    try:
        tracking_res = sb.table("order_tracking").select("*").eq("order_id", resolved_order_id).limit(1).execute()
        if tracking_res.data:
            existing_tracking = tracking_res.data[0]
    except Exception as exc:
        logger.warning(f"Could not fetch existing tracking row for admin order status update {resolved_order_id}: {exc}")

    payment_intent: dict[str, Any] = {}
    if supports_table(sb, "payment_intents"):
        try:
            payment_res = (
                sb.table("payment_intents")
                .select(
                    "order_id,reference,provider,status,provider_status,cash_component,credit_applied,address,updated_at,created_at"
                )
                .eq("order_id", resolved_order_id)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            if payment_res.data:
                payment_intent = payment_res.data[0]
        except Exception as exc:
            logger.warning(f"Could not fetch payment intent for admin order status update {resolved_order_id}: {exc}")

    compensation = apply_order_terminal_compensation(
        sb,
        order=order,
        tracking=existing_tracking,
        payment_intent=payment_intent,
        next_status=status,
    )
    payment_status_value = (
        ("refunded" if compensation.get("applied") else None)
        or normalized_payment_status
        or normalize_admin_payment_status(str(existing_tracking.get("payment_status") or ""))
        or normalize_admin_payment_status(str(payment_intent.get("provider_status") or ""))
        or normalize_admin_payment_status(str(payment_intent.get("status") or ""))
        or "unknown"
    )

    now_iso = now_utc().isoformat()
    tracking_update = {
        "order_id": resolved_order_id,
        "user_id": user_id,
        "status": status,
        "status_label": status_label,
        "delivery_address": (
            payload.delivery_address.strip() or None
            if payload.delivery_address is not None
            else (existing_tracking.get("delivery_address") or payment_intent.get("address"))
        ),
        "payment_provider": existing_tracking.get("payment_provider") or payment_intent.get("provider"),
        "payment_reference": existing_tracking.get("payment_reference") or payment_intent.get("reference"),
        "payment_status": payment_status_value,
        "total_amount": round(to_float(existing_tracking.get("total_amount"), to_float(order.get("total_amount"))), 2),
        "credit_applied": round(
            to_float(existing_tracking.get("credit_applied"), to_float(payment_intent.get("credit_applied"))),
            2,
        ),
        "cash_component": round(
            to_float(existing_tracking.get("cash_component"), to_float(payment_intent.get("cash_component"))),
            2,
        ),
        "estimated_delivery_at": (
            estimated_delivery_at
            if payload.estimated_delivery_at is not None
            else existing_tracking.get("estimated_delivery_at")
        ),
        "updated_at": now_iso,
    }

    note = (payload.note or "").strip() or (
        f"Admin {admin['email']} changed order status to {format_order_status(status)}."
    )
    if compensation.get("applied"):
        restocked_units = int(compensation.get("restocked_units") or 0)
        credit_restored = round(to_float(compensation.get("credit_restored")), 2)
        note = (
            f"{note} Refund processed and inventory restocked ({restocked_units} unit(s), "
            f"credit restored GH₵{credit_restored:.2f})."
        )
    event = {
        "order_id": resolved_order_id,
        "user_id": user_id,
        "event_type": "admin_status_update",
        "status": status,
        "note": note,
        "event_time": now_iso,
    }

    try:
        sb.table("order_tracking").upsert(tracking_update, on_conflict="order_id").execute()
        sb.table("order_tracking_events").insert(event).execute()
    except Exception as exc:
        logger.error(f"Could not update admin order status for {resolved_order_id}: {exc}")
        raise HTTPException(status_code=500, detail="Could not update order status.")

    payment_reference = str(tracking_update.get("payment_reference") or "").strip()
    if normalized_payment_status and not compensation.get("applied") and payment_reference and supports_table(sb, "payment_intents"):
        try:
            update_payment_intent(sb, payment_reference, {"provider_status": normalized_payment_status})
        except Exception as exc:
            logger.warning(f"Could not update payment intent provider status for {payment_reference}: {exc}")

    customer_phone = resolve_user_phone_for_notifications(sb, user_id)
    user_sms_sent = False
    user_sms_reason = "phone_not_found"
    user_sms_phone_masked = None
    if customer_phone:
        user_sms_phone_masked = mask_phone(customer_phone)
        user_visible_note = (payload.note or "").strip()
        
        # Resolve descriptive items label
        items_label = resolve_order_items_description(sb, order.get("items") or [])
        
        sms_message = build_order_status_update_user_sms(
            order_id=resolved_order_id,
            status=status,
            items_label=items_label,
            note=user_visible_note,
        )
        try:
            dispatch_sms_message(customer_phone, sms_message, log_tag="ORDER_STATUS_USER_ALERT")
            user_sms_sent = True
            user_sms_reason = "queued" if OTP_SMS_ASYNC else "sent"
        except Exception as exc:
            user_sms_reason = f"sms_send_failed: {exc}"
            logger.error(
                f"Could not dispatch order status SMS to user {user_id} ({customer_phone}) for order {resolved_order_id}: {exc}"
            )

    updated_tracking = dict(tracking_update)
    try:
        refreshed_tracking = sb.table("order_tracking").select("*").eq("order_id", resolved_order_id).limit(1).execute()
        if refreshed_tracking.data:
            updated_tracking = refreshed_tracking.data[0]
    except Exception:
        pass

    audit_log(
        event_type="ADMIN_ORDER_STATUS_UPDATED",
        user_id=admin["email"],
        description=f"Order {resolved_order_id} moved to {status}.",
        metadata={
            "order_id": resolved_order_id,
            "status": status,
            "payment_status": payment_status_value,
            "updated_by": admin["email"],
            "compensation_applied": bool(compensation.get("applied")),
            "restocked_units": int(compensation.get("restocked_units") or 0),
            "credit_restored": round(to_float(compensation.get("credit_restored")), 2),
            "payment_refund_synced": bool(compensation.get("payment_refund_synced")),
        },
    )
    audit_log(
        event_type="ORDER_STATUS_USER_SMS_ALERT",
        user_id=user_id,
        description=(
            f"User SMS alert for order {resolved_order_id}: "
            f"{'sent' if user_sms_sent else 'not_sent'} ({user_sms_reason})."
        ),
        metadata={
            "order_id": resolved_order_id,
            "status": status,
            "updated_by": admin["email"],
            "sms_sent": user_sms_sent,
            "sms_reason": user_sms_reason,
            "phone_masked": user_sms_phone_masked,
        },
    )

    order_view = build_admin_order_response(
        order=order,
        tracking=updated_tracking,
        latest_event=event,
        payment_intent=payment_intent,
    )
    return {
        "status": "updated",
        "order": order_view,
        "event": event,
        "compensation": compensation,
        "user_sms_alert": {
            "sent": user_sms_sent,
            "reason": user_sms_reason,
            "phone_masked": user_sms_phone_masked,
        },
    }


@app.get("/api/admin/activity")
async def admin_list_activity(
    limit: int = 20,
    authorization: Optional[str] = Header(default=None),
):
    admin = require_admin_session(authorization)
    sb = ensure_service_supabase()
    safe_limit = max(1, min(limit, 100))
    cached_feed = get_cached_admin_activity_feed()
    if cached_feed is not None:
        return {
            "count": min(len(cached_feed), safe_limit),
            "activity": cached_feed[:safe_limit],
            "admin": {"name": admin["name"], "email": admin["email"]},
        }

    fetch_limit = 400

    feed: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    inventory_name_by_id: dict[str, str] = {}
    user_label_cache: dict[str, str] = {"system": "system"}

    def resolve_actor_label(raw_actor: Any) -> str:
        actor_id = str(raw_actor or "").strip()
        if not actor_id:
            return "system"
        if actor_id in user_label_cache:
            return user_label_cache[actor_id]
        if "@" in actor_id:
            user_label_cache[actor_id] = actor_id
            return actor_id
        display_name = resolve_user_display_name(actor_id)
        user_label_cache[actor_id] = display_name
        return display_name

    if supports_table(sb, "catalog"):
        try:
            inventory_rows = fetch_table_rows(
                sb,
                "catalog",
                "id,name",
                limit=5000,
                order_by="name",
                desc=False,
            )
            for row in inventory_rows:
                item_id = str(row.get("id") or "").strip()
                item_name = str(row.get("name") or "").strip()
                if item_id and item_name:
                    inventory_name_by_id[item_id] = item_name
        except Exception as exc:
            logger.warning(f"Could not preload catalog names for admin activity feed: {exc}")

    if supports_table(sb, "order_tracking_events"):
        try:
            order_events = fetch_table_rows(
                sb,
                "order_tracking_events",
                "order_id,user_id,event_type,status,note,event_time",
                limit=fetch_limit,
                order_by="event_time",
                desc=True,
            )
            for idx, row in enumerate(order_events):
                order_id = str(row.get("order_id") or "").strip()
                event_type = str(row.get("event_type") or "").strip().lower()
                normalized_status = normalize_tracking_status(str(row.get("status") or "ordered"))
                status_label = format_order_status(normalized_status)
                timestamp = row.get("event_time") or now_utc().isoformat()
                item_id = f"order:{order_id}:{event_type}:{timestamp}:{idx}"
                if item_id in seen_ids:
                    continue
                seen_ids.add(item_id)
                actor_id = str(row.get("user_id") or "").strip()
                actor_label = resolve_actor_label(actor_id)
                title = f"Order {order_id} updated"
                if event_type in {"admin_status_update", "distribution_status_update"}:
                    title = f"Order {order_id} moved to {status_label}"
                elif event_type in {"ordered", "payment_confirmed"}:
                    title = f"Order {order_id} created"
                elif event_type == "customer_follow_up":
                    title = f"{actor_label} requested follow-up for order {order_id}"
                note = str(row.get("note") or "").strip()
                level = "warn" if normalized_status in {"cancelled", "failed"} else "info"
                if event_type == "customer_follow_up":
                    level = "warn"
                feed.append(
                    {
                        "id": item_id,
                        "source": "orders",
                        "timestamp": timestamp,
                        "title": title,
                        "description": note or f"Order status is now {status_label}.",
                        "actor": actor_label,
                        "entity": "order",
                        "entity_id": order_id,
                        "level": level,
                        "metadata": {
                            "event_type": event_type,
                            "status": normalized_status,
                        },
                    }
                )
        except Exception as exc:
            logger.warning(f"Could not fetch admin order activity: {exc}")

    if supports_table(sb, "system_logs"):
        try:
            logs = fetch_table_rows(
                sb,
                "system_logs",
                "id,event_type,user_id,description,metadata,created_at",
                limit=fetch_limit,
                order_by="created_at",
                desc=True,
            )
            for idx, row in enumerate(logs):
                event_type = str(row.get("event_type") or "SYSTEM_EVENT").strip()
                event_key = event_type.lower()
                metadata = parse_json_object(row.get("metadata"))
                timestamp = row.get("created_at") or now_utc().isoformat()
                item_id = f"log:{row.get('id') or idx}:{timestamp}"
                if item_id in seen_ids:
                    continue
                seen_ids.add(item_id)

                entity = "system"
                entity_id = str(row.get("id") or "")
                if metadata.get("order_id"):
                    entity = "order"
                    entity_id = str(metadata.get("order_id"))
                elif metadata.get("item_id"):
                    entity = "inventory"
                    entity_id = str(metadata.get("item_id"))
                elif metadata.get("deal_id"):
                    entity = "deal"
                    entity_id = str(metadata.get("deal_id"))
                elif metadata.get("application_id"):
                    entity = "credit_application"
                    entity_id = str(metadata.get("application_id"))

                title = event_type.replace("_", " ").title()
                if event_key.startswith("admin_"):
                    title = event_type[6:].replace("_", " ").title()

                description = str(row.get("description") or "").strip() or "System event recorded."
                level = (
                    "warn"
                    if any(token in event_key for token in ("fail", "error", "reject", "cancel", "follow_up"))
                    else "info"
                )
                actor_raw = (
                    str(row.get("user_id") or "").strip()
                    or str(metadata.get("updated_by") or metadata.get("reviewer") or "").strip()
                    or "system"
                )
                actor = resolve_actor_label(actor_raw)

                if entity == "inventory" and entity_id:
                    item_name = inventory_name_by_id.get(entity_id, "").strip()
                    if item_name:
                        if event_key.startswith("admin_inventory_created"):
                            title = f"Inventory Created: {item_name}"
                        elif event_key.startswith("admin_inventory_updated"):
                            title = f"Inventory Updated: {item_name}"
                        elif event_key.startswith("admin_inventory_deleted"):
                            title = f"Inventory Deleted: {item_name}"
                        elif "inventory" in event_key:
                            title = f"{title}: {item_name}"

                        if item_name.lower() not in description.lower():
                            description = f"{description} Product: {item_name} ({entity_id})."

                feed.append(
                    {
                        "id": item_id,
                        "source": "logs",
                        "timestamp": timestamp,
                        "title": title,
                        "description": description,
                        "actor": actor,
                        "entity": entity,
                        "entity_id": entity_id,
                        "level": level,
                        "metadata": metadata,
                    }
                )
        except Exception as exc:
            logger.warning(f"Could not fetch admin system activity logs: {exc}")

    feed.sort(key=lambda item: parse_admin_activity_timestamp(item.get("timestamp")), reverse=True)
    set_cached_admin_activity_feed(feed)
    activity = feed[:safe_limit]
    return {
        "count": len(activity),
        "activity": activity,
        "admin": {"name": admin["name"], "email": admin["email"]},
    }


@app.get("/api/admin/notifications")
async def admin_list_notifications(
    limit: int = 25,
    include_info: bool = False,
    authorization: Optional[str] = Header(default=None),
):
    admin = require_admin_session(authorization)
    sb = ensure_service_supabase()
    safe_limit = max(1, min(limit, 100))
    cached_feed = get_cached_admin_notifications_feed(include_info)
    if cached_feed is not None:
        paged_cached = cached_feed[:safe_limit]
        return {
            "count": len(paged_cached),
            "notifications": paged_cached,
            "admin": {"name": admin["name"], "email": admin["email"]},
        }

    fetch_limit = 500
    now_iso = now_utc().isoformat()

    notifications: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    user_label_cache: dict[str, str] = {"system": "system"}

    def resolve_actor_label(raw_actor: Any) -> str:
        actor_id = str(raw_actor or "").strip()
        if not actor_id:
            return "system"
        if actor_id in user_label_cache:
            return user_label_cache[actor_id]
        if "@" in actor_id:
            user_label_cache[actor_id] = actor_id
            return actor_id
        display_name = resolve_user_display_name(actor_id)
        user_label_cache[actor_id] = display_name
        return display_name

    def append_notification(entry: dict[str, Any]):
        notif_id = str(entry.get("id") or "").strip()
        if not notif_id or notif_id in seen_ids:
            return
        seen_ids.add(notif_id)
        notifications.append(entry)

    if supports_table(sb, "order_tracking_events"):
        try:
            order_events = fetch_table_rows(
                sb,
                "order_tracking_events",
                "id,order_id,user_id,event_type,status,note,event_time",
                limit=fetch_limit,
                order_by="event_time",
                desc=True,
            )
            for idx, row in enumerate(order_events):
                order_id = str(row.get("order_id") or "").strip()
                event_id = str(row.get("id") or "").strip() or f"{order_id}:{idx}"
                event_type = str(row.get("event_type") or "").strip().lower()
                normalized_status = normalize_tracking_status(str(row.get("status") or "ordered"))
                status_label = format_order_status(normalized_status)
                timestamp = row.get("event_time") or now_iso
                note = str(row.get("note") or "").strip()
                actor = resolve_actor_label(str(row.get("user_id") or "").strip() or "system")

                level = "info"
                title = f"Order {order_id} updated"
                include_item = include_info
                if event_type == "customer_follow_up":
                    level = "warning"
                    title = f"{actor} requested follow-up for order {order_id}"
                    include_item = True
                elif event_type in {"admin_status_update", "distribution_status_update"}:
                    title = f"Order {order_id} moved to {status_label}"
                    if normalized_status in {"cancelled", "failed"}:
                        level = "error"
                        include_item = True
                    elif normalized_status == "delivered":
                        level = "success"
                        include_item = True
                elif event_type in {"ordered", "payment_confirmed"}:
                    title = f"Order {order_id} created"
                    level = "success"
                    include_item = True

                if not include_item:
                    continue

                append_notification(
                    {
                        "id": f"order-event:{event_id}",
                        "level": level,
                        "category": "ORDER",
                        "title": title,
                        "message": (
                            f"{actor}: {note}"
                            if (event_type == "customer_follow_up" and note)
                            else (note or f"Order status is now {status_label}.")
                        ),
                        "timestamp": timestamp,
                        "action_url": "/admin/orders",
                        "source": "orders",
                        "actor": actor,
                        "entity": "order",
                        "entity_id": order_id,
                        "metadata": {
                            "event_type": event_type,
                            "status": normalized_status,
                        },
                    }
                )
        except Exception as exc:
            logger.warning(f"Could not build order notifications: {exc}")

    if supports_credit_application_tables(sb):
        try:
            credit_rows = fetch_table_rows(
                sb,
                "credit_applications",
                "id,status,updated_at,created_at",
                limit=fetch_limit,
                order_by="updated_at",
                desc=True,
            )
            status_counts = {"submitted": 0, "under_review": 0, "pending_documents": 0}
            latest_by_status: dict[str, str] = {}
            for row in credit_rows:
                status = normalize_credit_application_status(row.get("status"))
                if status not in status_counts:
                    continue
                status_counts[status] += 1
                if status not in latest_by_status:
                    latest_by_status[status] = str(row.get("updated_at") or row.get("created_at") or now_iso)

            for status, count in status_counts.items():
                if count <= 0:
                    continue
                if status == "under_review" and not include_info:
                    continue
                level = "warning" if status in {"submitted", "pending_documents"} else "info"
                title = (
                    "Credit Applications Awaiting Review"
                    if status == "submitted"
                    else ("Credit Applications Waiting on Documents" if status == "pending_documents" else "Credit Applications Under Review")
                )
                message = (
                    f"{count} application(s) are awaiting first review."
                    if status == "submitted"
                    else (
                        f"{count} application(s) require customer document completion."
                        if status == "pending_documents"
                        else f"{count} application(s) are currently under review."
                    )
                )
                latest_ts = latest_by_status.get(status, now_iso)
                append_notification(
                    {
                        "id": f"credit-backlog:{status}:{count}:{latest_ts}",
                        "level": level,
                        "category": "CREDIT",
                        "title": title,
                        "message": message,
                        "timestamp": latest_ts,
                        "action_url": "/admin/credit",
                        "source": "credit",
                        "actor": "system",
                        "entity": "credit_application",
                        "entity_id": status,
                        "metadata": {
                            "status": status,
                            "count": count,
                        },
                    }
                )
        except Exception as exc:
            logger.warning(f"Could not build credit notifications: {exc}")

    if supports_table(sb, "system_logs"):
        try:
            log_rows = fetch_table_rows(
                sb,
                "system_logs",
                "id,event_type,user_id,description,metadata,created_at",
                limit=fetch_limit,
                order_by="created_at",
                desc=True,
            )
            for row in log_rows:
                log_id = str(row.get("id") or "").strip()
                event_type = str(row.get("event_type") or "").strip()
                event_key = event_type.lower()
                metadata = parse_json_object(row.get("metadata"))
                timestamp = str(row.get("created_at") or now_iso)

                is_error = any(token in event_key for token in ("fail", "error", "reject", "cancel"))
                # Low-stock alerts are intentionally excluded from notification feed.
                if "low_stock" in event_key:
                    continue
                is_warning = any(token in event_key for token in ("follow_up", "pending", "under_review"))
                is_success = any(token in event_key for token in ("approved", "delivered", "created", "completed"))
                if not include_info and not (is_error or is_warning or is_success):
                    continue
                level = "error" if is_error else ("warning" if is_warning else ("success" if is_success else "info"))

                entity = "system"
                entity_id = log_id
                category = "SYSTEM"
                if metadata.get("order_id"):
                    entity = "order"
                    entity_id = str(metadata.get("order_id"))
                    category = "ORDER"
                elif metadata.get("application_id"):
                    entity = "credit_application"
                    entity_id = str(metadata.get("application_id"))
                    category = "CREDIT"
                elif metadata.get("deal_id"):
                    entity = "deal"
                    entity_id = str(metadata.get("deal_id"))
                    category = "DEAL"
                elif metadata.get("item_id"):
                    entity = "inventory"
                    entity_id = str(metadata.get("item_id"))
                    category = "SYSTEM"

                title = event_type.replace("_", " ").title() if event_type else "System Event"
                if event_key.startswith("admin_"):
                    title = event_type[6:].replace("_", " ").title()
                description = str(row.get("description") or "").strip() or "System event recorded."
                actor = str(row.get("user_id") or "").strip() or "system"
                append_notification(
                    {
                        "id": f"log:{log_id or event_key}:{timestamp}",
                        "level": level,
                        "category": category,
                        "title": title,
                        "message": description,
                        "timestamp": timestamp,
                        "action_url": admin_entity_action_url(entity),
                        "source": "logs",
                        "actor": actor,
                        "entity": entity,
                        "entity_id": entity_id,
                        "metadata": metadata,
                    }
                )
        except Exception as exc:
            logger.warning(f"Could not build log notifications: {exc}")

    notifications.sort(key=lambda item: parse_admin_activity_timestamp(item.get("timestamp")), reverse=True)
    set_cached_admin_notifications_feed(include_info, notifications)
    paged = notifications[:safe_limit]
    return {
        "count": len(paged),
        "notifications": paged,
        "admin": {"name": admin["name"], "email": admin["email"]},
    }


@app.get("/api/admin/operations/customers")
async def admin_operations_customers(
    authorization: Optional[str] = Header(default=None),
    limit: int = 500,
    offset: int = 0,
    query: Optional[str] = None,
):
    require_admin_session(authorization)
    sb = ensure_service_supabase()
    safe_limit = max(1, min(limit, 2000))
    safe_offset = max(0, offset)
    needle = (query or "").strip().lower()

    auth_users = fetch_all_auth_users()
    rows_by_user: dict[str, dict[str, Any]] = {}

    def ensure_user_row(user_id: str) -> dict[str, Any]:
        row = rows_by_user.get(user_id)
        if row:
            return row
        fallback_name = f"User {user_id[:8]}" if user_id else "Unknown User"
        row = {
            "id": user_id,
            "full_name": fallback_name,
            "email": "",
            "phone": None,
            "credit_status": "not_applied",
            "credit_limit": 0.0,
            "available_credit": 0.0,
            "total_orders": 0,
            "total_spent": 0.0,
            "joined_at": now_utc().isoformat(),
            "_latest_credit_status": None,
            "_account_snapshot": {},
        }
        rows_by_user[user_id] = row
        return row

    for user in auth_users:
        user_id = str(user.get("id") or "").strip()
        if not user_id:
            continue
        email = str(user.get("email") or "").strip().lower()
        metadata = user.get("user_metadata") if isinstance(user.get("user_metadata"), dict) else {}
        full_name = (
            str(metadata.get("name") or metadata.get("full_name") or metadata.get("display_name") or "").strip()
            or (email.split("@", 1)[0] if email and "@" in email else "")
            or f"User {user_id[:8]}"
        )
        phone = str(user.get("phone") or metadata.get("phone") or "").strip() or None
        joined_at = str(user.get("created_at") or "").strip() or now_utc().isoformat()
        row = ensure_user_row(user_id)
        row["full_name"] = full_name
        row["email"] = email
        row["phone"] = phone
        row["joined_at"] = joined_at

    if supports_table(sb, "user_phone_verifications"):
        try:
            try:
                phone_rows = fetch_table_rows(
                    sb,
                    "user_phone_verifications",
                    "user_id,phone,created_at",
                    limit=20000,
                    order_by="created_at",
                    desc=True,
                )
            except Exception:
                phone_rows = fetch_table_rows(
                    sb,
                    "user_phone_verifications",
                    "user_id,phone,updated_at",
                    limit=20000,
                    order_by="updated_at",
                    desc=True,
                )
            for phone_row in phone_rows:
                user_id = str(phone_row.get("user_id") or "").strip()
                if not user_id:
                    continue
                row = ensure_user_row(user_id)
                phone = str(phone_row.get("phone") or "").strip()
                if phone and not row.get("phone"):
                    row["phone"] = phone
                created_at = str(phone_row.get("created_at") or phone_row.get("updated_at") or "").strip()
                if created_at and parse_admin_activity_timestamp(created_at) < parse_admin_activity_timestamp(row.get("joined_at")):
                    row["joined_at"] = created_at
        except Exception as exc:
            logger.warning(f"Could not enrich operations customers with verification phone data: {exc}")

    if supports_table(sb, "orders"):
        try:
            order_rows = fetch_table_rows(
                sb,
                "orders",
                "user_id,total_amount,created_at",
                limit=30000,
                order_by="created_at",
                desc=True,
            )
            for order in order_rows:
                user_id = str(order.get("user_id") or "").strip()
                if not user_id:
                    continue
                row = ensure_user_row(user_id)
                row["total_orders"] = int(row.get("total_orders") or 0) + 1
                row["total_spent"] = round(to_float(row.get("total_spent")) + to_float(order.get("total_amount")), 2)
                created_at = str(order.get("created_at") or "").strip()
                if created_at and parse_admin_activity_timestamp(created_at) < parse_admin_activity_timestamp(row.get("joined_at")):
                    row["joined_at"] = created_at
        except Exception as exc:
            logger.warning(f"Could not aggregate operations customer order metrics: {exc}")

    if supports_credit_application_tables(sb):
        try:
            app_rows = fetch_table_rows(
                sb,
                "credit_applications",
                "user_id,status,updated_at,created_at",
                limit=20000,
                order_by="updated_at",
                desc=True,
            )
            seen_latest_status: set[str] = set()
            for app in app_rows:
                user_id = str(app.get("user_id") or "").strip()
                if not user_id:
                    continue
                row = ensure_user_row(user_id)
                if user_id not in seen_latest_status:
                    row["_latest_credit_status"] = normalize_credit_application_status(app.get("status"))
                    seen_latest_status.add(user_id)
        except Exception as exc:
            logger.warning(f"Could not aggregate operations customer credit applications: {exc}")

    if supports_table(sb, "credit_accounts"):
        try:
            account_rows = fetch_table_rows(
                sb,
                "credit_accounts",
                (
                    "user_id,status,assigned_credit_limit,available_credit,consumed_credit,"
                    "assigned_limit,outstanding_balance,updated_at"
                ),
                limit=20000,
                order_by="updated_at",
                desc=True,
            )
            seen_accounts: set[str] = set()
            for account in account_rows:
                user_id = str(account.get("user_id") or "").strip()
                if not user_id or user_id in seen_accounts:
                    continue
                seen_accounts.add(user_id)
                row = ensure_user_row(user_id)
                snapshot = normalize_credit_account_snapshot(account)
                row["_account_snapshot"] = snapshot
                row["credit_limit"] = round(to_float(snapshot.get("assigned_credit_limit")), 2)
                row["available_credit"] = round(to_float(snapshot.get("available_credit")), 2)
                row["credit_status"] = normalize_operations_credit_status(
                    snapshot,
                    row.get("_latest_credit_status"),
                )
        except Exception as exc:
            logger.warning(f"Could not aggregate operations customer credit accounts: {exc}")

    customers = []
    for row in rows_by_user.values():
        row["credit_status"] = normalize_operations_credit_status(
            row.get("_account_snapshot"),
            row.get("_latest_credit_status"),
        )
        customers.append(
            {
                "id": row["id"],
                "full_name": row["full_name"],
                "email": row["email"],
                "phone": row["phone"],
                "credit_status": row["credit_status"],
                "credit_limit": round(to_float(row["credit_limit"]), 2),
                "available_credit": round(to_float(row["available_credit"]), 2),
                "total_orders": int(row["total_orders"]),
                "total_spent": round(to_float(row["total_spent"]), 2),
                "joined_at": row["joined_at"],
            }
        )

    customers.sort(key=lambda item: parse_admin_activity_timestamp(item.get("joined_at")), reverse=True)
    summary = {
        "total_users": len(customers),
        "active_credit_lines": sum(1 for customer in customers if customer["credit_status"] == "approved"),
        "total_orders": sum(int(customer["total_orders"]) for customer in customers),
    }

    if needle:
        filtered = []
        for customer in customers:
            haystack = " ".join(
                [
                    str(customer.get("full_name") or ""),
                    str(customer.get("email") or ""),
                    str(customer.get("phone") or ""),
                ]
            ).lower()
            if needle in haystack:
                filtered.append(customer)
    else:
        filtered = customers

    page = filtered[safe_offset : safe_offset + safe_limit]
    return {
        "customers": page,
        "total": len(filtered),
        "summary": summary,
        "limit": safe_limit,
        "offset": safe_offset,
    }


@app.get("/api/admin/operations/consignments")
async def admin_operations_consignments(
    authorization: Optional[str] = Header(default=None),
    limit: int = 200,
    offset: int = 0,
    status: Optional[str] = None,
):
    require_admin_session(authorization)
    sb = ensure_service_supabase()
    safe_limit = max(1, min(limit, 1000))
    safe_offset = max(0, offset)
    status_filter = normalize_consignment_status(status) if (status or "").strip() else None

    if not supports_table(sb, "consignment_requests"):
        return {
            "consignments": [],
            "summary": {"pending": 0, "approved_this_week": 0, "total": 0},
            "total": 0,
            "limit": safe_limit,
            "offset": safe_offset,
        }

    query = sb.table("consignment_requests").select("*").order("created_at", desc=True)
    if status_filter:
        query = query.eq("status", status_filter)
    rows = query.range(safe_offset, safe_offset + safe_limit - 1).execute().data or []

    summary_rows = fetch_table_rows(
        sb,
        "consignment_requests",
        "id,status,reviewed_at",
        limit=5000,
        order_by="created_at",
        desc=True,
    )
    week_ago = now_utc() - timedelta(days=7)
    pending = 0
    approved_this_week = 0
    for row in summary_rows:
        status_value = normalize_consignment_status(row.get("status"))
        if status_value == "pending":
            pending += 1
        if status_value == "approved":
            reviewed_at = parse_admin_activity_timestamp(row.get("reviewed_at"))
            if reviewed_at >= week_ago:
                approved_this_week += 1

    user_name_cache: dict[str, str] = {}
    user_phone_cache: dict[str, Optional[str]] = {}
    consignments: list[dict[str, Any]] = []
    for row in rows:
        user_id = str(row.get("user_id") or "").strip()
        raw_name = str(row.get("farmer_name") or "").strip()
        raw_phone = str(row.get("farmer_phone") or "").strip()
        if user_id and user_id not in user_name_cache:
            user_name_cache[user_id] = resolve_user_display_name(user_id)
        if user_id and user_id not in user_phone_cache:
            user_phone_cache[user_id] = resolve_user_phone_for_notifications(sb, user_id)
        consignments.append(
            build_admin_consignment_response(
                row,
                farmer_name=raw_name or user_name_cache.get(user_id) or "Farmer",
                farmer_phone=raw_phone or user_phone_cache.get(user_id),
            )
        )

    return {
        "consignments": consignments,
        "summary": {
            "pending": pending,
            "approved_this_week": approved_this_week,
            "total": len(summary_rows),
        },
        "total": len(summary_rows),
        "limit": safe_limit,
        "offset": safe_offset,
    }


@app.post("/api/admin/operations/consignments/{consignment_id}/approve")
async def admin_operations_approve_consignment(
    consignment_id: str,
    payload: Optional[AdminConsignmentApprovePayload] = None,
    authorization: Optional[str] = Header(default=None),
):
    admin = require_admin_session(authorization)
    sb = ensure_service_supabase()
    if not supports_table(sb, "consignment_requests"):
        raise HTTPException(status_code=503, detail="Consignment queue is not configured.")

    safe_id = consignment_id.strip()
    if not safe_id:
        raise HTTPException(status_code=400, detail="Missing consignment id.")

    lookup = sb.table("consignment_requests").select("*").eq("id", safe_id).limit(1).execute().data or []
    if not lookup:
        raise HTTPException(status_code=404, detail="Consignment request not found.")
    row = lookup[0]
    user_id = str(row.get("user_id") or "").strip()
    product_label = build_consignment_item_label(row.get("product_name"), row.get("product_category"))
    now_iso = now_utc().isoformat()
    approved_deal_id = str(payload.approved_deal_id if payload else "").strip() or None

    update_payload: dict[str, Any] = {
        "status": "approved",
        "rejection_reason": None,
        "reviewed_at": now_iso,
        "reviewer": admin["email"],
        "updated_at": now_iso,
    }
    if approved_deal_id:
        update_payload["approved_deal_id"] = approved_deal_id

    sb.table("consignment_requests").update(update_payload).eq("id", safe_id).execute()
    updated = sb.table("consignment_requests").select("*").eq("id", safe_id).limit(1).execute().data[0]

    sms_alert = notify_user_consignment_status_sms(
        sb=sb,
        user_id=user_id,
        consignment_id=safe_id,
        status="approved",
        product_label=product_label,
    )
    audit_log(
        event_type="ADMIN_CONSIGNMENT_APPROVED",
        user_id=admin["email"],
        description=f"Consignment {safe_id} approved.",
        metadata={
            "consignment_id": safe_id,
            "user_id": user_id,
            "approved_deal_id": approved_deal_id,
            "sms_sent": sms_alert["sent"],
            "sms_reason": sms_alert["reason"],
        },
    )

    return {
        "status": "approved",
        "consignment": build_admin_consignment_response(
            updated,
            farmer_name=resolve_user_display_name(user_id),
            farmer_phone=resolve_user_phone_for_notifications(sb, user_id),
        ),
        "user_sms_alert": sms_alert,
        "admin": {"name": admin["name"], "email": admin["email"]},
    }


@app.post("/api/admin/operations/consignments/{consignment_id}/reject")
async def admin_operations_reject_consignment(
    consignment_id: str,
    payload: AdminConsignmentRejectPayload,
    authorization: Optional[str] = Header(default=None),
):
    admin = require_admin_session(authorization)
    sb = ensure_service_supabase()
    if not supports_table(sb, "consignment_requests"):
        raise HTTPException(status_code=503, detail="Consignment queue is not configured.")

    safe_id = consignment_id.strip()
    if not safe_id:
        raise HTTPException(status_code=400, detail="Missing consignment id.")

    lookup = sb.table("consignment_requests").select("*").eq("id", safe_id).limit(1).execute().data or []
    if not lookup:
        raise HTTPException(status_code=404, detail="Consignment request not found.")
    row = lookup[0]
    user_id = str(row.get("user_id") or "").strip()
    product_label = build_consignment_item_label(row.get("product_name"), row.get("product_category"))
    reason = payload.reason.strip()
    now_iso = now_utc().isoformat()

    update_payload: dict[str, Any] = {
        "status": "rejected",
        "rejection_reason": reason,
        "approved_deal_id": None,
        "reviewed_at": now_iso,
        "reviewer": admin["email"],
        "updated_at": now_iso,
    }
    sb.table("consignment_requests").update(update_payload).eq("id", safe_id).execute()
    updated = sb.table("consignment_requests").select("*").eq("id", safe_id).limit(1).execute().data[0]

    sms_alert = notify_user_consignment_status_sms(
        sb=sb,
        user_id=user_id,
        consignment_id=safe_id,
        status="rejected",
        product_label=product_label,
        reason=reason,
    )
    audit_log(
        event_type="ADMIN_CONSIGNMENT_REJECTED",
        user_id=admin["email"],
        description=f"Consignment {safe_id} rejected.",
        metadata={
            "consignment_id": safe_id,
            "user_id": user_id,
            "reason": reason,
            "sms_sent": sms_alert["sent"],
            "sms_reason": sms_alert["reason"],
        },
    )

    return {
        "status": "rejected",
        "consignment": build_admin_consignment_response(
            updated,
            farmer_name=resolve_user_display_name(user_id),
            farmer_phone=resolve_user_phone_for_notifications(sb, user_id),
        ),
        "user_sms_alert": sms_alert,
        "admin": {"name": admin["name"], "email": admin["email"]},
    }


@app.post("/api/consignments")
async def create_consignment_request(payload: ConsignmentCreatePayload):
    sb = ensure_service_supabase()
    if not supports_table(sb, "consignment_requests"):
        raise HTTPException(status_code=503, detail="Consignment queue is not configured.")

    user_id = payload.userId.strip()
    if not user_id:
        raise HTTPException(status_code=400, detail="Missing userId in request body.")

    now_iso = now_utc().isoformat()
    normalized_unit = normalize_consignment_unit(payload.unit)
    product_category = str(payload.product_category or "").strip().lower()
    if not product_category:
        raise HTTPException(status_code=400, detail="product_category is required.")

    product_name = str(payload.product_name or "").strip() or None
    farmer_phone = resolve_user_phone_for_notifications(sb, user_id)
    farmer_name = resolve_user_display_name(user_id)

    base_row = {
        "user_id": user_id,
        "product_category": product_category,
        "product_name": product_name,
        "quantity": round(to_float(payload.quantity), 2),
        "unit": normalized_unit,
        "expected_price": round(to_float(payload.expected_price), 2),
        "status": "pending",
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    insert_row = {**base_row, "farmer_phone": farmer_phone, "farmer_name": farmer_name}
    created: Optional[dict[str, Any]] = None
    try:
        response = sb.table("consignment_requests").insert(insert_row).execute()
        created = response.data[0] if response.data else None
    except Exception:
        response = sb.table("consignment_requests").insert(base_row).execute()
        created = response.data[0] if response.data else None

    if not created:
        raise HTTPException(status_code=500, detail="Could not create consignment request.")

    consignment_id = str(created.get("id") or "")
    product_label = build_consignment_item_label(product_name, product_category)
    admin_sms_alert = notify_admins_consignment_submitted_sms(
        consignment_id=consignment_id,
        user_id=user_id,
        quantity=payload.quantity,
        unit=normalized_unit,
        product_label=product_label,
        expected_price=payload.expected_price,
    )
    audit_log(
        event_type="CONSIGNMENT_REQUEST_SUBMITTED",
        user_id=user_id,
        description=f"Consignment request {consignment_id} submitted.",
        metadata={
            "consignment_id": consignment_id,
            "product_category": product_category,
            "product_name": product_name,
            "quantity": round(to_float(payload.quantity), 2),
            "unit": normalized_unit,
            "expected_price": round(to_float(payload.expected_price), 2),
            "admin_alert_attempted": admin_sms_alert["attempted"],
            "admin_alert_queued": admin_sms_alert["queued"],
            "admin_alert_failed": admin_sms_alert["failed"],
        },
    )

    return {
        "status": "submitted",
        "consignment": build_admin_consignment_response(
            created,
            farmer_name=farmer_name,
            farmer_phone=farmer_phone,
        ),
        "admin_sms_alert": admin_sms_alert,
    }


@app.get("/api/admin/system-summary")
async def admin_system_summary(authorization: Optional[str] = Header(default=None)):
    admin = require_admin_session(authorization)
    cached_payload = get_cached_admin_summary_payload()
    if cached_payload:
        return {
            **cached_payload,
            "admin": {"name": admin["name"], "email": admin["email"]},
        }

    sb = ensure_service_supabase()
    now = now_utc()
    seven_days_ago = now - timedelta(days=7)
    twenty_four_hours_ago = now - timedelta(hours=24)
    low_stock_threshold = 20

    summary: dict[str, Any] = {
        "inventory": {
            "items": 0,
            "total_units": 0,
            "total_value": 0.0,
            "low_stock_items": 0,
            "seed_units": 0,
            "fertilizer_units": 0,
            "low_stock_threshold": low_stock_threshold,
        },
        "deals": {
            "total": 0,
            "active": 0,
            "draft": 0,
            "closed": 0,
            "cancelled": 0,
            "avg_active_progress": 0,
            "total_joined_quantity": 0,
        },
        "orders": {
            "total": 0,
            "last_7_days": 0,
            "gross_value": 0.0,
            "status_breakdown": {
                "ordered": 0,
                "pending": 0,
                "in_transit": 0,
                "delivered": 0,
                "cancelled": 0,
                "other": 0,
            },
        },
        "credit_applications": {
            "total": 0,
            "submitted": 0,
            "under_review": 0,
            "pending_documents": 0,
            "approved": 0,
            "rejected": 0,
        },
        "credit_accounts": {
            "total": 0,
            "approved": 0,
            "assigned_limit_total": 0.0,
            "available_credit_total": 0.0,
            "consumed_credit_total": 0.0,
        },
        "payments": {
            "total_intents": 0,
            "pending": 0,
            "completed": 0,
            "failed": 0,
            "cash_component_total": 0.0,
        },
        "system_logs": {
            "total": 0,
            "last_24_hours": 0,
        },
        "modules": {
            "aggregate_deals_ready": supports_aggregate_deals_tables(sb),
            "credit_ready": supports_credit_application_tables(sb),
            "orders_ready": supports_table(sb, "orders"),
            "payments_ready": supports_table(sb, "payment_intents"),
            "logs_ready": supports_table(sb, "system_logs"),
        },
    }

    try:
        inventory_rows = fetch_table_rows(
            sb,
            "catalog",
            "id,type,stock,price",
            order_by="name",
            desc=False,
        )
        total_units = 0
        total_value = 0.0
        seed_units = 0
        fertilizer_units = 0
        low_stock_items = 0
        for row in inventory_rows:
            stock = max(to_int(row.get("stock")), 0)
            price = round(to_float(row.get("price")), 2)
            item_type = str(row.get("type") or "").strip().upper()
            total_units += stock
            total_value += stock * price
            if item_type == "SEED":
                seed_units += stock
            elif item_type == "FERTILIZER":
                fertilizer_units += stock
            if stock <= low_stock_threshold:
                low_stock_items += 1
        summary["inventory"] = {
            **summary["inventory"],
            "items": len(inventory_rows),
            "total_units": total_units,
            "total_value": round(total_value, 2),
            "low_stock_items": low_stock_items,
            "seed_units": seed_units,
            "fertilizer_units": fertilizer_units,
        }
    except Exception as exc:
        logger.warning(f"Could not build inventory summary: {exc}")

    if summary["modules"]["aggregate_deals_ready"]:
        try:
            deal_rows = fetch_table_rows(
                sb,
                "aggregate_deals",
                "id,status,current_quantity,target_quantity",
                order_by="created_at",
                desc=True,
            )
            active_progress_total = 0.0
            active_count = 0
            joined_total = 0
            status_count = {"active": 0, "draft": 0, "closed": 0, "cancelled": 0}
            for row in deal_rows:
                status = str(row.get("status") or "").strip().lower()
                if status in status_count:
                    status_count[status] += 1
                joined_total += max(to_int(row.get("current_quantity")), 0)
                if status == "active":
                    target = max(to_int(row.get("target_quantity")), 0)
                    current = max(to_int(row.get("current_quantity")), 0)
                    if target > 0:
                        active_progress_total += min((current / target) * 100.0, 100.0)
                    active_count += 1
            avg_progress = round(active_progress_total / active_count) if active_count > 0 else 0
            summary["deals"] = {
                "total": len(deal_rows),
                "active": status_count["active"],
                "draft": status_count["draft"],
                "closed": status_count["closed"],
                "cancelled": status_count["cancelled"],
                "avg_active_progress": avg_progress,
                "total_joined_quantity": joined_total,
            }
        except Exception as exc:
            logger.warning(f"Could not build aggregate deals summary: {exc}")

    tracking_rows_for_summary: list[dict[str, Any]] = []
    if supports_table(sb, "order_tracking"):
        try:
            tracking_rows_for_summary = fetch_table_rows(
                sb,
                "order_tracking",
                "order_id,status",
                order_by="updated_at",
                desc=True,
            )
        except Exception as exc:
            logger.warning(f"Could not fetch order tracking rows for system summary: {exc}")

    if summary["modules"]["orders_ready"]:
        try:
            order_rows = fetch_table_rows(
                sb,
                "orders",
                "id,total_amount,created_at",
                order_by="created_at",
                desc=True,
            )
            recent_orders = 0
            gross_value = 0.0
            non_revenue_order_ids = {
                str(row.get("order_id") or "").strip()
                for row in tracking_rows_for_summary
                if normalize_tracking_status(str(row.get("status") or "ordered")) in ORDER_NON_REVENUE_STATUSES
            }
            for row in order_rows:
                order_id = str(row.get("id") or "").strip()
                if order_id not in non_revenue_order_ids:
                    gross_value += to_float(row.get("total_amount"))
                created_at_raw = row.get("created_at")
                if created_at_raw:
                    try:
                        if parse_db_timestamp(str(created_at_raw)) >= seven_days_ago:
                            recent_orders += 1
                    except Exception:
                        pass
            summary["orders"]["total"] = len(order_rows)
            summary["orders"]["last_7_days"] = recent_orders
            summary["orders"]["gross_value"] = round(gross_value, 2)
        except Exception as exc:
            logger.warning(f"Could not build orders summary: {exc}")

    if tracking_rows_for_summary:
        try:
            status_map = summary["orders"]["status_breakdown"]
            for row in tracking_rows_for_summary:
                status = str(row.get("status") or "").strip().lower()
                if status in {"ordered", "pending"}:
                    status_map["ordered" if status == "ordered" else "pending"] += 1
                elif status in {"in_transit", "en_route", "out_for_delivery"}:
                    status_map["in_transit"] += 1
                elif status in {"delivered"}:
                    status_map["delivered"] += 1
                elif status in {"cancelled", "failed"}:
                    status_map["cancelled"] += 1
                else:
                    status_map["other"] += 1
        except Exception as exc:
            logger.warning(f"Could not build order status breakdown: {exc}")

    if summary["modules"]["credit_ready"]:
        try:
            app_rows = fetch_table_rows(sb, "credit_applications", "id,status", order_by="created_at", desc=True)
            counts = {
                "submitted": 0,
                "under_review": 0,
                "pending_documents": 0,
                "approved": 0,
                "rejected": 0,
            }
            for row in app_rows:
                status = str(row.get("status") or "").strip().lower()
                if status in counts:
                    counts[status] += 1
            summary["credit_applications"] = {
                "total": len(app_rows),
                **counts,
            }
        except Exception as exc:
            logger.warning(f"Could not build credit application summary: {exc}")

    if supports_table(sb, "credit_accounts"):
        try:
            account_rows = fetch_table_rows(
                sb,
                "credit_accounts",
                "user_id,status,assigned_credit_limit,available_credit,consumed_credit,assigned_limit,outstanding_balance,last_score,creditworthiness",
                order_by="updated_at",
                desc=True,
            )
            approved = 0
            assigned = 0.0
            available = 0.0
            consumed = 0.0
            seen_user_ids: set[str] = set()
            counted_accounts = 0
            for row in account_rows:
                user_id = str(row.get("user_id") or "").strip()
                if user_id:
                    if user_id in seen_user_ids:
                        continue
                    seen_user_ids.add(user_id)

                snapshot = normalize_credit_account_snapshot(row)
                if is_credit_account_spendable(snapshot.get("status")):
                    approved += 1
                assigned += to_float(snapshot.get("assigned_credit_limit"))
                available += to_float(snapshot.get("available_credit"))
                consumed += to_float(snapshot.get("consumed_credit"))
                counted_accounts += 1
            summary["credit_accounts"] = {
                "total": counted_accounts,
                "approved": approved,
                "assigned_limit_total": round(assigned, 2),
                "available_credit_total": round(available, 2),
                "consumed_credit_total": round(consumed, 2),
            }
        except Exception as exc:
            logger.warning(f"Could not build credit account summary: {exc}")

    if summary["modules"]["payments_ready"]:
        try:
            payment_rows = fetch_table_rows(
                sb,
                "payment_intents",
                "id,status,cash_component",
                order_by="created_at",
                desc=True,
            )
            pending = 0
            completed = 0
            failed = 0
            cash_component_total = 0.0
            failed_statuses = set(BULK_INTENT_TERMINAL_STATUSES) - {"completed"}
            for row in payment_rows:
                status = str(row.get("status") or "").strip().lower()
                cash_component_total += to_float(row.get("cash_component"))
                if status == "completed":
                    completed += 1
                elif status in failed_statuses or status in {"failed"}:
                    failed += 1
                else:
                    pending += 1
            summary["payments"] = {
                "total_intents": len(payment_rows),
                "pending": pending,
                "completed": completed,
                "failed": failed,
                "cash_component_total": round(cash_component_total, 2),
            }
        except Exception as exc:
            logger.warning(f"Could not build payment summary: {exc}")

    if summary["modules"]["logs_ready"]:
        try:
            log_rows = fetch_table_rows(
                sb,
                "system_logs",
                "id,created_at",
                order_by="created_at",
                desc=True,
            )
            recent_logs = 0
            for row in log_rows:
                created_at_raw = row.get("created_at")
                if not created_at_raw:
                    continue
                try:
                    if parse_db_timestamp(str(created_at_raw)) >= twenty_four_hours_ago:
                        recent_logs += 1
                except Exception:
                    continue
            summary["system_logs"]["total"] = len(log_rows)
            summary["system_logs"]["last_24_hours"] = recent_logs
        except Exception as exc:
            logger.warning(f"Could not build system log summary: {exc}")

    payload = {
        "timestamp": now.isoformat(),
        "summary": summary,
    }
    set_cached_admin_summary_payload(payload)
    return {
        **payload,
        "admin": {"name": admin["name"], "email": admin["email"]},
    }


@app.get("/api/deals/aggregate")
async def list_aggregate_deals(include_closed: bool = False, user_id: Optional[str] = None):
    sb = ensure_service_supabase()
    if not supports_aggregate_deals_tables(sb):
        return {"count": 0, "deals": []}

    query = (
        sb.table("aggregate_deals")
        .select("*")
        .eq("deal_type", "bulk")
        .order("created_at", desc=True)
        .limit(100)
    )
    if not include_closed:
        query = query.eq("status", "active")
    data = query.execute().data or []
    decorated = [decorate_aggregate_deal(row) for row in data]
    if not include_closed:
        decorated = [row for row in decorated if not row.get("is_expired")]
    if user_id and user_id.strip():
        attach_user_bulk_deal_state(sb, decorated, user_id.strip())
    return {"count": len(decorated), "deals": decorated}


@app.post("/api/deals/aggregate/{deal_id}/join")
async def join_aggregate_bulk_deal(deal_id: str, payload: AggregateDealJoinPayload):
    ensure_paystack_config()
    sb = ensure_service_supabase()
    if not supports_aggregate_deals_tables(sb):
        raise HTTPException(status_code=503, detail="Aggregate deal feature is not available yet.")

    user_id = payload.user_id.strip()
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id is required.")
    email = normalize_email(payload.email)
    safe_id = deal_id.strip()
    deal_res = sb.table("aggregate_deals").select("*").eq("id", safe_id).limit(1).execute()
    if not deal_res.data:
        raise HTTPException(status_code=404, detail="Aggregate deal not found.")
    deal = decorate_aggregate_deal(deal_res.data[0])

    if deal["deal_type"] != "bulk":
        raise HTTPException(status_code=400, detail="This deal does not accept bulk joins.")
    if deal["status"] != "active" or deal["is_expired"]:
        raise HTTPException(status_code=400, detail="This deal is no longer active.")

    existing_paid = (
        sb.table("aggregate_deal_participants")
        .select("id")
        .eq("deal_id", safe_id)
        .eq("user_id", user_id)
        .eq("join_type", "bulk_join")
        .limit(1)
        .execute()
    )
    if existing_paid.data:
        raise HTTPException(status_code=409, detail="You already secured a slot for this bulk buy.")

    existing_pending = find_active_bulk_intent_for_user_deal(sb, user_id, safe_id)
    if existing_pending and existing_pending.get("provider_authorization_url"):
        return {
            "status": "pending_payment",
            "payment_required": True,
            "deal": deal,
            "reference": str(existing_pending.get("reference") or ""),
            "authorization_url": existing_pending.get("provider_authorization_url"),
            "expires_at": existing_pending.get("bulk_expires_at"),
            "quantity": int(existing_pending.get("bulk_quantity") or 0),
            "message": "Payment pending. Complete payment within 1 hour to secure your slot.",
        }

    min_join = int(deal.get("min_join_quantity") or 1)
    max_join = deal.get("max_join_quantity")
    if payload.quantity < min_join:
        raise HTTPException(status_code=400, detail=f"Minimum join quantity is {min_join}.")
    if max_join is not None and payload.quantity > int(max_join):
        raise HTTPException(status_code=400, detail=f"Maximum join quantity is {int(max_join)}.")

    target_quantity = deal.get("target_quantity")
    current_quantity = int(deal.get("current_quantity") or 0)
    if target_quantity is not None and current_quantity >= int(target_quantity):
        raise HTTPException(status_code=409, detail="This bulk buy is already full.")
    if target_quantity is not None and current_quantity + int(payload.quantity) > int(target_quantity):
        remaining = max(int(target_quantity) - current_quantity, 0)
        raise HTTPException(status_code=409, detail=f"Only {remaining} slot(s) left in this bulk buy.")

    deal_price = round(to_float(deal.get("deal_price"), to_float(deal.get("base_price"))), 2)
    amount_due = round(deal_price * int(payload.quantity), 2)
    if amount_due <= 0:
        raise HTTPException(status_code=400, detail="Invalid bulk payment amount.")

    now = now_utc()
    expires_at = now + timedelta(minutes=BULK_PAYMENT_HOLD_MINUTES)
    reference = generate_payment_reference()
    callback_url = (payload.callback_url or PAYSTACK_CALLBACK_URL_RUNTIME or "").strip() or None
    provider_payload_meta = {
        "flow": "aggregate_bulk",
        "deal_id": safe_id,
        "quantity": int(payload.quantity),
        "expires_at": expires_at.isoformat(),
        "deal_title": str(deal.get("title") or ""),
    }

    try:
        sb.table("payment_intents").insert(
            {
                "reference": reference,
                "provider": "paystack",
                "status": "initialized",
                "user_id": user_id,
                "email": email,
                "address": "Bulk deal checkout",
                "total_amount": amount_due,
                "cash_component": amount_due,
                "credit_applied": 0,
                "credit_score": 0,
                "credit_limit": 0,
                "items": [{"id": f"bulk:{safe_id}", "quantity": int(payload.quantity), "price": deal_price}],
                "provider_payload": provider_payload_meta,
            }
        ).execute()
    except Exception as exc:
        logger.error(f"Could not persist aggregate deal payment intent ({reference}): {exc}")
        raise HTTPException(status_code=500, detail="Could not initialize bulk payment.")

    paystack_payload: dict[str, Any] = {
        "email": email,
        "amount": cents_from_amount(amount_due),
        "reference": reference,
        "metadata": {
            "flow": "aggregate_bulk",
            "deal_id": safe_id,
            "user_id": user_id,
            "quantity": int(payload.quantity),
            "amount_due": amount_due,
            "expires_at": expires_at.isoformat(),
        },
    }
    if callback_url:
        paystack_payload["callback_url"] = callback_url

    try:
        response = httpx.post(
            f"{PAYSTACK_BASE_URL.rstrip('/')}/transaction/initialize",
            json=paystack_payload,
            headers={"Authorization": f"Bearer {PAYSTACK_SECRET_KEY}"},
            timeout=25.0,
        )
        result = response.json()
    except Exception as exc:
        logger.error(f"Bulk Paystack initialization crashed ({reference}): {exc}")
        try:
            update_payment_intent(sb, reference, {"status": "initialize_failed", "provider_status": "request_error"})
        except Exception:
            pass
        raise HTTPException(status_code=502, detail="Could not reach Paystack for bulk payment initialization.")

    if response.status_code >= 300 or not result.get("status"):
        message = result.get("message") or "Bulk payment initialization failed."
        try:
            update_payment_intent(
                sb,
                reference,
                {"status": "initialize_failed", "provider_status": "failed", "provider_payload": result},
            )
        except Exception:
            pass
        raise HTTPException(status_code=502, detail=message)

    provider_data = result.get("data") or {}
    authorization_url = provider_data.get("authorization_url")
    access_code = provider_data.get("access_code")
    if not authorization_url:
        try:
            update_payment_intent(
                sb,
                reference,
                {
                    "status": "initialize_failed",
                    "provider_status": "missing_authorization_url",
                    "provider_payload": result,
                },
            )
        except Exception:
            pass
        raise HTTPException(status_code=502, detail="Paystack did not return an authorization URL.")

    try:
        update_payment_intent(
            sb,
            reference,
            {
                "status": "pending_user_authorization",
                "provider_status": "initialized",
                "provider_access_code": access_code,
                "provider_authorization_url": authorization_url,
                "provider_payload": {**provider_payload_meta, "provider": result},
            },
        )
    except Exception as exc:
        logger.warning(f"Could not update bulk intent metadata ({reference}): {exc}")

    return {
        "status": "pending_payment",
        "payment_required": True,
        "deal": deal,
        "reference": reference,
        "authorization_url": authorization_url,
        "expires_at": expires_at.isoformat(),
        "quantity": int(payload.quantity),
        "amount_due": amount_due,
        "message": "Payment pending. Complete payment within 1 hour to secure your slot.",
    }


@app.post("/api/deals/aggregate/payments/verify")
async def verify_aggregate_bulk_payment(payload: PaystackVerifyPayload):
    ensure_paystack_config()
    sb = ensure_service_supabase()

    reference = payload.reference.strip()
    if not reference:
        raise HTTPException(status_code=400, detail="Payment reference is required.")

    intent = get_payment_intent_by_reference(sb, reference)
    if not intent:
        raise HTTPException(status_code=404, detail="Bulk payment intent not found for the provided reference.")

    metadata = extract_bulk_intent_metadata(intent)
    if not metadata:
        raise HTTPException(status_code=400, detail="This payment reference is not for a bulk buy.")

    existing_order_id = intent.get("order_id")
    if existing_order_id:
        return {
            "status": "success",
            "orderId": str(existing_order_id),
            "reference": reference,
            "already_processed": True,
        }

    expires_at = get_bulk_intent_expiry(intent)
    if now_utc() >= expires_at:
        try:
            update_payment_intent(sb, reference, {"status": "expired", "provider_status": "expired"})
        except Exception:
            pass
        raise HTTPException(status_code=410, detail="Payment window expired. Start the bulk buy payment again.")

    try:
        response = httpx.get(
            f"{PAYSTACK_BASE_URL.rstrip('/')}/transaction/verify/{reference}",
            headers={"Authorization": f"Bearer {PAYSTACK_SECRET_KEY}"},
            timeout=25.0,
        )
        result = response.json()
    except Exception as exc:
        logger.error(f"Bulk Paystack verification crashed ({reference}): {exc}")
        raise HTTPException(status_code=502, detail="Could not verify payment with Paystack.")

    if response.status_code >= 300 or not result.get("status"):
        message = result.get("message") or "Paystack payment verification failed."
        try:
            update_payment_intent(
                sb,
                reference,
                {"status": "verification_failed", "provider_status": "verification_failed", "verify_payload": result},
            )
        except Exception:
            pass
        raise HTTPException(status_code=400, detail=message)

    tx_data = result.get("data") or {}
    tx_status = str(tx_data.get("status") or "").lower()
    amount_paid = amount_from_cents(int(tx_data.get("amount") or 0))
    expected_cash = float(intent.get("cash_component") or 0)

    if tx_status != "success":
        try:
            update_payment_intent(
                sb,
                reference,
                {"status": "payment_not_successful", "provider_status": tx_status or "unknown", "verify_payload": tx_data},
            )
        except Exception:
            pass
        raise HTTPException(status_code=400, detail=f"Payment is not successful (status: {tx_status or 'unknown'}).")

    if amount_paid + 0.01 < expected_cash:
        try:
            update_payment_intent(
                sb,
                reference,
                {"status": "payment_amount_mismatch", "provider_status": tx_status, "verify_payload": tx_data},
            )
        except Exception:
            pass
        raise HTTPException(status_code=400, detail="Verified payment amount is lower than expected amount.")

    safe_id = metadata["deal_id"]
    quantity = int(metadata["quantity"])
    if quantity <= 0:
        raise HTTPException(status_code=400, detail="Invalid paid quantity for this bulk payment.")

    deal_res = sb.table("aggregate_deals").select("*").eq("id", safe_id).limit(1).execute()
    if not deal_res.data:
        raise HTTPException(status_code=404, detail="Bulk deal was not found.")
    deal = decorate_aggregate_deal(deal_res.data[0])
    if deal["status"] != "active" or deal["is_expired"]:
        raise HTTPException(status_code=409, detail="Bulk deal is no longer active.")

    target_quantity = deal.get("target_quantity")
    current_quantity = int(deal.get("current_quantity") or 0)
    if target_quantity is not None and current_quantity + quantity > int(target_quantity):
        try:
            update_payment_intent(
                sb,
                reference,
                {"status": "capacity_full_post_payment", "provider_status": tx_status, "verify_payload": tx_data},
            )
        except Exception:
            pass
        raise HTTPException(
            status_code=409,
            detail="Bulk deal filled up before your payment completed. Contact support for refund handling.",
        )

    user_id = str(intent.get("user_id") or "").strip()
    if not user_id:
        raise HTTPException(status_code=500, detail="Bulk payment intent has no user.")

    now_iso = now_utc().isoformat()
    try:
        sb.table("aggregate_deal_participants").insert(
            {
                "deal_id": safe_id,
                "user_id": user_id,
                "join_type": "bulk_join",
                "quantity": quantity,
                "bid_amount": None,
                "note": f"paid:{reference}",
                "created_at": now_iso,
                "updated_at": now_iso,
            }
        ).execute()

        next_quantity = current_quantity + quantity
        deal_updates: dict[str, Any] = {"current_quantity": next_quantity, "updated_at": now_iso}
        if target_quantity is not None and next_quantity >= int(target_quantity):
            deal_updates["status"] = "closed"
        sb.table("aggregate_deals").update(deal_updates).eq("id", safe_id).execute()
    except Exception as exc:
        logger.error(f"Could not finalize paid bulk participation for {safe_id}: {exc}")
        raise HTTPException(status_code=500, detail="Payment verified but bulk slot could not be finalized.")

    deal_price = round(to_float(deal.get("deal_price"), to_float(deal.get("base_price"))), 2)
    order_payload = {
        "user_id": user_id,
        "total_amount": round(expected_cash, 2),
        "items": [{"id": f"bulk:{safe_id}", "quantity": quantity, "price": deal_price}],
    }
    order_receipt = sb.table("orders").insert(order_payload).execute()
    order_id = str(order_receipt.data[0].get("id", "PROCESSED")) if order_receipt.data else "PROCESSED"

    try:
        write_order_tracking_records(
            sb=sb,
            order_id=order_id,
            user_id=user_id,
            total_amount=round(expected_cash, 2),
            credit_applied=0.0,
            cash_component=round(expected_cash, 2),
            delivery_address=f"Bulk Buy: {deal.get('title') or deal.get('item_name')}",
            payment_provider="paystack",
            payment_reference=reference,
            payment_status=tx_status,
        )
    except Exception as exc:
        logger.warning(f"Could not create tracking records for bulk order {order_id}: {exc}")

    try:
        update_payment_intent(
            sb,
            reference,
            {
                "status": "completed",
                "provider_status": tx_status,
                "verify_payload": tx_data,
                "paid_at": tx_data.get("paid_at") or now_iso,
                "order_id": order_id,
                "completed_at": now_iso,
            },
        )
    except Exception as exc:
        logger.warning(f"Could not mark bulk intent completed ({reference}): {exc}")

    updated_deal_row = sb.table("aggregate_deals").select("*").eq("id", safe_id).limit(1).execute().data or []
    updated_deal = decorate_aggregate_deal(updated_deal_row[0]) if updated_deal_row else deal
    return {
        "status": "success",
        "orderId": order_id,
        "reference": reference,
        "deal": updated_deal,
        "already_processed": False,
    }


@app.post("/api/deals/aggregate/{deal_id}/bid")
async def place_aggregate_auction_bid(deal_id: str, payload: AggregateDealBidPayload):
    _ = (deal_id, payload)
    raise HTTPException(
        status_code=410,
        detail="Auction bids are disabled. Only bulk aggregate deals are available right now.",
    )


@app.post("/api/auth/register/initiate")
async def register_initiate(payload: RegisterInitiatePayload):
    """
    Creates a Supabase email/password account and sends a 6-digit SMS OTP.
    Email verification remains handled by Supabase Auth email confirmation.
    """
    sb = ensure_service_supabase()
    auth_client = create_signup_auth_client()

    email = normalize_email(payload.email)
    phone = normalize_phone(payload.phone)
    name = payload.name.strip()

    try:
        auth_response = auth_client.auth.sign_up(
            {
                "email": email,
                "password": payload.password,
                "options": {
                    "data": {
                        "name": name,
                        "phone": phone,
                        "phone_verified": False,
                    }
                },
            }
        )
    except Exception as exc:
        logger.error(f"Supabase signup failed: {exc}")
        raise HTTPException(status_code=400, detail="Could not create account with provided credentials.")

    if not auth_response.user:
        raise HTTPException(status_code=500, detail="Signup succeeded but no user profile was returned.")

    user_id = str(auth_response.user.id)
    otp = generate_otp()
    expires_at = now_utc() + timedelta(minutes=OTP_TTL_MINUTES)
    otp_hash = hash_otp(user_id, phone, otp)
    challenge_id = None

    try:
        challenge_res = sb.table("phone_otp_challenges").insert(
            {
                "user_id": user_id,
                "phone": phone,
                "otp_hash": otp_hash,
                "attempts": 0,
                "created_at": now_utc().isoformat(),
                "expires_at": expires_at.isoformat(),
            }
        ).execute()
        if challenge_res.data:
            challenge_id = challenge_res.data[0].get("id")
        dispatch_sms_otp(phone, otp)
    except HTTPException:
        if challenge_id:
            try:
                sb.table("phone_otp_challenges").delete().eq("id", challenge_id).execute()
            except Exception:
                pass
        raise
    except Exception as exc:
        logger.error(f"OTP bootstrap failed: {exc}")
        if challenge_id:
            try:
                sb.table("phone_otp_challenges").delete().eq("id", challenge_id).execute()
            except Exception:
                pass
        raise HTTPException(status_code=500, detail="Failed to initialize SMS OTP verification.")

    audit_log(
        event_type="SIGNUP_OTP_SENT",
        user_id=user_id,
        description=f"Signup OTP dispatched to {phone}.",
        metadata={"phone": phone, "expires_at": expires_at.isoformat()},
    )

    return {
        "status": "pending_phone_verification",
        "user_id": user_id,
        "email": email,
        "phone": phone,
        "otp_expires_at": expires_at.isoformat(),
        "email_confirmation_required": not bool(auth_response.session),
        "sms_delivery_mode": SMS_DELIVERY_MODE,
        "sms_dispatch": "queued" if OTP_SMS_ASYNC else "sync",
    }


@app.post("/api/auth/phone-otp/resend")
async def resend_phone_otp(payload: OtpResendPayload):
    sb = ensure_service_supabase()
    user_id = payload.userId.strip()
    phone = normalize_phone(payload.phone)

    verification = sb.table("user_phone_verifications").select("verified_at").eq("user_id", user_id).limit(1).execute()
    if verification.data and verification.data[0].get("verified_at"):
        return {"status": "already_verified", "phone_verified": True}

    otp = generate_otp()
    expires_at = now_utc() + timedelta(minutes=OTP_TTL_MINUTES)
    otp_hash = hash_otp(user_id, phone, otp)
    challenge_id = None

    try:
        challenge_res = sb.table("phone_otp_challenges").insert(
            {
                "user_id": user_id,
                "phone": phone,
                "otp_hash": otp_hash,
                "attempts": 0,
                "created_at": now_utc().isoformat(),
                "expires_at": expires_at.isoformat(),
            }
        ).execute()
        if challenge_res.data:
            challenge_id = challenge_res.data[0].get("id")
        dispatch_sms_otp(phone, otp)
    except HTTPException:
        if challenge_id:
            try:
                sb.table("phone_otp_challenges").delete().eq("id", challenge_id).execute()
            except Exception:
                pass
        raise
    except Exception as exc:
        logger.error(f"OTP resend failed: {exc}")
        if challenge_id:
            try:
                sb.table("phone_otp_challenges").delete().eq("id", challenge_id).execute()
            except Exception:
                pass
        raise HTTPException(status_code=500, detail="Failed to resend OTP.")

    audit_log(
        event_type="SIGNUP_OTP_RESENT",
        user_id=user_id,
        description=f"OTP resent to {phone}.",
        metadata={"expires_at": expires_at.isoformat()},
    )

    return {
        "status": "otp_resent",
        "user_id": user_id,
        "phone": phone,
        "otp_expires_at": expires_at.isoformat(),
        "sms_delivery_mode": SMS_DELIVERY_MODE,
        "sms_dispatch": "queued" if OTP_SMS_ASYNC else "sync",
    }


@app.post("/api/auth/phone-otp/verify")
async def verify_phone_otp(payload: OtpVerifyPayload):
    sb = ensure_service_supabase()
    user_id = payload.userId.strip()
    phone = normalize_phone(payload.phone)
    otp = payload.otp.strip()

    if not re.match(r"^\d{6}$", otp):
        raise HTTPException(status_code=400, detail="OTP must be a 6-digit code.")

    challenge_res = sb.table("phone_otp_challenges").select("*").eq("user_id", user_id).eq("phone", phone).is_("consumed_at", "null").order("created_at", desc=True).limit(1).execute()
    if not challenge_res.data:
        raise HTTPException(status_code=404, detail="No active OTP challenge found. Request a new code.")

    challenge = challenge_res.data[0]
    challenge_id = challenge.get("id")
    attempts = int(challenge.get("attempts") or 0)
    expires_at_raw = challenge.get("expires_at")

    if attempts >= OTP_MAX_ATTEMPTS:
        raise HTTPException(status_code=400, detail="Maximum OTP attempts exceeded. Request a new code.")
    if not expires_at_raw:
        raise HTTPException(status_code=500, detail="OTP challenge is malformed. Request a new code.")
    if now_utc() > parse_db_timestamp(expires_at_raw):
        audit_log(
            event_type="SIGNUP_OTP_EXPIRED",
            user_id=user_id,
            description="Submitted OTP after expiry window.",
            metadata={"phone": phone},
        )
        raise HTTPException(status_code=400, detail="OTP has expired. Request a new code.")

    supplied_hash = hash_otp(user_id, phone, otp)
    expected_hash = challenge.get("otp_hash") or ""

    if not hmac.compare_digest(supplied_hash, expected_hash):
        try:
            sb.table("phone_otp_challenges").update({"attempts": attempts + 1}).eq("id", challenge_id).execute()
        except Exception:
            pass
        audit_log(
            event_type="SIGNUP_OTP_INVALID",
            user_id=user_id,
            description=f"Invalid OTP submitted (attempt {attempts + 1}).",
            metadata={"phone": phone},
        )
        raise HTTPException(status_code=400, detail="Incorrect OTP code.")

    now_iso = now_utc().isoformat()
    try:
        sb.table("phone_otp_challenges").update({"consumed_at": now_iso}).eq("id", challenge_id).execute()
        sb.table("user_phone_verifications").upsert(
            {
                "user_id": user_id,
                "phone": phone,
                "verified_at": now_iso,
                "updated_at": now_iso,
            },
            on_conflict="user_id",
        ).execute()
    except Exception as exc:
        logger.error(f"Phone verification persist failed: {exc}")
        raise HTTPException(status_code=500, detail="Could not persist phone verification result.")

    if SUPABASE_SERVICE_ROLE_KEY:
        try:
            sb.auth.admin.update_user_by_id(
                user_id,
                {"user_metadata": {"phone": phone, "phone_verified": True}},
            )
        except Exception as exc:
            logger.warning(f"Could not update Auth user metadata for {user_id}: {exc}")

    audit_log(
        event_type="SIGNUP_OTP_VERIFIED",
        user_id=user_id,
        description=f"Phone verification completed for {phone}.",
        metadata={"verified_at": now_iso},
    )

    return {"status": "verified", "user_id": user_id, "phone_verified": True}


@app.get("/api/auth/phone-otp/status")
async def phone_otp_status(user_id: str):
    if not user_id:
        raise HTTPException(status_code=400, detail="Missing user_id parameter.")
    sb = ensure_service_supabase()

    try:
        res = sb.table("user_phone_verifications").select("phone, verified_at").eq("user_id", user_id).limit(1).execute()
    except Exception as exc:
        logger.error(f"Verification status check failed: {exc}")
        raise HTTPException(status_code=500, detail="Could not fetch phone verification status.")

    row = res.data[0] if res.data else None
    return {
        "user_id": user_id,
        "phone_verified": bool(row and row.get("verified_at")),
        "phone": row.get("phone") if row else None,
    }

@app.get("/api/health")
async def health_check():
    """Server health diagnostic — checks DB connection vitality."""
    logger.info("Health check requested.")
    return {
        "status": "healthy",
        "supabase_connected": supabase is not None,
        "timestamp": now_utc().isoformat(),
    }


@app.get("/api/catalog")
async def get_catalog(request: Request):
    """
    Streams live product inventory from Supabase.
    Logs every catalog view for admin analytics (what users are browsing).
    """
    sb = ensure_supabase()
    try:
        products, cache_hit = get_catalog_snapshot(sb)
        normalized_products: list[dict[str, Any]] = []
        for row in products:
            normalized_row = dict(row)
            try:
                item_name, item_type, _ = normalize_inventory_name_and_type(
                    str(row.get("name") or ""),
                    str(row.get("type") or "ITEM"),
                )
                normalized_row["name"] = item_name
                normalized_row["type"] = item_type
            except Exception:
                pass
            normalized_products.append(normalized_row)

        # Only emit the audit event on cache misses to keep request cost low.
        if not cache_hit:
            audit_log(
                event_type="CATALOG_VIEWED",
                description="Product catalog was accessed.",
                metadata={
                    "product_count": len(normalized_products),
                    "client_ip": request.client.host if request.client else "unknown",
                    "cache_hit": cache_hit,
                },
            )

        return normalized_products
    except Exception as e:
        logger.error(f"Catalog fetch failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/credit/applications")
async def create_credit_application(payload: CreditApplicationCreatePayload):
    sb = ensure_service_supabase()
    if not supports_credit_application_tables(sb):
        raise HTTPException(
            status_code=503,
            detail="Credit application tables are not installed. Run backend/sql/supabase_phone_otp_schema.sql in Supabase first.",
        )
    user_id = payload.userId.strip()
    if not user_id:
        raise HTTPException(status_code=400, detail="Missing userId in request body.")
    if not payload.consent_credit_assessment:
        raise HTTPException(status_code=400, detail="Consent is required before submitting a credit application.")

    latest_application = get_latest_credit_application(sb, user_id)
    if latest_application:
        latest_status = normalize_credit_application_status(latest_application.get("status"))
        if latest_status in {"submitted", "under_review", "pending_documents", "approved"}:
            existing_id = str(latest_application.get("id") or "")
            raise HTTPException(
                status_code=409,
                detail=(
                    f"You already have an active credit application ({existing_id}) "
                    f"with status '{latest_status}'."
                ),
            )

    try:
        score_result = compute_credit_score_result(payload)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid numeric values in credit application payload.")
    now_iso = now_utc().isoformat()
    application_payload = payload.dict()
    application_payload.pop("userId", None)

    application_row = {
        "user_id": user_id,
        "farmer_id": payload.farmer_id,
        "consent_credit_assessment": payload.consent_credit_assessment,
        "application_payload": application_payload,
        "component_scores": score_result["component_scores"],
        "weighted_scores": score_result["weighted_scores"],
        "weights": score_result["weights"],
        "final_score": score_result["final_score"],
        "creditworthiness": score_result["creditworthiness"],
        "suggested_credit_limit": score_result["suggested_credit_limit"],
        "status": "submitted",
        "submitted_at": now_iso,
        "updated_at": now_iso,
    }

    try:
        insert_res = sb.table("credit_applications").insert(application_row).execute()
        created = insert_res.data[0] if insert_res.data else None
    except Exception as exc:
        logger.error(f"Credit application insert failed for user {user_id}: {exc}")
        raise HTTPException(status_code=500, detail="Could not create credit application.")

    if not created:
        raise HTTPException(status_code=500, detail="Credit application was not persisted.")

    application_id = str(created.get("id"))
    account = get_credit_account(sb, user_id)
    account_status = (account.get("status") or "").strip().lower() if account else ""
    if account_status not in {"approved"}:
        account_status = "submitted"

    snapshot = normalize_credit_account_snapshot(account)
    try:
        upsert_credit_account_record(
            sb,
            user_id=user_id,
            status=account_status,
            assigned_credit_limit=snapshot["assigned_credit_limit"],
            available_credit=snapshot["available_credit"],
            consumed_credit=snapshot["consumed_credit"],
            last_score=score_result["final_score"],
            creditworthiness=score_result["creditworthiness"],
            last_application_id=application_id,
        )
    except Exception as exc:
        logger.warning(f"Could not upsert credit account snapshot for user {user_id}: {exc}")

    event = {
        "application_id": application_id,
        "user_id": user_id,
        "event_type": "submitted",
        "note": "Credit application submitted by user.",
        "metadata": {
            "final_score": score_result["final_score"],
            "creditworthiness": score_result["creditworthiness"],
            "suggested_credit_limit": score_result["suggested_credit_limit"],
        },
        "event_time": now_iso,
    }
    try:
        sb.table("credit_application_events").insert(event).execute()
    except Exception as exc:
        logger.warning(f"Could not persist credit application event for {application_id}: {exc}")

    audit_log(
        event_type="CREDIT_APPLICATION_SUBMITTED",
        user_id=user_id,
        description=f"Credit application {application_id} submitted with final score {score_result['final_score']}.",
        metadata={
            "application_id": application_id,
            "final_score": score_result["final_score"],
            "creditworthiness": score_result["creditworthiness"],
            "suggested_credit_limit": score_result["suggested_credit_limit"],
        },
    )

    admin_sms_alert = notify_admins_credit_application_submitted_sms(
        application_id=application_id,
        user_id=user_id,
        final_score=score_result["final_score"],
        creditworthiness=str(score_result["creditworthiness"] or ""),
        suggested_credit_limit=score_result["suggested_credit_limit"],
    )
    audit_log(
        event_type="ADMIN_CREDIT_APPLICATION_PENDING_ALERT",
        user_id=user_id,
        description=f"New credit application {application_id} is pending review.",
        metadata={
            "application_id": application_id,
            "status": "submitted",
            "final_score": score_result["final_score"],
            "creditworthiness": score_result["creditworthiness"],
            "suggested_credit_limit": score_result["suggested_credit_limit"],
        },
    )
    audit_log(
        event_type="ADMIN_CREDIT_APPLICATION_SMS_ALERTED",
        user_id=user_id,
        description=(
            f"Admin SMS alerts queued for credit application {application_id}: "
            f"{admin_sms_alert['queued']}/{admin_sms_alert['attempted']} "
            f"(failed={admin_sms_alert['failed']})."
        ),
        metadata={
            "application_id": application_id,
            "attempted": admin_sms_alert["attempted"],
            "queued": admin_sms_alert["queued"],
            "failed": admin_sms_alert["failed"],
        },
    )

    return {
        "status": "submitted",
        "application_id": application_id,
        "final_score": score_result["final_score"],
        "creditworthiness": score_result["creditworthiness"],
        "suggested_credit_limit": score_result["suggested_credit_limit"],
        "next_step": "Upload supporting documents and wait for admin review.",
        "admin_sms_alert": admin_sms_alert,
    }


@app.get("/api/credit/applications/status")
async def get_credit_application_status(user_id: str):
    if not user_id:
        raise HTTPException(status_code=400, detail="Missing user_id parameter.")

    sb = ensure_service_supabase()
    has_application_tables = supports_credit_application_tables(sb)
    latest_application = get_latest_credit_application(sb, user_id) if has_application_tables else None
    account = get_credit_account(sb, user_id)
    account_snapshot = normalize_credit_account_snapshot(account)

    documents_count = 0
    if latest_application and has_application_tables:
        try:
            docs = (
                sb.table("credit_application_documents")
                .select("id")
                .eq("application_id", latest_application["id"])
                .execute()
            )
            documents_count = len(docs.data or [])
        except Exception:
            documents_count = 0

    return {
        "user_id": user_id,
        "has_application": latest_application is not None,
        "application_tables_ready": has_application_tables,
        "application": {
            "id": str(latest_application.get("id")) if latest_application else None,
            "status": normalize_credit_application_status(latest_application.get("status")) if latest_application else None,
            "final_score": round(to_float(latest_application.get("final_score")), 2) if latest_application else None,
            "creditworthiness": latest_application.get("creditworthiness") if latest_application else None,
            "suggested_credit_limit": round(to_float(latest_application.get("suggested_credit_limit")), 2) if latest_application else None,
            "review_note": latest_application.get("review_note") if latest_application else None,
            "reviewer": latest_application.get("reviewer") if latest_application else None,
            "submitted_at": latest_application.get("submitted_at") if latest_application else None,
            "reviewed_at": latest_application.get("reviewed_at") if latest_application else None,
            "documents_count": documents_count,
        },
        "credit_account": {
            "status": account_snapshot["status"],
            "available_credit": account_snapshot["available_credit"],
            "assigned_credit_limit": account_snapshot["assigned_credit_limit"],
            "consumed_credit": account_snapshot["consumed_credit"],
            "last_score": account_snapshot["last_score"],
            "creditworthiness": account_snapshot["creditworthiness"],
        },
    }


@app.get("/api/credit/applications/{application_id}")
async def get_credit_application_details(application_id: str, user_id: str):
    if not user_id:
        raise HTTPException(status_code=400, detail="Missing user_id parameter.")

    sb = ensure_service_supabase()
    if not supports_credit_application_tables(sb):
        raise HTTPException(
            status_code=503,
            detail="Credit application tables are not installed. Run backend/sql/supabase_phone_otp_schema.sql in Supabase first.",
        )
    application = verify_user_owns_credit_application(sb, application_id, user_id)

    documents: list[dict[str, Any]] = []
    events: list[dict[str, Any]] = []
    try:
        docs_res = (
            sb.table("credit_application_documents")
            .select("*")
            .eq("application_id", application_id)
            .order("uploaded_at", desc=True)
            .execute()
        )
        for doc in docs_res.data or []:
            document_id = str(doc.get("id") or "").strip()
            documents.append(
                {
                    **doc,
                    "download_url": (
                        f"/api/credit/applications/{application_id}/documents/{document_id}/download"
                        f"?user_id={user_id}"
                        if document_id
                        else None
                    ),
                }
            )
    except Exception as exc:
        logger.warning(f"Could not fetch documents for credit application {application_id}: {exc}")

    try:
        events_res = (
            sb.table("credit_application_events")
            .select("*")
            .eq("application_id", application_id)
            .order("event_time", desc=False)
            .execute()
        )
        events = events_res.data or []
    except Exception as exc:
        logger.warning(f"Could not fetch events for credit application {application_id}: {exc}")

    return {
        "application": application,
        "documents": documents,
        "events": events,
        "credit_account": normalize_credit_account_snapshot(get_credit_account(sb, user_id)),
    }


@app.post("/api/credit/applications/{application_id}/documents")
async def upload_credit_application_document(
    application_id: str,
    user_id: str = Form(...),
    document_type: str = Form("supporting_document"),
    file: UploadFile = File(...),
):
    if not user_id.strip():
        raise HTTPException(status_code=400, detail="user_id is required.")
    if not file.filename:
        raise HTTPException(status_code=400, detail="Document file is required.")

    sb = ensure_service_supabase()
    if not supports_credit_application_tables(sb):
        raise HTTPException(
            status_code=503,
            detail="Credit application tables are not installed. Run backend/sql/supabase_phone_otp_schema.sql in Supabase first.",
        )
    application = verify_user_owns_credit_application(sb, application_id, user_id.strip())
    current_status = normalize_credit_application_status(application.get("status"))
    if current_status in {"approved", "rejected"}:
        raise HTTPException(status_code=400, detail="Cannot upload documents to a closed application.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(content) > CREDIT_DOC_MAX_BYTES:
        raise HTTPException(status_code=400, detail=f"Document exceeds maximum size of {CREDIT_DOC_MAX_BYTES} bytes.")

    doc_type = re.sub(r"[^a-z0-9._-]+", "_", document_type.strip().lower()).strip("._") or "supporting_document"
    safe_original = sanitize_filename(file.filename)
    stored_name = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid4().hex}_{safe_original}"
    app_dir = ensure_credit_upload_dir(application_id)
    storage_path = os.path.join(app_dir, stored_name)
    with open(storage_path, "wb") as handle:
        handle.write(content)

    uploaded_at = now_utc().isoformat()
    doc_row = {
        "application_id": application_id,
        "user_id": user_id.strip(),
        "document_type": doc_type,
        "original_name": safe_original,
        "stored_name": stored_name,
        "storage_path": storage_path,
        "mime_type": file.content_type or "application/octet-stream",
        "size_bytes": len(content),
        "uploaded_at": uploaded_at,
    }
    try:
        inserted = sb.table("credit_application_documents").insert(doc_row).execute()
    except Exception as exc:
        logger.error(f"Could not persist uploaded credit document metadata for {application_id}: {exc}")
        raise HTTPException(status_code=500, detail="Could not persist uploaded document.")

    try:
        sb.table("credit_application_events").insert(
            {
                "application_id": application_id,
                "user_id": user_id.strip(),
                "event_type": "document_uploaded",
                "note": f"Document uploaded: {doc_type}.",
                "metadata": {"document_type": doc_type, "size_bytes": len(content)},
                "event_time": uploaded_at,
            }
        ).execute()
    except Exception as exc:
        logger.warning(f"Could not persist upload event for credit application {application_id}: {exc}")

    try:
        documents_count = len(
            (
                sb.table("credit_application_documents")
                .select("id")
                .eq("application_id", application_id)
                .execute()
                .data
                or []
            )
        )
    except Exception:
        documents_count = 0

    next_status = None
    if documents_count > 0 and current_status in {"submitted", "pending_documents"}:
        next_status = "under_review"
    if next_status:
        now_iso = now_utc().isoformat()
        try:
            sb.table("credit_applications").update(
                {
                    "status": next_status,
                    "updated_at": now_iso,
                }
            ).eq("id", application_id).execute()
            sb.table("credit_application_events").insert(
                {
                    "application_id": application_id,
                    "user_id": user_id.strip(),
                    "event_type": "status_auto_update",
                    "note": f"Application moved to {next_status} after document upload.",
                    "metadata": {"status": next_status, "documents_count": documents_count},
                    "event_time": now_iso,
                }
            ).execute()
        except Exception as exc:
            logger.warning(f"Could not auto-transition credit application status for {application_id}: {exc}")

    return {
        "status": "uploaded",
        "application_id": application_id,
        "document": inserted.data[0] if inserted.data else doc_row,
    }


@app.get("/api/credit/applications/{application_id}/documents/{document_id}/download")
async def download_credit_application_document(
    application_id: str,
    document_id: str,
    user_id: str,
):
    if not user_id.strip():
        raise HTTPException(status_code=400, detail="Missing user_id parameter.")

    sb = ensure_service_supabase()
    if not supports_credit_application_tables(sb):
        raise HTTPException(
            status_code=503,
            detail="Credit application tables are not installed. Run backend/sql/supabase_phone_otp_schema.sql in Supabase first.",
        )
    _ = verify_user_owns_credit_application(sb, application_id, user_id.strip())

    safe_document_id = document_id.strip()
    if not safe_document_id:
        raise HTTPException(status_code=400, detail="Missing document id.")
    doc_res = (
        sb.table("credit_application_documents")
        .select("*")
        .eq("id", safe_document_id)
        .eq("application_id", application_id)
        .eq("user_id", user_id.strip())
        .limit(1)
        .execute()
    )
    if not doc_res.data:
        raise HTTPException(status_code=404, detail="Document not found for this application.")

    document = doc_res.data[0]
    storage_path = str(document.get("storage_path") or "").strip()
    if not storage_path:
        raise HTTPException(status_code=404, detail="Document file path is missing.")

    resolved_path = os.path.abspath(storage_path)
    root = os.path.abspath(CREDIT_DOC_UPLOAD_DIR)
    if not resolved_path.startswith(root):
        raise HTTPException(status_code=400, detail="Invalid document path.")
    if not os.path.isfile(resolved_path):
        raise HTTPException(status_code=404, detail="Document file is not available on the server.")

    return FileResponse(
        resolved_path,
        media_type=str(document.get("mime_type") or "application/octet-stream"),
        filename=str(document.get("original_name") or os.path.basename(resolved_path)),
    )


@app.get("/api/admin/credit/applications")
async def admin_list_credit_applications(
    status: Optional[str] = None,
    limit: int = 25,
    offset: int = 0,
    query: Optional[str] = None,
    authorization: Optional[str] = Header(default=None),
    x_admin_token: Optional[str] = Header(default=None),
):
    admin = require_admin_session_or_token(authorization, x_admin_token)
    sb = ensure_service_supabase()
    if not supports_credit_application_tables(sb):
        raise HTTPException(
            status_code=503,
            detail="Credit application tables are not installed. Run backend/sql/supabase_phone_otp_schema.sql in Supabase first.",
        )
    normalized_status = normalize_admin_credit_status_filter(status)
    query_filter = (query or "").strip().lower()
    safe_limit = max(1, min(limit, 100))
    safe_offset = max(0, offset)

    rows_for_page: list[dict[str, Any]] = []
    rows_for_summary: list[dict[str, Any]] = []
    total = 0
    try:
        if query_filter:
            source_rows = fetch_table_rows(
                sb,
                "credit_applications",
                "*",
                limit=5000,
                order_by="created_at",
                desc=True,
            )
            filtered_rows: list[dict[str, Any]] = []
            for row in source_rows:
                status_value = normalize_credit_application_status(row.get("status"))
                if normalized_status and status_value != normalized_status:
                    continue
                payload_obj = parse_json_object(row.get("application_payload"))
                haystack = " ".join(
                    [
                        str(row.get("id") or ""),
                        str(row.get("user_id") or ""),
                        str(row.get("farmer_id") or ""),
                        str(status_value),
                        str(payload_obj.get("full_name") or ""),
                        str(payload_obj.get("region") or ""),
                        str(payload_obj.get("district") or ""),
                        str(payload_obj.get("town") or ""),
                    ]
                ).lower()
                if query_filter in haystack:
                    filtered_rows.append(row)
            total = len(filtered_rows)
            rows_for_summary = filtered_rows
            rows_for_page = filtered_rows[safe_offset : safe_offset + safe_limit]
        else:
            base_query = sb.table("credit_applications").select("*", count="exact")
            if normalized_status:
                base_query = base_query.eq("status", normalized_status)
            page_res = (
                base_query
                .order("created_at", desc=True)
                .range(safe_offset, safe_offset + safe_limit - 1)
                .execute()
            )
            rows_for_page = page_res.data or []
            total = int(page_res.count or 0)
            rows_for_summary = fetch_table_rows(
                sb,
                "credit_applications",
                "id,status,final_score,reviewed_at,updated_at,created_at",
                limit=5000,
                order_by="created_at",
                desc=True,
            )
            if normalized_status:
                rows_for_summary = [
                    row for row in rows_for_summary
                    if normalize_credit_application_status(row.get("status")) == normalized_status
                ]
    except Exception as exc:
        logger.error(f"Could not list admin credit applications: {exc}")
        raise HTTPException(status_code=500, detail="Could not fetch credit applications.")

    document_counts: dict[str, int] = {}
    if rows_for_page:
        app_ids = [str(row.get("id") or "").strip() for row in rows_for_page if row.get("id")]
        if app_ids:
            try:
                docs_res = (
                    sb.table("credit_application_documents")
                    .select("application_id")
                    .in_("application_id", app_ids)
                    .execute()
                )
                for doc in docs_res.data or []:
                    app_id = str(doc.get("application_id") or "").strip()
                    if app_id:
                        document_counts[app_id] = document_counts.get(app_id, 0) + 1
            except Exception as exc:
                logger.warning(f"Could not fetch document counts for admin credit queue: {exc}")

    account_cache: dict[str, Optional[dict[str, Any]]] = {}
    applications = []
    for row in rows_for_page:
        app_id = str(row.get("id") or "").strip()
        user_id = str(row.get("user_id") or "").strip()
        if user_id and user_id not in account_cache:
            account_cache[user_id] = get_credit_account(sb, user_id)
        applications.append(
            build_admin_credit_application_response(
                row,
                account=account_cache.get(user_id),
                documents_count=document_counts.get(app_id, 0),
            )
        )

    summary = compute_admin_credit_summary(rows_for_summary)
    return {
        "count": len(applications),
        "total": total if total >= 0 else len(applications),
        "limit": safe_limit,
        "offset": safe_offset,
        "applications": applications,
        "summary": summary,
        "admin": {"name": admin["name"], "email": admin["email"]},
    }


@app.post("/api/admin/credit/applications/{application_id}/decision")
async def admin_decide_credit_application(
    application_id: str,
    payload: CreditApplicationDecisionPayload,
    authorization: Optional[str] = Header(default=None),
    x_admin_token: Optional[str] = Header(default=None),
):
    admin = require_admin_session_or_token(authorization, x_admin_token)
    sb = ensure_service_supabase()
    if not supports_credit_application_tables(sb):
        raise HTTPException(
            status_code=503,
            detail="Credit application tables are not installed. Run backend/sql/supabase_phone_otp_schema.sql in Supabase first.",
        )

    app_res = sb.table("credit_applications").select("*").eq("id", application_id).limit(1).execute()
    if not app_res.data:
        raise HTTPException(status_code=404, detail="Credit application not found.")
    application = app_res.data[0]
    user_id = str(application.get("user_id") or "")
    if not user_id:
        raise HTTPException(status_code=500, detail="Credit application has no user id.")

    requested_status = (payload.status or "").strip().lower()
    if requested_status not in CREDIT_APPLICATION_DECISION_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid decision status.")

    now_iso = now_utc().isoformat()
    reviewer = (payload.reviewer or admin["email"] or "admin").strip()
    review_note = (payload.review_note or "").strip() or None

    update_payload: dict[str, Any] = {
        "status": requested_status,
        "reviewer": reviewer,
        "review_note": review_note,
        "updated_at": now_iso,
    }
    if requested_status in {"approved", "rejected"}:
        update_payload["reviewed_at"] = now_iso

    approved_limit = None
    account = get_credit_account(sb, user_id)
    account_snapshot = normalize_credit_account_snapshot(account)
    if requested_status == "approved":
        docs_res = (
            sb.table("credit_application_documents")
            .select("id")
            .eq("application_id", application_id)
            .limit(1)
            .execute()
        )
        if not docs_res.data:
            raise HTTPException(
                status_code=400,
                detail="Cannot approve application without supporting documents.",
            )

        approved_limit = round(
            to_float(
                payload.approved_credit_limit
                if payload.approved_credit_limit is not None
                else application.get("suggested_credit_limit")
            ),
            2,
        )
        if approved_limit <= 0:
            raise HTTPException(status_code=400, detail="approved_credit_limit must be greater than 0.")

        existing_consumed = account_snapshot["consumed_credit"]
        next_consumed = min(existing_consumed, approved_limit)
        next_available = round(max(approved_limit - next_consumed, 0.0), 2)
        upsert_credit_account_record(
            sb,
            user_id=user_id,
            status="approved",
            assigned_credit_limit=approved_limit,
            available_credit=next_available,
            consumed_credit=next_consumed,
            last_score=round(to_float(application.get("final_score")), 2),
            creditworthiness=application.get("creditworthiness"),
            last_application_id=application_id,
            reviewer=reviewer,
            approved_at=now_iso,
        )
    elif requested_status == "rejected":
        upsert_credit_account_record(
            sb,
            user_id=user_id,
            status="rejected",
            assigned_credit_limit=account_snapshot["assigned_credit_limit"],
            available_credit=0.0,
            consumed_credit=account_snapshot["consumed_credit"],
            last_score=round(to_float(application.get("final_score")), 2),
            creditworthiness=application.get("creditworthiness"),
            last_application_id=application_id,
            reviewer=reviewer,
            approved_at=None,
        )
    else:
        upsert_credit_account_record(
            sb,
            user_id=user_id,
            status=requested_status,
            assigned_credit_limit=account_snapshot["assigned_credit_limit"],
            available_credit=account_snapshot["available_credit"],
            consumed_credit=account_snapshot["consumed_credit"],
            last_score=round(to_float(application.get("final_score")), 2),
            creditworthiness=application.get("creditworthiness"),
            last_application_id=application_id,
            reviewer=reviewer,
            approved_at=None,
        )

    if approved_limit is not None:
        update_payload["approved_credit_limit"] = approved_limit

    sb.table("credit_applications").update(update_payload).eq("id", application_id).execute()
    updated_application = sb.table("credit_applications").select("*").eq("id", application_id).limit(1).execute().data[0]
    updated_account = get_credit_account(sb, user_id)

    sb.table("credit_application_events").insert(
        {
            "application_id": application_id,
            "user_id": user_id,
            "event_type": "decision",
            "note": f"Application marked as {requested_status}.",
            "metadata": {
                "status": requested_status,
                "reviewer": reviewer,
                "review_note": review_note,
                "approved_credit_limit": approved_limit,
            },
            "event_time": now_iso,
        }
    ).execute()

    audit_log(
        event_type="CREDIT_APPLICATION_DECIDED",
        user_id=user_id,
        description=f"Credit application {application_id} marked as {requested_status}.",
        metadata={
            "application_id": application_id,
            "status": requested_status,
            "reviewer": reviewer,
            "approved_credit_limit": approved_limit,
        },
    )

    user_sms_alert = notify_user_credit_status_update_sms(
        sb=sb,
        user_id=user_id,
        application_id=application_id,
        status=requested_status,
        approved_credit_limit=approved_limit,
        review_note=review_note,
    )
    audit_log(
        event_type="CREDIT_APPLICATION_USER_SMS_ALERT",
        user_id=user_id,
        description=(
            f"User SMS alert for credit application {application_id}: "
            f"{'sent' if user_sms_alert['sent'] else 'not_sent'} ({user_sms_alert['reason']})."
        ),
        metadata={
            "application_id": application_id,
            "status": requested_status,
            "reviewer": reviewer,
            "sms_sent": user_sms_alert["sent"],
            "sms_reason": user_sms_alert["reason"],
            "phone_masked": user_sms_alert["phone_masked"],
        },
    )

    return {
        "status": requested_status,
        "application": updated_application,
        "credit_account": updated_account,
        "user_sms_alert": user_sms_alert,
        "admin": {"name": admin["name"], "email": admin["email"]},
    }


@app.get("/api/admin/credit/applications/{application_id}")
async def admin_get_credit_application(
    application_id: str,
    authorization: Optional[str] = Header(default=None),
    x_admin_token: Optional[str] = Header(default=None),
):
    admin = require_admin_session_or_token(authorization, x_admin_token)
    sb = ensure_service_supabase()
    if not supports_credit_application_tables(sb):
        raise HTTPException(
            status_code=503,
            detail="Credit application tables are not installed. Run backend/sql/supabase_phone_otp_schema.sql in Supabase first.",
        )

    safe_id = application_id.strip()
    if not safe_id:
        raise HTTPException(status_code=400, detail="Missing application id.")

    app_res = sb.table("credit_applications").select("*").eq("id", safe_id).limit(1).execute()
    if not app_res.data:
        raise HTTPException(status_code=404, detail="Credit application not found.")
    application_row = app_res.data[0]
    user_id = str(application_row.get("user_id") or "").strip()

    documents: list[dict[str, Any]] = []
    events: list[dict[str, Any]] = []
    try:
        docs_res = (
            sb.table("credit_application_documents")
            .select("*")
            .eq("application_id", safe_id)
            .order("uploaded_at", desc=True)
            .execute()
        )
        for doc in docs_res.data or []:
            document_id = str(doc.get("id") or "").strip()
            documents.append(
                {
                    **doc,
                    "download_url": (
                        f"/api/admin/credit/applications/{safe_id}/documents/{document_id}/download"
                        if document_id
                        else None
                    ),
                }
            )
    except Exception as exc:
        logger.warning(f"Could not fetch admin credit documents for {safe_id}: {exc}")

    try:
        events_res = (
            sb.table("credit_application_events")
            .select("*")
            .eq("application_id", safe_id)
            .order("event_time", desc=False)
            .execute()
        )
        events = events_res.data or []
    except Exception as exc:
        logger.warning(f"Could not fetch admin credit events for {safe_id}: {exc}")

    credit_account = get_credit_account(sb, user_id) if user_id else None
    return {
        "application": build_admin_credit_application_response(
            application_row,
            account=credit_account,
            documents_count=len(documents),
        ),
        "documents": documents,
        "events": events,
        "credit_account": normalize_credit_account_snapshot(credit_account),
        "admin": {"name": admin["name"], "email": admin["email"]},
    }


@app.get("/api/admin/credit/applications/{application_id}/documents/{document_id}/download")
async def admin_download_credit_document(
    application_id: str,
    document_id: str,
    authorization: Optional[str] = Header(default=None),
    x_admin_token: Optional[str] = Header(default=None),
):
    _ = require_admin_session_or_token(authorization, x_admin_token)
    sb = ensure_service_supabase()
    if not supports_credit_application_tables(sb):
        raise HTTPException(
            status_code=503,
            detail="Credit application tables are not installed. Run backend/sql/supabase_phone_otp_schema.sql in Supabase first.",
        )

    safe_application_id = application_id.strip()
    safe_document_id = document_id.strip()
    if not safe_application_id or not safe_document_id:
        raise HTTPException(status_code=400, detail="application_id and document_id are required.")

    doc_res = (
        sb.table("credit_application_documents")
        .select("*")
        .eq("id", safe_document_id)
        .eq("application_id", safe_application_id)
        .limit(1)
        .execute()
    )
    if not doc_res.data:
        raise HTTPException(status_code=404, detail="Document not found for this application.")

    document = doc_res.data[0]
    storage_path = str(document.get("storage_path") or "").strip()
    if not storage_path:
        raise HTTPException(status_code=404, detail="Document file path is missing.")

    resolved_path = os.path.abspath(storage_path)
    root = os.path.abspath(CREDIT_DOC_UPLOAD_DIR)
    if not resolved_path.startswith(root):
        raise HTTPException(status_code=400, detail="Invalid document path.")
    if not os.path.isfile(resolved_path):
        raise HTTPException(status_code=404, detail="Document file is not available on the server.")

    return FileResponse(
        resolved_path,
        media_type=str(document.get("mime_type") or "application/octet-stream"),
        filename=str(document.get("original_name") or os.path.basename(resolved_path)),
    )


@app.post("/api/admin/credit/bootstrap/approve-all-users")
async def admin_bulk_approve_all_users(
    payload: BulkCreditApprovalPayload,
    authorization: Optional[str] = Header(default=None),
    x_admin_token: Optional[str] = Header(default=None),
):
    admin = require_admin_session_or_token(authorization, x_admin_token)
    sb = ensure_service_supabase()

    reviewer = (payload.reviewer or admin["email"] or "admin").strip()
    review_note = (payload.review_note or "").strip() or None
    has_application_tables = supports_credit_application_tables(sb)
    user_ids = fetch_all_auth_user_ids()
    if not user_ids:
        return {
            "status": "ok",
            "processed_users": 0,
            "created_applications": 0,
            "updated_applications": 0,
            "application_tables_ready": has_application_tables,
            "admin": {"name": admin["name"], "email": admin["email"]},
        }

    created = 0
    updated = 0
    failures: list[dict[str, str]] = []

    for user_id in user_ids:
        try:
            action, application_id = upsert_auto_approved_credit_for_user(
                sb=sb,
                user_id=user_id,
                approved_credit_limit=payload.approved_credit_limit,
                final_score=payload.final_score,
                reviewer=reviewer,
                review_note=review_note,
            )
            if action == "created":
                created += 1
            else:
                updated += 1
            audit_log(
                event_type="CREDIT_BULK_APPROVAL_APPLIED",
                user_id=user_id,
                description=f"Bulk credit approval applied (application={application_id}).",
                metadata={
                    "application_id": application_id,
                    "approved_credit_limit": payload.approved_credit_limit,
                    "final_score": payload.final_score,
                    "reviewer": reviewer,
                },
            )
        except Exception as exc:
            logger.error(f"Bulk approval failed for user {user_id}: {exc}")
            failures.append({"user_id": user_id, "error": str(exc)})

    return {
        "status": "ok",
        "processed_users": len(user_ids),
        "created_applications": created,
        "updated_applications": updated,
        "failed_count": len(failures),
        "failures": failures[:20],
        "application_tables_ready": has_application_tables,
        "admin": {"name": admin["name"], "email": admin["email"]},
    }


def get_creditworthiness_label(final_score: float) -> str:
    if final_score >= 80:
        return "Excellent"
    if final_score >= 60:
        return "Good"
    if final_score >= 40:
        return "Fair"
    return "Poor"


def compute_credit_limit(final_score: float, creditworthiness: str) -> float:
    if creditworthiness == "Excellent":
        return round(30000 + (final_score * 200), 2)
    if creditworthiness == "Good":
        return round(12000 + (final_score * 150), 2)
    if creditworthiness == "Fair":
        return round(4000 + (final_score * 80), 2)
    return round(1000 + (final_score * 40), 2)


@app.get("/api/credit-score")
async def get_credit_score(user_id: str):
    """
    Returns user credit status using admin-reviewed account data when available.
    Users only receive spendable credit after explicit approval.
    """
    if not user_id:
        raise HTTPException(status_code=400, detail="Missing user_id parameter.")

    sb = ensure_service_supabase()
    has_application_tables = supports_credit_application_tables(sb)
    latest_application = get_latest_credit_application(sb, user_id) if has_application_tables else None
    account = get_credit_account(sb, user_id)
    account_snapshot = normalize_credit_account_snapshot(account)

    final_score = 0.0
    creditworthiness = "Unrated"
    credit_limit = 0.0
    status = "not_applied"
    score_breakdown: dict[str, float] = {}
    weights: dict[str, float] = {}

    if latest_application:
        final_score = round(to_float(latest_application.get("final_score")), 2)
        creditworthiness = latest_application.get("creditworthiness") or get_creditworthiness_label(final_score)
        score_breakdown = latest_application.get("component_scores") or {}
        weights = latest_application.get("weights") or {}
        status = normalize_credit_application_status(latest_application.get("status"))

    if account:
        account_status = account_snapshot["status"]
        last_score = account_snapshot["last_score"]
        if last_score > 0:
            final_score = last_score
        if account_snapshot["creditworthiness"]:
            creditworthiness = str(account_snapshot["creditworthiness"])
        status = account_status or status
        if is_credit_account_spendable(account_status):
            credit_limit = account_snapshot["available_credit"]
        else:
            credit_limit = 0.0
    elif latest_application and status == "approved":
        # Safety fallback when account row does not yet exist.
        credit_limit = round(to_float(latest_application.get("approved_credit_limit")), 2)
    else:
        credit_limit = 0.0

    audit_log(
        event_type="CREDIT_SCORE_CHECKED",
        user_id=user_id,
        description=f"Credit appraisal returned final_score={final_score}, creditworthiness={creditworthiness}, limit=GH₵{credit_limit:.2f}.",
        metadata={
            "final_score": final_score,
            "creditworthiness": creditworthiness,
            "credit_limit": credit_limit,
            "status": status,
            "weights": weights,
            "score_breakdown": score_breakdown,
        },
    )

    return {
        "user_id": user_id,
        "credit_score": final_score,
        "final_score": final_score,
        "creditworthiness": creditworthiness,
        "credit_limit": credit_limit,
        "available_credit": account_snapshot["available_credit"],
        "status": status,
        "score_breakdown": score_breakdown,
        "weights": weights,
        "application_id": str(latest_application.get("id")) if latest_application else None,
        "approved_credit_limit": account_snapshot["assigned_credit_limit"],
        "consumed_credit": account_snapshot["consumed_credit"],
        "application_tables_ready": has_application_tables,
    }


@app.get("/api/orders/history")
async def get_order_history(user_id: str):
    if not user_id:
        raise HTTPException(status_code=400, detail="Missing user_id parameter.")
    sb = ensure_supabase()

    try:
        orders_res = sb.table("orders").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    except Exception:
        orders_res = sb.table("orders").select("*").eq("user_id", user_id).execute()

    orders = orders_res.data or []
    if not orders:
        return {"user_id": user_id, "orders": []}

    order_ids = [str(row.get("id")) for row in orders]
    tracking_map: dict[str, dict[str, Any]] = {}
    latest_event_map: dict[str, dict[str, Any]] = {}

    try:
        tracking_res = sb.table("order_tracking").select("*").in_("order_id", order_ids).execute()
        for row in tracking_res.data or []:
            tracking_map[str(row.get("order_id"))] = row
    except Exception as exc:
        logger.warning(f"Could not fetch order tracking records for user {user_id}: {exc}")

    try:
        events_res = (
            sb.table("order_tracking_events")
            .select("*")
            .in_("order_id", order_ids)
            .order("event_time", desc=True)
            .execute()
        )
        for event in events_res.data or []:
            oid = str(event.get("order_id"))
            if oid not in latest_event_map:
                latest_event_map[oid] = event
    except Exception as exc:
        logger.warning(f"Could not fetch latest order events for user {user_id}: {exc}")

    response_orders = []
    for order in orders:
        order_id = str(order.get("id"))
        tracking = tracking_map.get(order_id, {})
        latest_event = latest_event_map.get(order_id, {})
        items = order.get("items") or []
        total_quantity = 0
        if isinstance(items, list):
            for item in items:
                if isinstance(item, dict):
                    total_quantity += max(to_int(item.get("quantity")), 0)
        status_key = normalize_tracking_status(str(tracking.get("status") or "ordered"))

        response_orders.append(
            {
                "order_id": order_id,
                "created_at": order.get("created_at"),
                "total_amount": float(order.get("total_amount") or 0),
                "item_count": len(items) if isinstance(items, list) else 0,
                "total_quantity": total_quantity,
                "status": status_key,
                "status_label": format_order_status(status_key),
                "payment_status": tracking.get("payment_status") or "unknown",
                "payment_provider": tracking.get("payment_provider") or "unknown",
                "delivery_address": tracking.get("delivery_address"),
                "estimated_delivery_at": tracking.get("estimated_delivery_at"),
                "last_update": latest_event.get("note"),
                "last_update_time": latest_event.get("event_time"),
            }
        )

    return {"user_id": user_id, "orders": response_orders}


@app.get("/api/orders/{order_id}")
async def get_order_details(order_id: str, user_id: str):
    if not user_id:
        raise HTTPException(status_code=400, detail="Missing user_id parameter.")
    sb = ensure_supabase()
    order = verify_user_owns_order(sb, order_id, user_id)

    tracking = None
    try:
        tracking_res = sb.table("order_tracking").select("*").eq("order_id", order_id).limit(1).execute()
        tracking = tracking_res.data[0] if tracking_res.data else None
    except Exception as exc:
        logger.warning(f"Could not fetch tracking row for order {order_id}: {exc}")

    events: list[dict[str, Any]] = []
    try:
        events_res = (
            sb.table("order_tracking_events")
            .select("*")
            .eq("order_id", order_id)
            .order("event_time", desc=False)
            .execute()
        )
        events = events_res.data or []
    except Exception as exc:
        logger.warning(f"Could not fetch order timeline for {order_id}: {exc}")

    status_key = normalize_tracking_status(str((tracking or {}).get("status") or "ordered"))
    return {
        "order": {
            "order_id": str(order.get("id")),
            "created_at": order.get("created_at"),
            "total_amount": float(order.get("total_amount") or 0),
            "items": order.get("items") or [],
            "status": status_key,
            "status_label": format_order_status(status_key),
            "payment_status": (tracking or {}).get("payment_status") or "unknown",
            "payment_provider": (tracking or {}).get("payment_provider") or "unknown",
            "payment_reference": (tracking or {}).get("payment_reference"),
            "credit_applied": float((tracking or {}).get("credit_applied") or 0),
            "cash_component": float((tracking or {}).get("cash_component") or 0),
            "delivery_address": (tracking or {}).get("delivery_address"),
            "estimated_delivery_at": (tracking or {}).get("estimated_delivery_at"),
            "updated_at": (tracking or {}).get("updated_at"),
        },
        "timeline": events,
    }


@app.post("/api/orders/{order_id}/follow-up")
async def submit_order_follow_up(order_id: str, payload: OrderFollowUpPayload):
    sb = ensure_supabase()
    user_id = payload.userId.strip()
    if not user_id:
        raise HTTPException(status_code=400, detail="Missing userId in request body.")

    _ = verify_user_owns_order(sb, order_id, user_id)

    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Follow-up message cannot be empty.")

    tracking_status = "ordered"
    try:
        tracking_res = sb.table("order_tracking").select("status").eq("order_id", order_id).limit(1).execute()
        if tracking_res.data:
            tracking_status = normalize_tracking_status(str(tracking_res.data[0].get("status") or "ordered"))
    except Exception:
        pass

    event = {
        "order_id": order_id,
        "user_id": user_id,
        "event_type": "customer_follow_up",
        "status": tracking_status,
        "note": message,
        "event_time": now_utc().isoformat(),
    }
    try:
        sb.table("order_tracking_events").insert(event).execute()
    except Exception as exc:
        logger.error(f"Could not save follow-up message for order {order_id}: {exc}")
        raise HTTPException(status_code=500, detail="Could not submit follow-up message.")

    sms_alerts = notify_admins_order_follow_up_sms(
        order_id=order_id,
        user_id=user_id,
        tracking_status=tracking_status,
        message=message,
    )

    audit_log(
        event_type="ORDER_FOLLOW_UP_SUBMITTED",
        user_id=user_id,
        description=f"User submitted follow-up for order {order_id}.",
        metadata={"order_id": order_id, "message": message},
    )
    audit_log(
        event_type="ADMIN_ORDER_FOLLOW_UP_ALERT",
        user_id=user_id,
        description=f"Customer follow-up alert for order {order_id}.",
        metadata={"order_id": order_id, "message": message, "event_type": "customer_follow_up"},
    )
    audit_log(
        event_type="ADMIN_ORDER_FOLLOW_UP_SMS_ALERTED",
        user_id=user_id,
        description=(
            f"Admin SMS alerts queued for follow-up order {order_id}: "
            f"{sms_alerts['queued']}/{sms_alerts['attempted']} (failed={sms_alerts['failed']})."
        ),
        metadata={
            "order_id": order_id,
            "attempted": sms_alerts["attempted"],
            "queued": sms_alerts["queued"],
            "failed": sms_alerts["failed"],
        },
    )
    return {"status": "received", "order_id": order_id}


@app.post("/api/webhooks/distribution/order-status")
async def distribution_order_status_webhook(
    payload: DistributionStatusWebhookPayload,
    x_distribution_token: Optional[str] = Header(default=None),
):
    if DISTRIBUTION_WEBHOOK_TOKEN_RUNTIME:
        if x_distribution_token != DISTRIBUTION_WEBHOOK_TOKEN_RUNTIME:
            raise HTTPException(status_code=401, detail="Invalid distribution webhook token.")

    sb = ensure_supabase()
    order = fetch_order_by_id(sb, payload.order_id.strip())
    order_id = str(order.get("id"))
    user_id = str(order.get("user_id") or "")
    status = normalize_tracking_status(payload.status)
    now_iso = now_utc().isoformat()
    event_time = payload.event_time or now_iso

    tracking_rows = sb.table("order_tracking").select("*").eq("order_id", order_id).limit(1).execute().data or []
    tracking = tracking_rows[0] if tracking_rows else {}
    payment_intent: dict[str, Any] = {}
    if supports_table(sb, "payment_intents"):
        try:
            payment_rows = (
                sb.table("payment_intents")
                .select(
                    "order_id,reference,provider,status,provider_status,cash_component,credit_applied,address,updated_at,created_at"
                )
                .eq("order_id", order_id)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
                .data
                or []
            )
            if payment_rows:
                payment_intent = payment_rows[0]
        except Exception as exc:
            logger.warning(f"Could not fetch payment intent for distribution update {order_id}: {exc}")

    compensation = apply_order_terminal_compensation(
        sb,
        order=order,
        tracking=tracking,
        payment_intent=payment_intent,
        next_status=status,
    )

    delivery_address = payload.delivery_address or tracking.get("delivery_address")
    estimated_delivery_at = payload.estimated_delivery_at or tracking.get("estimated_delivery_at")
    payment_status_value = (
        "refunded"
        if compensation.get("applied")
        else (
            tracking.get("payment_status")
            or payment_intent.get("provider_status")
            or payment_intent.get("status")
            or "paid"
        )
    )
    tracking_update = {
        "order_id": order_id,
        "user_id": user_id,
        "status": status,
        "status_label": payload.status_label or format_order_status(status),
        "delivery_address": delivery_address,
        "payment_provider": tracking.get("payment_provider") or payment_intent.get("provider"),
        "payment_reference": tracking.get("payment_reference") or payment_intent.get("reference"),
        "payment_status": payment_status_value,
        "total_amount": tracking.get("total_amount") or float(order.get("total_amount") or 0),
        "credit_applied": tracking.get("credit_applied") or payment_intent.get("credit_applied") or 0,
        "cash_component": tracking.get("cash_component") or payment_intent.get("cash_component") or 0,
        "estimated_delivery_at": estimated_delivery_at,
        "updated_at": now_iso,
    }
    sb.table("order_tracking").upsert(tracking_update, on_conflict="order_id").execute()

    event_note = payload.note.strip()
    if compensation.get("applied"):
        restocked_units = int(compensation.get("restocked_units") or 0)
        credit_restored = round(to_float(compensation.get("credit_restored")), 2)
        event_note = (
            f"{event_note} Refund processed and inventory restocked ({restocked_units} unit(s), "
            f"credit restored GH₵{credit_restored:.2f})."
        )
    event = {
        "order_id": order_id,
        "user_id": user_id,
        "event_type": "distribution_status_update",
        "status": status,
        "note": event_note,
        "event_time": event_time,
    }
    sb.table("order_tracking_events").insert(event).execute()

    audit_log(
        event_type="ORDER_STATUS_UPDATED",
        user_id=user_id,
        description=f"Distribution update received for order {order_id}: {status}.",
        metadata={
            "order_id": order_id,
            "status": status,
            "note": payload.note,
            "compensation_applied": bool(compensation.get("applied")),
            "restocked_units": int(compensation.get("restocked_units") or 0),
            "credit_restored": round(to_float(compensation.get("credit_restored")), 2),
            "payment_refund_synced": bool(compensation.get("payment_refund_synced")),
        },
    )

    return {"status": "updated", "order_id": order_id, "current_status": status}


@app.post("/api/payments/paystack/initialize")
async def paystack_initialize(payload: PaystackInitializePayload):
    ensure_paystack_config()
    sb = ensure_supabase()

    email = normalize_email(payload.email)
    address = payload.address.strip()
    if not address:
        raise HTTPException(status_code=400, detail="Delivery address is required.")

    credit_state = await validate_checkout_credit(payload)
    credit_applied = float(credit_state["credit_applied"])
    credit_score = int(credit_state["credit_score"])
    credit_limit = float(credit_state["credit_limit"])
    cash_component = float(credit_state["cash_component"])

    try:
        validate_stock_availability(sb, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if cash_component <= 0:
        try:
            order_id = finalize_order_and_deduct_stock(
                sb=sb,
                payload=payload,
                credit_score=credit_score,
                credit_limit=credit_limit,
                credit_applied=credit_applied,
                cash_component=0.0,
                delivery_address=address,
                payment_provider="credit",
                payment_status="paid",
            )
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
        except Exception as exc:
            logger.error(f"Credit-only checkout failed for user {payload.userId}: {exc}")
            raise HTTPException(status_code=500, detail="Could not complete checkout.")

        return {
            "status": "success",
            "payment_required": False,
            "orderId": order_id,
            "cash_due": 0.0,
            "credit_applied": credit_applied,
        }

    callback_url = (payload.callback_url or PAYSTACK_CALLBACK_URL_RUNTIME or "").strip() or None
    reference = generate_payment_reference()

    try:
        sb.table("payment_intents").insert(
            {
                "reference": reference,
                "provider": "paystack",
                "status": "initialized",
                "user_id": payload.userId,
                "email": email,
                "address": address,
                "total_amount": payload.totalAmount,
                "cash_component": cash_component,
                "credit_applied": credit_applied,
                "credit_score": credit_score,
                "credit_limit": credit_limit,
                "items": [item.dict() for item in payload.items],
            }
        ).execute()
    except Exception as exc:
        logger.error(f"Could not persist payment intent ({reference}): {exc}")
        raise HTTPException(status_code=500, detail="Could not initialize payment.")

    paystack_payload: dict[str, Any] = {
        "email": email,
        "amount": cents_from_amount(cash_component),
        "reference": reference,
        "metadata": {
            "user_id": payload.userId,
            "credit_applied": credit_applied,
            "cash_due": cash_component,
            "total_amount": payload.totalAmount,
            "address": address,
            "item_count": len(payload.items),
        },
    }
    if callback_url:
        paystack_payload["callback_url"] = callback_url

    try:
        response = httpx.post(
            f"{PAYSTACK_BASE_URL.rstrip('/')}/transaction/initialize",
            json=paystack_payload,
            headers={"Authorization": f"Bearer {PAYSTACK_SECRET_KEY}"},
            timeout=25.0,
        )
        result = response.json()
    except Exception as exc:
        logger.error(f"Paystack initialization request crashed ({reference}): {exc}")
        try:
            update_payment_intent(sb, reference, {"status": "initialize_failed", "provider_status": "request_error"})
        except Exception:
            pass
        raise HTTPException(status_code=502, detail="Could not reach Paystack for payment initialization.")

    if response.status_code >= 300 or not result.get("status"):
        message = result.get("message") or "Paystack payment initialization failed."
        logger.error(f"Paystack initialization failed ({reference}): {message}")
        try:
            update_payment_intent(
                sb,
                reference,
                {
                    "status": "initialize_failed",
                    "provider_status": "failed",
                    "provider_payload": result,
                },
            )
        except Exception:
            pass
        raise HTTPException(status_code=502, detail=message)

    provider_data = result.get("data") or {}
    authorization_url = provider_data.get("authorization_url")
    access_code = provider_data.get("access_code")
    if not authorization_url:
        try:
            update_payment_intent(
                sb,
                reference,
                {
                    "status": "initialize_failed",
                    "provider_status": "missing_authorization_url",
                    "provider_payload": result,
                },
            )
        except Exception:
            pass
        raise HTTPException(status_code=502, detail="Paystack did not return an authorization URL.")

    try:
        update_payment_intent(
            sb,
            reference,
            {
                "status": "pending_user_authorization",
                "provider_status": "initialized",
                "provider_access_code": access_code,
                "provider_authorization_url": authorization_url,
                "provider_payload": result,
            },
        )
    except Exception as exc:
        logger.warning(f"Failed to update initialized intent metadata ({reference}): {exc}")

    audit_log(
        event_type="PAYMENT_INITIALIZED",
        user_id=payload.userId,
        description=f"Paystack initialized for order payment reference {reference}.",
        metadata={"reference": reference, "cash_due": cash_component, "credit_applied": credit_applied},
    )

    return {
        "status": "pending_payment",
        "payment_required": True,
        "reference": reference,
        "authorization_url": authorization_url,
        "cash_due": cash_component,
        "credit_applied": credit_applied,
    }


@app.post("/api/payments/paystack/verify")
async def paystack_verify(payload: PaystackVerifyPayload):
    ensure_paystack_config()
    sb = ensure_supabase()

    reference = payload.reference.strip()
    if not reference:
        raise HTTPException(status_code=400, detail="Payment reference is required.")

    intent = get_payment_intent_by_reference(sb, reference)
    if not intent:
        raise HTTPException(status_code=404, detail="Payment intent not found for the provided reference.")
    if extract_bulk_intent_metadata(intent):
        raise HTTPException(
            status_code=409,
            detail="This payment reference belongs to a bulk buy. Verify it via /api/deals/aggregate/payments/verify.",
        )

    existing_order_id = intent.get("order_id")
    if existing_order_id:
        return {
            "status": "success",
            "orderId": existing_order_id,
            "reference": reference,
            "already_processed": True,
        }

    try:
        response = httpx.get(
            f"{PAYSTACK_BASE_URL.rstrip('/')}/transaction/verify/{reference}",
            headers={"Authorization": f"Bearer {PAYSTACK_SECRET_KEY}"},
            timeout=25.0,
        )
        result = response.json()
    except Exception as exc:
        logger.error(f"Paystack verification request crashed ({reference}): {exc}")
        raise HTTPException(status_code=502, detail="Could not verify payment with Paystack.")

    if response.status_code >= 300 or not result.get("status"):
        message = result.get("message") or "Paystack payment verification failed."
        try:
            update_payment_intent(
                sb,
                reference,
                {
                    "status": "verification_failed",
                    "provider_status": "verification_failed",
                    "verify_payload": result,
                },
            )
        except Exception:
            pass
        raise HTTPException(status_code=400, detail=message)

    tx_data = result.get("data") or {}
    tx_status = str(tx_data.get("status") or "").lower()
    amount_paid = amount_from_cents(int(tx_data.get("amount") or 0))
    expected_cash = float(intent.get("cash_component") or 0)

    if tx_status != "success":
        try:
            update_payment_intent(
                sb,
                reference,
                {
                    "status": "payment_not_successful",
                    "provider_status": tx_status or "unknown",
                    "verify_payload": tx_data,
                },
            )
        except Exception:
            pass
        raise HTTPException(status_code=400, detail=f"Payment is not successful (status: {tx_status or 'unknown'}).")

    if amount_paid + 0.01 < expected_cash:
        try:
            update_payment_intent(
                sb,
                reference,
                {
                    "status": "payment_amount_mismatch",
                    "provider_status": tx_status,
                    "verify_payload": tx_data,
                },
            )
        except Exception:
            pass
        raise HTTPException(status_code=400, detail="Verified payment amount is lower than expected cash amount.")

    try:
        update_payment_intent(
            sb,
            reference,
            {
                "status": "paid",
                "provider_status": tx_status,
                "verify_payload": tx_data,
                "paid_at": tx_data.get("paid_at") or now_utc().isoformat(),
            },
        )
    except Exception as exc:
        logger.warning(f"Could not persist verification details for reference {reference}: {exc}")

    try:
        checkout_payload = build_checkout_payload_from_intent(intent)
        order_id = finalize_order_and_deduct_stock(
            sb=sb,
            payload=checkout_payload,
            credit_score=int(intent.get("credit_score") or 0),
            credit_limit=float(intent.get("credit_limit") or 0),
            credit_applied=float(intent.get("credit_applied") or 0),
            cash_component=float(intent.get("cash_component") or 0),
            delivery_address=str(intent.get("address") or ""),
            payment_provider=str(intent.get("provider") or "paystack"),
            payment_reference=reference,
            payment_status=tx_status,
        )
    except ValueError as exc:
        try:
            update_payment_intent(
                sb,
                reference,
                {"status": "fulfilment_failed", "provider_status": tx_status, "verify_payload": tx_data},
            )
        except Exception:
            pass
        raise HTTPException(
            status_code=409,
            detail=f"Payment succeeded, but order fulfilment failed: {exc}. Contact support for assistance.",
        )
    except Exception as exc:
        logger.error(f"Post-payment fulfilment failed for reference {reference}: {exc}")
        raise HTTPException(status_code=500, detail="Payment verified but order processing failed.")

    try:
        update_payment_intent(
            sb,
            reference,
            {
                "status": "completed",
                "provider_status": tx_status,
                "order_id": order_id,
                "completed_at": now_utc().isoformat(),
            },
        )
    except Exception as exc:
        logger.warning(f"Could not mark payment intent completed ({reference}): {exc}")

    return {"status": "success", "orderId": order_id, "reference": reference, "already_processed": False}


@app.post("/api/checkout")
async def process_checkout(payload: CheckoutPayload):
    """
    Legacy credit-only checkout endpoint.
    Use /api/payments/paystack/initialize for mixed credit+cash purchases.
    """
    sb = ensure_supabase()
    credit_state = await validate_checkout_credit(payload)
    cash_component = float(credit_state["cash_component"])
    if cash_component > 0:
        raise HTTPException(
            status_code=400,
            detail="Cash payment is required. Use /api/payments/paystack/initialize for this checkout.",
        )

    try:
        validate_stock_availability(sb, payload)
        order_id = finalize_order_and_deduct_stock(
            sb=sb,
            payload=payload,
            credit_score=int(credit_state["credit_score"]),
            credit_limit=float(credit_state["credit_limit"]),
            credit_applied=float(credit_state["credit_applied"]),
            cash_component=0.0,
            payment_provider="credit",
            payment_status="paid",
        )
        return {"status": "success", "orderId": order_id}
    except ValueError as exc:
        audit_log(
            event_type="ORDER_FAILED",
            user_id=payload.userId,
            description=str(exc),
            metadata={"attempted_total": payload.totalAmount, "items": [i.dict() for i in payload.items]},
        )
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error(f"Checkout error for user {payload.userId}: {exc}")
        raise HTTPException(status_code=500, detail="Checkout failed.")
