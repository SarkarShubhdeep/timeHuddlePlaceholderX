# Agent handover: TimeHuddle Placeholder ↔ ActivityWork (SDK + deployment reality)

Use this document as the **system prompt / context block** when onboarding a new agent on this repository. It states facts about the codebase and the networking model so you do not re-derive them from scratch.

**See also (next steps — manual export / import):** [handoff-manual-import-from-runtime.md](handoff-manual-import-from-runtime.md) (this repo), [activitywork-runtime/docs/handoff-manual-export-to-timehuddle.md](../../activitywork-runtime/docs/handoff-manual-export-to-timehuddle.md), [activitywork-sdk/docs/handoff-manual-import-support.md](../../activitywork-sdk/docs/handoff-manual-import-support.md), [docs/handoff-activitywork-sdk-manual-import.md](../../docs/handoff-activitywork-sdk-manual-import.md) (monorepo SDK index).

---

## What this repo is

- **TimeHuddlePlaceholder** is a **Meteor 3.4 + React 18** test app (not production TimeHuddle on Vercel).
- Stack notes: Rspack bundling, Tailwind, shadcn-style UI under `imports/components/ui`.
- Purpose: integration checks and placeholder UI for **TimeHuddle** concepts, including **ActivityWork**.

---

## What was integrated (ActivityWork SDK)

- **NPM package:** `@sarkarshubh/activitywork-sdk` **≥ 0.2.0-beta.0** (see repo `package.json`). Typed HTTP client for **ActivityWork** public APIs—not ActivityWatch directly. Snapshot **manual import** validation uses **`validateSnapshotPayload`** from the SDK.
- **Design choice (intentional):** All SDK usage is **server-only**. The browser never imports the SDK (avoids CORS and keeps secrets off the client).
- **Mechanism:** `Meteor.methods` under the `activityWork.*` namespace; the React client uses `**Meteor.callAsync`**.

### Files to know


| Role                                                                   | Path                                                                                      |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Lazy SDK client singleton                                              | `[imports/api/activityWork/createClient.js](../imports/api/activityWork/createClient.js)` |
| Method definitions + error mapping                                     | `[imports/api/activityWork/methods.js](../imports/api/activityWork/methods.js)`           |
| Registers methods + HTTP import route on startup                     | `[server/main.js](../server/main.js)` imports `"/imports/api/activityWork/methods.js"` and `"/imports/api/activityWork/importHttp.js"` |
| Manual snapshot import (validation + `POST` handler)                  | `[imports/api/activityWork/validateSnapshotImport.js](../imports/api/activityWork/validateSnapshotImport.js)`, `[imports/api/activityWork/importHttp.js](../imports/api/activityWork/importHttp.js)` |
| UI: ActivityWork switch, snapshot import (paste + file), snapshot link | `[imports/ui/App.jsx](../imports/ui/App.jsx)`                                             |


### Registered methods

- `activityWork.checkHealth` → `client.checkHealth()`
- `activityWork.preview` → `client.preview({ limit })` with **limit clamped 1–100**
- `activityWork.snapshotUrl` → `getSnapshotUrl(client.baseUrl, query)`; query uses env for range/bucket

SDK errors (`ActivityWorkTimeoutError`, `ActivityWorkHttpError`, etc.) are mapped to `**Meteor.Error`** with stable string codes (e.g. `activity-work-timeout`). No stack traces intended for the client.

### Environment variables (server process)


| Variable                      | Purpose                                                                       |
| ----------------------------- | ----------------------------------------------------------------------------- |
| `ACTIVITYWORK_URL`            | ActivityWork origin; default `**http://localhost:5601**` if unset             |
| `ACTIVITYWORK_TOKEN`          | Optional; passed as SDK `getToken` when set                                   |
| `ACTIVITYWORK_SNAPSHOT_RANGE` | One of `5m`, `15m`, `30m`, `1h`, `3h`, `1d`; invalid values fall back to `1h` |
| `ACTIVITYWORK_BUCKET_ID`      | Optional; included in snapshot URL query when set                             |
| `ACTIVITYWORK_IMPORT_MAX_BYTES` | Max JSON body size for manual snapshot import (default **2 MiB** if unset) |
| `ACTIVITYWORK_IMPORT_SHARED_SECRET` | Optional; when set, imports require header `X-ActivityWork-Import-Secret` or `Authorization: Bearer <secret>` on `POST` |
| `ACTIVITYWORK_IMPORT_RATE_MAX` | Max import requests per IP per window (default **30**); placeholder rate limit |
| `ACTIVITYWORK_IMPORT_RATE_WINDOW_MS` | Rate-limit window in ms (default **60000**) |

