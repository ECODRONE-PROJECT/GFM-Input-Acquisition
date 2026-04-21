# Backend

Single backend service for both user and admin APIs.

## Run (development)

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Deploy on Render

This repo now includes:

- `render.yaml` (root): Render Blueprint for the backend web service.
- `backend/start_render.sh`: production start script using Render's `$PORT`.

Steps:

1. Push this repo to GitHub/GitLab.
2. In Render, create a new Blueprint and select the repo.
3. Set required environment variables in Render:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (recommended) or `SUPABASE_ANON_KEY`
   - `OTP_SIGNING_SECRET` (recommended)
4. Set optional variables if used in your flows:
   - `ADMIN_API_TOKEN`
   - `PAYSTACK_SECRET_KEY`
   - `PAYSTACK_CALLBACK_URL`
   - `CORS_ALLOW_ORIGINS`
5. Deploy and verify health at `/api/health`.

Notes:

- Uploads are written to local disk (`backend/uploads`). Render web instances use ephemeral filesystem unless you attach persistent storage.
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret and never expose it client-side.

## Structure

- `main.py`: compatibility entrypoint (`app` import for Uvicorn).
- `app/main.py`: FastAPI app + routes.
- `app/api/admin`, `app/api/user`: route split targets.
- `app/services/admin`, `app/services/user`, `app/services/shared`: service split targets.
- `sql/supabase_phone_otp_schema.sql`: Supabase schema script.
