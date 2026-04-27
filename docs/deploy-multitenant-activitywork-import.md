# Deploy: multi-tenant ActivityWork import (Render / cloud)

This app accepts snapshot pushes at **`POST /api/activitywork/import`**. Each signed-in user can generate a **per-user push token** in the UI; the server stores only a **SHA-256 hash** in Mongo (`activitywork_push_tokens`). Successful pushes that resolve to a user are stored in **`activitywork_imports`** and can be subscribed to in the client.

## How this differs from the old single-token setup

Previously you may have set **`ACTIVITYWORK_IMPORT_SHARED_SECRET`** on the server to the **same** value as **`PUSH_TOKEN`** (or equivalent) in **aw-gateway**. That is a **global** secret: every gateway using it is the same “identity,” and imports are not attributed to a Meteor user.

Now:

| Piece | Role |
| ----- | ---- |
| **Per-user token** (from the app UI → “Generate push token”) | Raw secret shown **once**; user pastes it into **local aw-gateway** as `Authorization: Bearer <token>`. Server hashes it, looks up `userId`, persists to `activitywork_imports`. |
| **`ACTIVITYWORK_IMPORT_SHARED_SECRET`** (optional) | **Legacy / break-glass**: same behavior as before (`Bearer` equals secret, or `x-activitywork-import-secret` header). Imports succeed but **`userId` is not set** — they are **not** written to `activitywork_imports` (only the in-memory “latest” pointer is updated). |

## Recommended cloud configuration (multi-tenant)

1. **`MONGO_URL`** — Required. Same as today; must include a database name. Indexes for push tokens and imports are created on startup.
2. **`ROOT_URL`** — Set to your public HTTPS URL (Render sets this automatically unless you use a custom domain).
3. **Per-user pairing** — Each tester: create an account on the deployed site → **Generate push token** → put that value in **aw-gateway** env (whatever variable maps to the outbound `Authorization: Bearer …` header). Do **not** reuse one global secret for everyone if you want per-user history and console logs.
4. **Tighten POST (production)** — Set **`ACTIVITYWORK_IMPORT_POST_REQUIRES_USER_TOKEN=true`**. Then **`POST /api/activitywork/import` accepts only** a Bearer token that matches a row in **`activitywork_push_tokens`**. The old pattern “Bearer equals `ACTIVITYWORK_IMPORT_SHARED_SECRET`” **stops working for POST**, which prevents anonymous pushes while you keep a shared secret only for **`GET /api/activitywork/import/latest`** (or other tooling), if you still set it.
5. **`ACTIVITYWORK_IMPORT_SHARED_SECRET`** — After everyone uses UI tokens on POST, you can **rotate** this to a new random string known only to ops (for `GET …/latest` and emergencies), or remove it if you do not need that route open.

Optional tuning (unchanged from earlier releases):

| Variable | Purpose |
| -------- | ------- |
| `ACTIVITYWORK_IMPORT_MAX_BYTES` | Max JSON body size (see `validateSnapshotImport.js`). |
| `ACTIVITYWORK_IMPORT_RATE_WINDOW_MS` / `ACTIVITYWORK_IMPORT_RATE_MAX` | Per-IP rate limit for POST. |

## Migration checklist (single shared `PUSH_TOKEN` → per-user)

1. Deploy a build that includes accounts + push token UI + import path (this repo `main`).
2. For each human tester: sign in on production → generate token → update **local** aw-gateway env to use that token as Bearer (not the old global secret).
3. On Render, set **`ACTIVITYWORK_IMPORT_POST_REQUIRES_USER_TOKEN=true`** when all gateways are updated (or accept brief 401s for stragglers until they update).
4. Optionally rotate **`ACTIVITYWORK_IMPORT_SHARED_SECRET`** so the old value is no longer valid anywhere.

## Mongo collections (automatic)

| Collection | Contents |
| ---------- | -------- |
| `activitywork_push_tokens` | `userId`, `tokenHash`, `tokenLast4`, `updatedAt` |
| `activitywork_imports` | `userId`, `receivedAt`, metadata fields, `payload` |

No manual seeding of tokens in MongoDB is required; generation goes through Meteor methods after login.

## Related docs

- [plan-multitenant-activitywork-import.md](plan-multitenant-activitywork-import.md) — product/architecture plan.
- [handoff-manual-import-from-runtime.md](handoff-manual-import-from-runtime.md) — runtime / payload contract.