**Manual import URL:** set `TIMEHUDDLE_IMPORT_URL` in ActivityWork-runtime to **`<your app origin>/api/activitywork/import`** (same path as `ACTIVITYWORK_IMPORT_PATH` in `importHttp.js`). `POST` with `Content-Type: application/json` and body = snapshot JSON (`ok: true`).

**Security note (in code comments):** Methods and the import `POST` route are callable without app auth—acceptable for this **placeholder**; production TimeHuddle should gate behind auth (and tighten import rate limits / IP rules).

---

## The “local vs hosted” problem (important)

This is the recurring confusion to preserve for the next agent.

- **ActivityWatch** runs on the user’s machine and collects data locally.
- **ActivityWork-runtime** (HTTP layer in front of ActivityWatch-style data) often runs **locally** next to it (e.g. same machine, port 5601). That is valid and expected for dev.
- The SDK only performs **HTTP requests from the process that constructs the client**. Here, that is the **Meteor server**.

Therefore:

1. **Local TimeHuddle + local ActivityWork**
  Meteor server runs **on the same host** as ActivityWork.  
   `ACTIVITYWORK_URL=http://localhost:5601` means “this machine’s loopback”—**works**.
2. **Hosted TimeHuddle (e.g. Render) + ActivityWork only on a developer’s laptop**
  The Meteor server runs **in the cloud**. Its `localhost` is **the container**, not the developer’s PC.  
   The cloud server **cannot** reach the user’s private `localhost:5601` without extra infrastructure (tunnel, VPN, or deploying ActivityWork to a reachable URL).
3. **Hosted TimeHuddle + hosted ActivityWork**
  Set `ACTIVITYWORK_URL` to a URL the **server** can resolve and connect to (public HTTPS, internal service URL, etc.).

**Bottom line for handover:** The SDK “connects Huddle to ActivityWork” only in the sense that **whatever runs the Meteor server** must have network reachability to ActivityWork. It does not magically bridge from cloud Huddle to a user’s desktop ActivityWork without an explicit product/architecture path (local app, sync agent, tunnel, or hosted ActivityWork).

---

## Product directions (out of scope unless tasked)

Possible future models (do not implement unless the user asks):

- Desktop / local-first TimeHuddle: same pattern as today—local server → local ActivityWork.
- Cloud TimeHuddle: needs reachable ActivityWork, or a **local companion** that talks to ActivityWork and syncs summaries upstream.

---

## Verification commands

- Local run: `npm start` (Meteor), open the app URL, use **Import from local ActivityWork** or toggle **ActivityWork reachable from this server**.
- Build smoke test: `meteor build <output-dir> --server-only` (client + server should compile).
- Confirm SDK stays off client: search `imports/ui` and `client` for `@sarkarshubh/activitywork-sdk` — should be **none**.

---

## External references

- SDK repo / README: [github.com/SarkarShubhdeep/activitywork-sdk](https://github.com/SarkarShubhdeep/activitywork-sdk)
- Deploy notes for this app (Mongo, Render, Docker): root `[README.md](../README.md)`

---

## Suggested one-shot prompt for the new agent

Copy everything below the line into a new chat as user message (optionally attach this file).

---

You are working on **TimeHuddlePlaceholder**, a Meteor + React placeholder app. ActivityWork is integrated **server-side only** via `@sarkarshubh/activitywork-sdk`, `imports/api/activityWork/createClient.js`, `imports/api/activityWork/methods.js`, and `App.jsx` calling `Meteor.callAsync('activityWork.*')`.

**Critical context:** HTTP calls originate from the **Meteor server**. `ACTIVITYWORK_URL` defaulting to `http://localhost:5601` only works when ActivityWork is reachable **from that same process** (e.g. local dev). A **hosted** Meteor server cannot use a developer’s laptop `localhost` for ActivityWork unless tunnels/VPN/public URLs are set up.

Read `docs/agent-handover-activitywork-timehuddle.md` in the repo for file paths, env vars, and method names. Do not import the SDK from client code. Preserve the security note about unauthenticated methods in the placeholder. Ask the user before large product/architecture changes (e.g. cloud sync vs local-only).

---

*End of handover document.*