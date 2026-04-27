# TimeHuddle Placeholder

Meteor + React placeholder app for **TimeHuddle**. The production TimeHuddle app is hosted on **Vercel**; replace the link below with your real production URL when you have it.

**This repository is for testing only.** It does not implement the full functionality of TimeHuddle.

## Prerequisites

- [Meteor](https://docs.meteor.com/install.html) installed locally

## Run locally

```bash
npm install
npm start
```

This runs `meteor run`. Open the URL shown in the terminal (typically `http://localhost:3000`).

## Stack

- [Meteor](https://www.meteor.com/) (Mongo, DDP, `Meteor.startup`, etc.)
- React 18
- Bundling via **Rspack** (`@meteorjs/rspack` in `.meteor/packages`)
- UI: **Tailwind CSS**, **shadcn/ui**-style components (copied into `imports/components/ui`), **Lucide** icons

## Production app (Vercel)

Replace this with your TimeHuddle Vercel production URL: `https://your-timehuddle-app.vercel.app`

## Deploy on Render

This app ships as a **Docker** image: multi-stage build runs `meteor build`, then runs `node main.js` on Node 22. That matches how Meteor expects to run when you add methods, publications, or Mongo later.

### One-time setup

1. In the [Render Dashboard](https://dashboard.render.com), create a **Web Service** and connect this Git repository.
2. Choose **Docker** (Render detects the root [`Dockerfile`](Dockerfile)). Leave the default root directory unless this repo lives in a subfolder.
3. Add a **MongoDB** URL the app can use (Meteor includes the `mongo` package, so `MONGO_URL` is required in production):
   - Create a **Render MongoDB** instance, or use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas), then copy the connection string.
4. Set **Environment** variables on the web service:

   | Variable     | Value |
   | ------------ | ----- |
   | `MONGO_URL`  | **Required.** Your Mongo connection string (include a database name). |
   | `ROOT_URL`   | **Optional on Render.** If unset, the container entrypoint sets it from Render’s built-in `RENDER_EXTERNAL_URL` (your `https://…onrender.com` URL). Set `ROOT_URL` yourself when you use a **custom domain** so it matches the public URL. |
   | `BIND_IP`    | Optional; defaults to `0.0.0.0` in the image. |
   | `NODE_ENV`   | `production` (optional; also set in [`render.yaml`](render.yaml) for Blueprints). |
   | `ACTIVITYWORK_IMPORT_SHARED_SECRET` | **Optional.** Legacy shared secret: `x-activitywork-import-secret` or `Authorization: Bearer <same value>`. Does **not** attribute pushes to a user; see [multi-tenant deploy notes](docs/deploy-multitenant-activitywork-import.md). |
   | `ACTIVITYWORK_IMPORT_POST_REQUIRES_USER_TOKEN` | **Optional.** Set to `true` on production so **`POST /api/activitywork/import`** only accepts per-user Bearer tokens created in the app (stored hashed in Mongo). |

   Render injects **`PORT`** and **`RENDER_EXTERNAL_URL`**; Meteor reads `PORT` automatically.

   **Multi-tenant import:** each user generates a push token in the UI and puts it in local **aw-gateway**; details and migration from a single global `PUSH_TOKEN` are in [`docs/deploy-multitenant-activitywork-import.md`](docs/deploy-multitenant-activitywork-import.md).

5. Deploy. First build can take **15–25 minutes** while Meteor downloads toolchains inside Docker.

### Blueprint (optional)

[`render.yaml`](render.yaml) defines the same web service and prompts for `ROOT_URL` and `MONGO_URL` when you use **Blueprint** / Infrastructure as Code. Adjust `name` or `region` in the file if you want; pick a **plan** in the Render dashboard when you create the service.

Keep the `METEOR_RELEASE` build argument in the [`Dockerfile`](Dockerfile) aligned with the `METEOR@…` line in [`.meteor/release`](.meteor/release) whenever you upgrade Meteor.

### Local Docker smoke test

```bash
docker build -t timehuddle-placeholder .
docker run --rm -p 3000:3000 \
  -e PORT=3000 \
  -e BIND_IP=0.0.0.0 \
  -e ROOT_URL=http://localhost:3000 \
  -e MONGO_URL='mongodb://host.docker.internal:27017/timehuddle_placeholder' \
  timehuddle-placeholder
```

Use a reachable `MONGO_URL` (local Mongo, Atlas, etc.). Open `http://localhost:3000`.
