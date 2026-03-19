# wp (minimal backend: users + whatsapp)

This is a **new Django project** created from your existing monolith.

It contains ONLY these apps copied from `yogi-backend/`:

- `users/` (login, JWT, user CRUD, password reset endpoints)
- `whatsapp/` (WhatsApp Cloud API + webhook + websocket consumers)
- `whatsapp_dashboard/` (dashboard APIs: contacts, campaigns, team inbox, stats)

Database is **PostgreSQL only**.

## Folder structure (what is what)

- `config/`
  - `settings.py`: project configuration (Postgres, installed apps, JWT, Channels)
  - `urls.py`: which URL paths map to which app
  - `asgi.py`: enables HTTP + WebSockets (Channels)
- `users/`: your auth + users APIs (this is the first thing to test)
- `whatsapp/`: webhook + send message + websocket routes
- `whatsapp_dashboard/`: dashboard endpoints and extra models
- `.env`: environment variables (DB, Redis, WhatsApp tokens)

## 0) One-time prerequisites

- Install **PostgreSQL** and make sure it is running on `localhost:5432`.
- Create a database (example: `wp_db`).
- (Optional but recommended for WebSockets) Install/run **Redis** on `127.0.0.1:6379`.

## 1) Configure `.env` (Postgres)

Edit `wp/.env`:

- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DB_HOST`
- `DB_PORT`

Example:

```env
DB_NAME=wp_db
DB_USER=postgres
DB_PASSWORD=admin@123
DB_HOST=localhost
DB_PORT=5432
```

## 2) Install dependencies (first time only)

From `wp/`:

```powershell
.\venv\Scripts\activate
python -m pip install -r requirements.txt
```

Note: dependencies were installed during setup already; you only need this if you recreate the venv.

## 3) Run migrations (creates tables in PostgreSQL)

```powershell
.\venv\Scripts\python.exe manage.py migrate
```

## 4) Create an admin user (for testing login)

This project’s custom user uses `email` as login, but the model still has a `username` field.

Run this (creates/updates an admin user):

```powershell
.\venv\Scripts\python.exe manage.py shell -c "from django.contrib.auth import get_user_model; User=get_user_model(); u,_=User.objects.get_or_create(email='admin@example.com', defaults={'username':'admin','full_name':'Admin','is_staff':True,'is_superuser':True}); u.set_password('Admin@12345'); u.is_staff=True; u.is_superuser=True; u.save(); print('admin ready:', u.email)"
```

## 5) Start the server

```powershell
.\venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000
```

## Milestone 1: Test ONLY users/auth APIs (do this first)

### Login

`POST /api/auth/login/`

Body:

```json
{ "email": "admin@example.com", "password": "Admin@12345" }
```

Response includes:
- `data.access` (JWT access token)
- `data.refresh` (JWT refresh token)

### Who am I

`GET /api/auth/me/` with header:

- `Authorization: Bearer <access_token>`

If these 2 work, your users + login are working.

## Milestone 2: Enable WhatsApp APIs

Base paths:

- `whatsapp` app: `/api/whatsapp/`
- `whatsapp_dashboard` app: `/api/whatsapp/dashboard/`

Important endpoints:

- `POST /api/whatsapp/webhook/` (Meta → your backend)
- `POST /api/whatsapp/send/` (your frontend → backend → Meta)

Fill these in `.env` for real WhatsApp:

```env
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_BUSINESS_ACCOUNT_ID=...
WHATSAPP_VERIFY_TOKEN=...
```

## WebSockets (real-time chat)

WebSockets require **Redis** because `CHANNEL_LAYERS` uses `channels_redis`.

WebSocket URLs:

- `ws://localhost:8000/ws/messages/`
- `ws://localhost:8000/ws/whatsapp/chat/<phone_number>/`
- `ws://localhost:8000/ws/team-inbox/`

