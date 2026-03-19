# wp — Code Map (Start Here)

This doc explains **where everything lives** and **how a request flows** so you can follow the code yourself.

---

## 1. Entry point: every request hits one place first

**File: `config/urls.py`**

When someone opens a URL or the frontend calls an API, Django looks at this file. It’s like a **routing table**:

```
URL path                          →  Where it goes
─────────────────────────────────────────────────────
/admin/                            →  Django admin (built-in)
/api/auth/login/                   →  users.views.CustomTokenObtainPairView  (login = JWT)
/api/auth/logout/                  →  users.views.LogoutView
/api/auth/refresh/                 →  refresh JWT token
/api/auth/me/                      →  users.views.UserViewSet “me” (current user)
/api/users/                        →  users/urls.py (all user-related APIs)
/api/whatsapp/                     →  whatsapp/urls.py (webhook, send message, etc.)
/api/whatsapp/dashboard/           →  whatsapp_dashboard/urls.py (dashboard APIs)
```

**What to do:** Open `config/urls.py` and read it line by line. Each `path(...)` is one route.

---

## 2. How Django knows which “apps” exist

**File: `config/settings.py`**

Look at `INSTALLED_APPS`. That list tells Django which apps are part of the project:

- `users` — login, user CRUD, password reset, profiles
- `whatsapp` — WhatsApp webhook, send message, WebSocket consumers
- `whatsapp_dashboard` — dashboard APIs (contacts, campaigns, messages, etc.)

`ROOT_URLCONF = 'config.urls'` means the main URL list is in `config/urls.py` (the file above).

---

## 3. Users app — login and user APIs

**URLs:** `config/urls.py` has `path('api/users/', include('users.urls'))`.  
So everything under `/api/users/` is defined in **`users/urls.py`**.

**File: `users/urls.py`**

- `/api/users/user/token/`         → **Login** (email + password → JWT access + refresh)
- `/api/users/token/refresh/`      → Refresh JWT
- `/api/users/user/logout/`       → Logout (blacklist refresh token)
- `/api/users/password/forgot/`    → Forgot password
- `/api/users/password/reset/`    → Reset password
- `/api/users/`                    → User list/create (ViewSet)
- `/api/users/<id>/`               → User detail/update/delete
- Plus profiles, addresses, preferences, contact, distributor (see the file)

**Who handles login:** `CustomTokenObtainPairView` in **`users/views.py`**.  
It uses a **serializer** (from SimpleJWT) that expects `email` and `password`, checks the user, and returns `{ access, refresh }` tokens. Your views also wrap the response in `{ status, message, data }` (see `APIResponseMixin` in the same file).

**Data (database):** **`users/models.py`**  
- `User` — email, password, full_name, phone, role (admin/employee/customer). Login uses `email` (USERNAME_FIELD).  
- `UserProfile`, `Address`, `UserPreferences`, `ContactMessage`, `DistributorEnquiry` — all linked to or used by User.

**Flow in short:**  
Request → `config/urls.py` → `users/urls.py` → `users/views.py` (e.g. `CustomTokenObtainPairView`) → uses `users/models.py` (User) and returns JSON.

---

## 4. WhatsApp app — HTTP APIs (webhook, send message)

**URLs:** `config/urls.py` has `path('api/whatsapp/', include('whatsapp.urls'))`.  
So everything under `/api/whatsapp/` is in **`whatsapp/urls.py`**.

**File: `whatsapp/urls.py`**

- `POST /api/whatsapp/webhook/`     → Meta (WhatsApp) sends events here
- `POST /api/whatsapp/send/`       → Your app sends a message (backend calls Meta API)
- `POST /api/whatsapp/send/template/` → Send template message
- `GET  /api/whatsapp/templates/`  → List templates
- `GET  /api/whatsapp/status/<id>/` → Message status

**Who handles:** **`whatsapp/views.py`** (e.g. `webhook`, `send_whatsapp_message`).  
Those views use **`whatsapp/services.py`** (e.g. `WhatsAppService`) to talk to Meta’s API and **`whatsapp/models.py`** to store messages.

**Flow in short:**  
Request → `config/urls.py` → `whatsapp/urls.py` → `whatsapp/views.py` → `whatsapp/services.py` + `whatsapp/models.py`.

---

## 5. WebSockets — different entry point (ASGI)

Normal HTTP goes through `config/urls.py`. WebSockets go through **ASGI**.

**File: `config/asgi.py`**

- `"http"`     → Django (same as before): all your REST APIs.
- `"websocket"` → **`whatsapp.routing.websocket_urlpatterns`** (no Django URLs here).

So **every WebSocket connection** is routed by **`whatsapp/routing.py`**.

**File: `whatsapp/routing.py`**

- `ws://localhost:8000/ws/messages/`                    → `WhatsAppConsumer` (broadcast all messages)
- `ws://localhost:8000/ws/whatsapp/chat/<phone_number>/` → `ChatConsumer` (chat per phone number)
- `ws://localhost:8000/ws/team-inbox/`                 → `TeamInboxConsumer` (team inbox)

**Who handles:** **`whatsapp/consumers.py`**  
- `WhatsAppConsumer` — joins group `whatsapp_messages`, receives `new_message` / `status_update` and sends JSON to the client.  
- `ChatConsumer` — joins group per phone, handles send/receive and can save to DB / call WhatsApp service.  
- `TeamInboxConsumer` — team inbox updates.

**Flow in short:**  
Browser/frontend opens `ws://...` → ASGI → `whatsapp/routing.py` → `whatsapp/consumers.py` (connect/disconnect/receive/send).  
Backend code elsewhere (e.g. after saving a message) uses **channel_layer.group_send(...)** to push to these consumers.

---

## 6. Dashboard APIs (contacts, campaigns, messages, etc.)

**URLs:** `path('api/whatsapp/dashboard/', include('whatsapp_dashboard.urls'))` in `config/urls.py`.  
So everything under `/api/whatsapp/dashboard/` is in **`whatsapp_dashboard/urls.py`**.

**What to do:** Open **`whatsapp_dashboard/urls.py`** and **`whatsapp_dashboard/views.py`**.  
Those define the REST endpoints the admin hub uses (contacts, campaigns, send message from dashboard, etc.). Models are in **`whatsapp_dashboard/models.py`**.

---

## 7. Order to read files (spoon-fed path)

1. **`config/settings.py`** — INSTALLED_APPS, DATABASES, CORS, CHANNEL_LAYERS (Redis).
2. **`config/urls.py`** — main URL list (HTTP only).
3. **`config/asgi.py`** — HTTP vs WebSocket routing.
4. **`users/urls.py`** — all user/auth URLs.
5. **`users/views.py`** — start with `CustomTokenObtainPairView` and `APIResponseMixin`; then `UserViewSet`.
6. **`users/models.py`** — User and related models.
7. **`users/serializers.py`** — how request/response JSON is validated and built.
8. **`whatsapp/urls.py`** — WhatsApp HTTP endpoints.
9. **`whatsapp/routing.py`** — WebSocket URLs.
10. **`whatsapp/consumers.py`** — WebSocket connect/disconnect/receive/send (start with `WhatsAppConsumer`).
11. **`whatsapp/views.py`** and **`whatsapp/services.py`** — webhook and send message logic.

Whenever you get a task, find the URL (or WebSocket path) from this map, then open the corresponding **urls → views/consumers → models/serializers** and follow the code. Use this file as your “map” so you always know where to start.
