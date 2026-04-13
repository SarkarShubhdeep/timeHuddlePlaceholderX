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
