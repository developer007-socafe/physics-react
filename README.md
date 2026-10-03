# Physics Fundamentals — React Rebuild

A rebuild of the physics-education site as a React single-page app with a
FastAPI backend, replacing the earlier static HTML build. The original static
site remains live at
[developer007-socafe.github.io/physics-fundamentals](https://developer007-socafe.github.io/physics-fundamentals/).

## Live

- **Frontend** — https://developer007-socafe.github.io/physics-react/
  Deployed from `master` by `.github/workflows/deploy.yml`.
- **Backend** — not deployed. See *Deploying the backend* below.

## Why two pieces

The frontend is static and lives on GitHub Pages. The backend cannot, and does
not: Pages serves files and has no runtime. The split is deliberate. The
written pages never call a third-party API directly, so all nine topics render
and read correctly with no backend at all. Only the three live-data cards need
it, and each degrades to a plain message rather than breaking the page.

## Stack

- **Frontend** — React 19, Vite 8, TypeScript, Tailwind CSS 4, shadcn/ui on
  Radix, KaTeX, GSAP, react-router-dom (HashRouter)
- **Backend** — FastAPI, httpx, uvicorn; pytest and ruff

HashRouter is what makes a static host viable here: it needs no server-side
rewrite rules for deep routes.

## Layout

    backend/               FastAPI proxy, cache and normalisation layer
      app/main.py          routes, CORS, caching, failure shapes
      tests/               16 tests
      Dockerfile           container image for a container host
    scripts/
      extract_content.py   static site -> typed JSON, run once
      generate_diagrams.py static SVG -> React components, run once
    src/
      components/          Math, Content, SiteChrome, LiveFeeds, dialogs/, diagrams/
      content/             topics.json + types.ts
      hooks/useFeed.ts     loading / live / stale / error states
      lib/                 api client, GSAP helpers

## Content pipeline

`extract_content.py` parses the old static pages once and emits
`src/content/topics.json`. It is not part of the build.

Two subtleties worth preserving if you touch it:

- Math is **shielded from the HTML tag stripper**. A formula containing
  `ds^2 < 0` has a literal `<`, and a naive `<[^>]+>` regex matches from there
  to the next `>` and deletes the comparison. The result still parses as TeX,
  so it renders cleanly while asserting the opposite of the truth.
- `$$...$$` must be consumed **before** `$...$`, or the single-dollar pattern
  matches across the outer delimiters and exposes the interior to the stripper.

## Development

    npm install
    npm run dev                                  # frontend on :5173

    cd backend
    uv sync
    uv run uvicorn app.main:app --reload          # backend on :8000
    uv run pytest
    uv run ruff check .

The frontend needs the backend's CORS list to include the dev origin;
`localhost:5173` and the local preview ports are already listed in
`backend/app/main.py`.

## Deploying the backend

The container is ready but needs an account on a host that runs containers.
GitHub Pages will not work.

1. Pick a host — Fly.io, Render, Railway or Cloud Run all have free tiers.
2. Deploy `backend/Dockerfile`, using `backend/` as the build context.
3. Copy the resulting URL into the repository variable `VITE_API_URL`
   (Settings → Secrets and variables → Actions).
4. Re-run the deploy workflow. The frontend reads that variable at build time.

Until then the live widgets show their error state. That is the designed
behaviour, not a crash.

## Accessibility and motion

Every dialog has a title and every image has alt text. GSAP animations are
disabled under `prefers-reduced-motion`, and the equation popup remains fully
usable when they are.