# Plan: multi-tenant ActivityWork import (TimeHuddlePlaceholder)

**Scope:** This plan targets **TimeHuddlePlaceholder** only. **aw-gateway** already sends `POST` + optional `Authorization: Bearer <token>`; this app will learn to **resolve a user from that token** and **store snapshots per user** instead of relying on a single global `ACTIVITYWORK_IMPORT_SHARED_SECRET` for all testers.

**See also:** [agent-handover-activitywork-timehuddle.md](agent-handover-activitywork-timehuddle.md), [handoff-manual-import-from-runtime.md](handoff-manual-import-from-runtime.md).

**Links:** Test deploy [timehuddleplaceholderx.onrender.com](https://timehuddleplaceholderx.onrender.com/) · Gateway repo [github.com/SarkarShubhdeep/aw-gateway](https://github.com/SarkarShubhdeep/aw-gateway)

---

## 1. Goals

1. **Accounts** — Users can sign up / sign in to TimeHuddlePlaceholder (Meteor accounts).
2. **Per-user push token** — Each user can create, view (once or masked), and rotate a **secret** stored server-side; they paste the same value into local **aw-gateway** as `PUSH_TOKEN`.
3. **Persisted imports** — Inbound snapshot JSON is **saved in Mongo** scoped by `userId` (not only in-memory “latest”).
4. **UI** — Logged-in users see **their** snapshot history (at minimum: latest + list with timestamps); settings page to manage the push token.
5. **Import auth** — `POST /api/activitywork/import` accepts a request iff the `Bearer` (or agreed header) matches **that user’s** registered token, then attributes the document to that user.

---

## 2. Non-goals (this phase)

- Changing **aw-gateway** feature set (only **documentation** may be updated to describe per-user token pairing).
- OAuth providers (optional later); start with **email + password** unless product prefers otherwise.
- File-system storage of JSON on disk; **Mongo collections** are sufficient.
- Production-grade abuse prevention beyond reasonable rate limits + HTTPS (iterative hardening as needed).

---

## 3. Current state (baseline)

- HTTP import in `imports/api/activityWork/importHttp.js` with optional global `ACTIVITYWORK_IMPORT_SHARED_SECRET`.
- Validation in `validateSnapshotImport.js` (permissive JSON, size limits).
- “Pushed snapshot” UI reads **last** import via a Meteor method / in-memory store (exact mechanism as implemented at plan time).
- **Gap:** one shared secret for the whole deploy; no per-user storage or auth.

---

## 4. Proposed architecture

| Layer | Behavior |
| ----- | -------- |
| **Auth** | `accounts-password` (or `accounts-ui` for rapid prototyping); link registration to user profile. |
| **Token storage** | Prefer **hashed** token in DB (compare HMAC/SHA-256 of incoming Bearer to stored hash). Optional: show plaintext **only once** on generation. |
| **Resolution** | On import: `lookup userId by token hash` → if found, `insert` snapshot document with that `userId` + `receivedAt` + `payload`. |
| **Global secret (optional)** | Keep `ACTIVITYWORK_IMPORT_SHARED_SECRET` as a **legacy / break-glass** or admin key during migration, or remove after cutover. |

---

## 5. Data model (suggested)

**Collection e.g. `activitywork.imports` (or `ActivityWorkImports`):**

- `userId` (string, indexed)
- `receivedAt` (Date, indexed)
- `payload` (Object) — full snapshot body as today
- Optional: `clientIp`, `schemaVersion` from payload, `eventCount` denormalized for list UI

**Collection e.g. `users` extension or `activitywork.pushTokens`:**

- `userId` (unique)
- `tokenHash` (string) + `tokenLast4` for display (optional)
- `createdAt` / `rotatedAt`

*(Exact field names to match project conventions; Meteor may use a single `Meteor.users` custom field for “current push token hash” for MVP.)*

---

## 6. Import flow (target)

1. Client `POST` with JSON body (unchanged) + `Authorization: Bearer <raw_token>`.
2. Server hashes raw token, finds `userId`.
3. If no match, **401** (and optionally check legacy global secret for backward compatibility).
4. If match, `validate` + `insert` import document; update “latest for user” for fast UI if desired.
5. Rate limit still applies per IP and optionally per `userId`.

---

## 7. UI (minimum)

- **Settings / Profile:** “Generate push token” / “Regenerate” (with confirmation; invalidates old aw-gateway `PUSH_TOKEN` until user updates local `.env`).
- **Snapshot view:** only when logged in; list or table of imports for `Meteor.userId()`; detail view of one payload.
- **Logged-out:** no access to per-user data; import without valid user token still fails (unless legacy global secret kept temporarily).

---

## 8. Security notes

- Enforce **HTTPS** on the hosted test site; document that **tokens are secrets** (do not commit `.env`, do not log raw Bearer).
- Regenerate = revoke old token server-side.
- Do not log full `Authorization` header in production.

---

## 9. Phased delivery (suggested)

| Phase | Deliverable |
| ----- | ----------- |
| **A** | Add `accounts-password`, basic login/logout UI shell. |
| **B** | Data model + methods: `generatePushToken`, `getImportHistory`, `getImportById` (or paginated). |
| **C** | Rework `importHttp.js`: resolve user from Bearer hash; `insert` Mongo; deprecate or gate global-only path. |
| **D** | Update “Pushed snapshot” to read from DB for current user; show history. |
| **E** | Docs + README: how to pair [aw-gateway](https://github.com/SarkarShubhdeep/aw-gateway) with a **user-specific** token on the test site. |

---

## 10. Open questions

- **Latest only vs full history in UI?** (Plan allows history; can ship “latest + last N” first.)
- **One token per user vs multiple named devices?** (MVP: one; extend with label + multiple hashes.)
- **Migration:** existing in-memory or global-secret imports on Render — one-time data loss acceptable for placeholder?

---

## 11. Out of scope for this file

- Render env var naming beyond what the server still needs (`ROOT_URL`, `MONGO_URL`, etc.).
- Changes to the [YouTube](https://youtube.com/shorts/xnlbORo4pR0?feature=share) demo (update link/copy only when the new UX ships).

*Document version: 1.0 — planning only; implementation tasks should be tracked in the issue tracker.*
