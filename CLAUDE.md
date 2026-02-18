# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal bio/portfolio site at `f4rceful.wtf`. React + Vite + TypeScript, dark monospace theme inspired by starkow.dev.

## Commands

- `npm run dev` — start frontend dev server
- `npm run build` — type-check + production build
- `npm run preview` — preview production build
- `npx tsc -b` — type-check only
- `cd server && npm run dev` — start backend dev server (port 3001)

## Architecture

```
src/
  main.tsx          — entry point
  app.tsx           — root component (routing: / → MainPage, /admin → AdminPanel)
  pages/Main/       — main page, composes all sections in order
  sections/         — self-contained content blocks (Welcome, Skills, Projects, Links, Donations, Shoutbox, Footer)
  sections/AdminPanel/ — admin panel (login + message moderation), accessible at /admin
  components/       — reusable UI primitives (Bullet, BulletLink, CoolButton, CoolUrlButton, Spoiler, NoiseCanvas)
  components/icons.tsx — all SVG icon components
  hooks/            — custom hooks (useRotatingTitle, useInterval)

server/             — Express backend for shoutbox
  src/index.ts      — entry point, Express app
  src/db.ts         — PostgreSQL pool + table init
  src/routes/shoutbox.ts — public GET/POST messages
  src/routes/admin.ts    — admin login, approve/reply/delete
  src/middleware/auth.ts  — JWT auth middleware
```

**Pattern:** Pages compose Sections, Sections use Components. Each section/component has its own `style.css` imported directly.

## Styling

- Plain CSS per-component (no modules, no Tailwind). CSS variables defined in `index.css` (`:root`).
- Dark theme: bg `#161616`, accent `#64ffd8`, font JetBrains Mono (CDN).
- Markdown-style heading prefixes (`# `, `## `) via CSS `::before` pseudo-elements.
- List items use `- ` prefix via `li::before`.
