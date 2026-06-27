# WhatsApp API Gateway

Multi-session WhatsApp gateway built on **Node.js + Express + whatsapp-web.js**, with a web dashboard for connection management, broadcast, message templates, an auto-reply bot, and a CRM inbox. Authentication uses **Google OAuth**, data is persisted in **MySQL**, and live updates (QR codes, session status, incoming/outgoing CRM messages) are pushed over **Socket.IO**.

Every session and every piece of data is **scoped per logged-in user** — one user can never see or control another user's sessions, contacts, templates, or bot flows.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Setup & Installation](#setup--installation)
5. [Environment Variables](#environment-variables)
6. [How It Works (Core Concepts)](#how-it-works-core-concepts)
7. [Authentication](#authentication)
8. [REST API Documentation](#rest-api-documentation)
9. [Socket.IO Events](#socketio-events)
10. [Database Schema](#database-schema)
11. [Security](#security)

---

## Architecture

```
Browser (dashboard / login)
   │   HTTPS + Session cookie (Google OAuth)
   ▼
Express app (index.js)  ──────────────►  MySQL (sessions, contacts, templates, bot flows, logs)
   │            │
   │            └── Socket.IO  ◄──────►  Browser (live QR, status, CRM stream)
   ▼
whatsapp-web.js Client (one per session, headless Puppeteer/Chromium)
   │
   ▼
WhatsApp Web
```

- The Express server owns an **in-memory array of WhatsApp clients** (`sessions`), one `whatsapp-web.js` Client per connected number.
- Session metadata (owner, ready state, phone) is mirrored to MySQL so sessions stay tied to their owner across restarts.
- The bot engine and CRM logger hook into each client's incoming-message event.

---

## Tech Stack

| Concern          | Library                                    |
| ---------------- | ------------------------------------------ |
| Web framework    | `express`                                  |
| WhatsApp client  | `whatsapp-web.js` (Puppeteer/Chromium)     |
| Realtime         | `socket.io`                                |
| Auth             | `passport` + `passport-google-oauth20`     |
| Sessions         | `express-session` + `express-mysql-session`|
| Database         | `mysql2` (promise pool)                     |
| Security headers | `helmet`                                   |
| Rate limiting    | `express-rate-limit`                       |
| File upload      | `express-fileupload`                       |
| QR rendering     | `qrcode`                                   |

---

## Project Structure

```
index.js                  Main server: routes, sockets, WhatsApp client lifecycle, bot engine wiring
config/
  database.js             MySQL pool + initDatabase()
  passport.js             Google OAuth strategy + session serialize/deserialize
models/
  store.js                All SQL queries (sessions, CRM, templates, bot, stats) — parameterized
helpers/
  formatter.js            phoneNumberFormatter() — normalizes numbers to WhatsApp JID
  botEngine.js            parseButtons, buildMenuText, buildPoll, matchFlow, matchPollOption, findWelcome
views/
  login.html              Google login page
  index.html              Connection dashboard (create session, scan QR, send/logout)
  broadcast.html          Bulk broadcast UI
  templates.html          Message template manager
  bot.html                Auto-reply flow manager
  crm.html                CRM inbox (live conversations)
assets/
  css/                    dashboard.css (design tokens) + crm.css
  js/                     crm.js (CRM client logic) + i18n.js (ID/EN translations)
  uploads/                User-uploaded media (served statically)
db_whatsapp_gateway.sql   Full database schema
```

---

## Setup & Installation

```bash
# 1. Install dependencies
npm install

# 2. Create the MySQL database and import the schema
mysql -u root -p < db_whatsapp_gateway.sql

# 3. Create a .env file (see next section) — never commit this file

# 4. Run
npm run dev      # development (nodemon, auto-restart)
npm start        # production
```

The server listens on `http://HOST:PORT` (default `http://localhost:6969`). Open it in a browser, sign in with Google, create a session, then scan the QR with WhatsApp on your phone.

---

## Environment Variables

All secrets are loaded from `.env` (gitignored) — **never hardcode them**.

| Variable                    | Purpose                                   |
| --------------------------- | ----------------------------------------- |
| `HOST`                      | Server host (default `localhost`)         |
| `PORT`                      | Server port (default `6969`)              |
| `NODE_ENV`                  | `production` enables secure cookies       |
| `SESSION_SECRET`            | Secret for signing session cookies        |
| `DB_HOST` / `DB_PORT`       | MySQL host / port                         |
| `DB_USER` / `DB_PASSWORD`   | MySQL credentials                         |
| `DB_NAME`                   | MySQL database name                       |
| `GOOGLE_CLIENT_ID`          | Google OAuth client ID                    |
| `GOOGLE_CLIENT_SECRET`      | Google OAuth client secret                |
| `GOOGLE_CALLBACK_URL`       | OAuth redirect (`/auth/google/callback`)  |
| `PUPPETEER_EXECUTABLE_PATH` | Optional path to a Chromium binary        |

---

## How It Works (Core Concepts)

### Sessions (WhatsApp connections)
A **session** is one connected WhatsApp number. Sessions are created over Socket.IO (`create-session`), which spins up a `whatsapp-web.js` Client. The client emits `qr` → the browser shows the QR → after scan it emits `ready`. Status flows: `initializing → qr → authenticated → ready` (or `auth_failure`). Each transition is broadcast via the `status` socket event and persisted to MySQL.

### Bot engine (auto-reply)
On every incoming message, `botEngine.js` is consulted: it matches the text against the session's enabled **flows** (by keyword `exact`/`contains`, or special `welcome`/`fallback` triggers). A matched flow can reply with text, an image, URL buttons, and a poll-based menu. The bot only runs for a session whose bot setting is enabled.

### CRM logging & live stream
Every incoming and outgoing message is written to `crm_messages`, and the contact row in `crm_contacts` is upserted (name, last message, unread count). The same events are pushed live to the owner's browser via `crm:incoming` / `crm:outgoing`, so the CRM inbox updates in real time without polling.

### Per-user isolation
`ensureAuth` guards every page and API route. Every state-changing handler additionally calls `store.sessionBelongsToUser(...)` before acting, so a user can only operate on resources they own.

---

## Authentication

Login is **Google OAuth only** — this app stores no passwords.

| Route                    | Method | Description                                                        |
| ------------------------ | ------ | ------------------------------------------------------------------ |
| `/login`                 | GET    | Login page (redirects to `/` if already signed in)                |
| `/auth/google`           | GET    | Starts Google OAuth (scope: profile, email). Rate-limited.        |
| `/auth/google/callback`  | GET    | OAuth callback → redirects to `/` on success, `/login` on failure |
| `/auth/logout`           | POST   | Ends the session → `{ status: true }`                             |
| `/me`                    | GET    | Current user → `{ status, user: { name, email, avatar } }`        |

Session cookies are `HttpOnly`, `SameSite=lax`, and `Secure` in production, with a 24-hour lifetime, stored server-side in MySQL.

---

## REST API Documentation

**Base URL:** `http://localhost:6969`

**Auth:** every endpoint below requires a valid session cookie (sign in via Google first). Unauthenticated API calls return `401`.

**Rate limits:** API routes `60 requests / minute`; login routes `20 / 15 minutes`.

**Response shape:** every JSON response includes a boolean `status`. Errors return `{ status: false, message: "..." }` with a generic message (details are logged server-side only).

### Page routes (return HTML)

| Route                 | Description          |
| --------------------- | -------------------- |
| `GET /`               | Connection dashboard |
| `GET /broadcast`      | Broadcast page       |
| `GET /templates-page` | Templates page       |
| `GET /bot-page`       | Bot flows page       |
| `GET /crm`            | CRM inbox page       |

---

### Sessions

#### `GET /sessions`
List the current user's sessions with live status.
```json
{ "status": true, "sessions": [ { "id": "sales", "description": "...", "status": "ready", "phone": "62812..." } ] }
```

#### `POST /logout`
Disconnect and remove a session.
| Field | Type   | Required | Notes                      |
| ----- | ------ | -------- | -------------------------- |
| `id`  | string | yes      | Matches `^[a-zA-Z0-9_-]+$` |

> Note: **creating** a session is done over Socket.IO (`create-session`), not REST — because the QR code is streamed back live.

---

### Messaging

#### `POST /send-message`
Send a plain text message from one of your sessions.
| Field     | Type   | Required | Notes                          |
| --------- | ------ | -------- | ------------------------------ |
| `sender`  | string | yes      | Session id you own             |
| `number`  | string | yes      | Recipient (auto-formatted JID) |
| `message` | string | yes      | Text body                      |

**Errors:** `400` missing fields · `403` not your session · `422` session not ready / number not registered · `500` send failed.

#### `POST /send-media`
Send media from a URL with an optional caption.
| Field     | Type   | Required | Notes                        |
| --------- | ------ | -------- | ---------------------------- |
| `sender`  | string | yes      | Session id you own           |
| `number`  | string | yes      | Recipient                    |
| `file`    | string | yes      | Publicly reachable media URL |
| `caption` | string | no       | Caption text                 |

#### `POST /upload`
Upload a media file (multipart field `file`, max 25 MB) and get back a public URL usable as the `file`/`image` field elsewhere.
```json
{ "status": true, "url": "http://localhost:6969/assets/uploads/<safe-name>" }
```
Filenames are sanitized and confined to the uploads directory (path-traversal safe).

#### `POST /broadcast`
Send a message (optionally with media and a button menu) to many numbers, with a delay between each.
| Field     | Type   | Required | Notes                                           |
| --------- | ------ | -------- | ----------------------------------------------- |
| `sender`  | string | yes      | Session id you own                              |
| `numbers` | string | yes      | Comma-separated list of numbers                 |
| `message` | string | no       | Body (buttons appended as a menu)               |
| `buttons` | array  | no       | Up to 5 `{ label, type: flow\|url, goto, url }` |
| `file`    | string | no       | Media URL                                       |
| `delay`   | number | no       | Seconds between sends (1–300, default 30)       |

Returns a per-number result array; broadcast totals and per-message logs are written to the database.
```json
{ "status": true, "results": [ { "number": "62812...@c.us", "status": true, "message": "Message sent" } ] }
```

---

### Statistics

#### `GET /stats/summary`
Total / success / failed message counts for the user.
```json
{ "status": true, "total": 120, "success": 110, "failed": 10 }
```

#### `GET /stats/daily`
Daily success/failed breakdown for charts.
```json
{ "status": true, "daily": [ { "day": "2026-06-27", "success": 30, "failed": 2 } ] }
```

---

### Templates

#### `GET /templates`
List the user's saved message templates.

#### `POST /templates`
Create a template.
| Field     | Type   | Required | Notes                                      |
| --------- | ------ | -------- | ------------------------------------------ |
| `title`   | string | yes      | ≤ 255 chars                                |
| `body`    | string | yes      | ≤ 5000 chars                               |
| `image`   | string | no       | Must be an uploaded `/assets/uploads/` URL |
| `buttons` | array  | no       | Up to 5 buttons (sanitized)                |

Returns `201 { status: true, id }`.

#### `DELETE /templates/:id`
Delete one of your templates by numeric id.

---

### Bot Flows (Auto-Reply)

#### `GET /bot/flows`
Returns all flows, your sessions, and per-session bot on/off settings.
```json
{ "status": true, "flows": [...], "sessions": [...], "settings": { "sales": true } }
```

#### `POST /bot/flows`
Create an auto-reply flow.
| Field          | Type   | Required | Notes                                        |
| -------------- | ------ | -------- | -------------------------------------------- |
| `session_id`   | string | yes      | Session you own                              |
| `name`         | string | yes      | ≤ 255 chars                                  |
| `trigger_type` | string | no       | `keyword` (default) · `welcome` · `fallback` |
| `keyword`      | string | cond.    | Required when `trigger_type = keyword`       |
| `match_mode`   | string | no       | `contains` (default) · `exact`               |
| `reply_body`   | string | yes      | ≤ 5000 chars                                 |
| `reply_image`  | string | no       | Uploaded `/assets/uploads/` URL              |
| `buttons`      | array  | no       | Up to 5 buttons                              |

Returns `201 { status: true, id }`.

#### `PATCH /bot/flows/:id`
Enable/disable a flow → body `{ "enabled": true }`.

#### `DELETE /bot/flows/:id`
Delete a flow by id.

#### `POST /bot/settings`
Turn the bot on/off for a whole session.
| Field        | Type    | Required | Notes            |
| ------------ | ------- | -------- | ---------------- |
| `session_id` | string  | yes      | Session you own  |
| `enabled`    | boolean | yes      | `true` / `false` |

---

### CRM

WhatsApp numbers are validated against `^\d{5,20}@(c\.us|lid)$`.

#### `GET /crm/contacts`
List conversations (most recent first, up to 200).
| Query    | Type   | Notes                                     |
| -------- | ------ | ----------------------------------------- |
| `search` | string | Matches number or name (≤ 64 chars)       |
| `label`  | string | `none` · `lead` · `customer` · `followup` |
| `status` | string | `new` · `open` · `done`                   |

```json
{ "status": true, "contacts": [ { "id": 1, "session_id": "sales", "wa_number": "62812...@c.us", "name": "Budi", "label": "lead", "status": "open", "last_message": "...", "last_at": "...", "unread": 2 } ] }
```

#### `GET /crm/conversation`
Load one conversation (marks it read; up to 300 messages).
| Query        | Type   | Required | Notes              |
| ------------ | ------ | -------- | ------------------ |
| `session_id` | string | yes      | Session you own    |
| `wa_number`  | string | yes      | Valid WhatsApp JID |

```json
{ "status": true, "detail": { "label": "...", "status": "...", "notes": "..." }, "messages": [ { "direction": "in", "body": "...", "created_at": "..." } ] }
```

#### `POST /crm/reply`
Reply to a contact from the inbox.
| Field        | Type   | Required | Notes           |
| ------------ | ------ | -------- | --------------- |
| `session_id` | string | yes      | Session you own |
| `wa_number`  | string | yes      | Valid JID       |
| `body`       | string | yes      | ≤ 4096 chars    |

#### `PATCH /crm/contact`
Update a contact's label, status, and notes.
| Field        | Type   | Required | Notes                                               |
| ------------ | ------ | -------- | --------------------------------------------------- |
| `session_id` | string | yes      | Session you own                                     |
| `wa_number`  | string | yes      | Valid JID                                           |
| `label`      | string | no       | `none` (default) · `lead` · `customer` · `followup` |
| `status`     | string | no       | `new` (default) · `open` · `done`                   |
| `notes`      | string | no       | ≤ 2000 chars                                        |

---

## Socket.IO Events

Connect with the session cookie (handled automatically by the browser). On connect, the socket joins a private `user:<id>` room so CRM events only reach their owner.

### Client → Server

| Event            | Payload                | Effect                                                     |
| ---------------- | ---------------------- | ---------------------------------------------------------- |
| `create-session` | `{ id, description }`  | Creates a WhatsApp session (id matches `^[a-zA-Z0-9_-]+$`) |
| `logout-session` | `{ id }`               | Logs out and removes a session you own                     |

### Server → Client

| Event            | Payload                               | Meaning                          |
| ---------------- | ------------------------------------- | -------------------------------- |
| `init`           | session list                          | Sent once on connect             |
| `session-added`  | `{ id, description }`                  | A new session was created        |
| `qr`             | `{ id, src }`                          | QR code data-URL to scan         |
| `status`         | `{ id, status }`                       | Status change (`qr`/`ready`/…)   |
| `remove-session` | `id`                                  | Session was logged out / removed |
| `message`        | `{ id, text }`                         | Info/error message for a session |
| `crm:incoming`   | `{ sessionId, waNumber, name, body }`  | New inbound message (live CRM)   |
| `crm:outgoing`   | `{ sessionId, waNumber, body }`        | New outbound message (live CRM)  |

---

## Database Schema

Defined in `db_whatsapp_gateway.sql`. All queries live in `models/store.js` and are **parameterized** (no string concatenation).

| Table          | Purpose                                                              |
| -------------- | ------------------------------------------------------------------- |
| `users`        | Google-authenticated users (name, email, avatar)                    |
| `sessions`     | Express session store (managed by `express-mysql-session`)          |
| `sessions_wa`  | WhatsApp sessions: id, owner, description, ready, phone              |
| `crm_contacts` | One row per conversation: label, status, notes, unread, last message |
| `crm_messages` | Full message history (direction `in`/`out`, body, timestamp)        |
| `templates`    | Saved message templates (title, body, image, buttons)               |
| `bot_flows`    | Auto-reply flows (trigger, keyword, reply, buttons, enabled)        |
| `bot_settings` | Per-session bot on/off                                              |
| `broadcasts`   | Broadcast run summaries (total/success/failed)                      |
| `message_logs` | Per-message send results (for statistics)                           |

---

## Security

This project follows a strict security baseline:

- **Auth on everything** — `ensureAuth` guards all pages and APIs; ownership is re-checked server-side on every action.
- **Parameterized queries only** — no SQL injection surface (`pool.execute` with placeholders).
- **XSS-safe rendering** — the client uses `textContent`, never `innerHTML`, for user data.
- **Input validation & whitelisting** — labels, statuses, trigger types, URLs, and WhatsApp numbers are validated against strict allow-lists/regex; lengths are capped.
- **Path-traversal protection** — uploaded filenames are sanitized and confined to the uploads directory.
- **Safe URLs** — only `http`/`https` button URLs are accepted; images must come from the app's own uploads path.
- **Secure sessions** — `HttpOnly`, `SameSite=lax`, `Secure` in production, 24h expiry, server-side store.
- **Rate limiting** — login and API endpoints are throttled to resist brute force and abuse.
- **Security headers** — set globally via `helmet`.
- **No secret leakage** — secrets come from `.env` (gitignored); error responses are generic and never expose stack traces or internal paths (full detail is logged server-side only).

---

**Author:** Mahdian · License: MIT
