# Physics Fundamentals

An interactive physics-education site: nine topics, 53 sections, 1,000-odd
typeset equations, eight diagrams, and quizzes that check whether any of it
stuck. Built as a React single-page app with no backend at all.

Live: **https://developer007-socafe.github.io/physics-react/**

The original static site is still available at
[physics-fundamentals](https://developer007-socafe.github.io/physics-fundamentals/).

## No backend, by design

An earlier version proxied NASA's picture of the day, USGS earthquake data and
the ISS position through a FastAPI service. It is gone. Two reasons:

- GitHub Pages cannot run it. Pages serves files; there is no runtime.
- Every card it powered was a nicety. A page that teaches black holes does not
  need a live ISS fix to be worth reading.

Progress is the feature that replaced it, and it belongs on the client anyway.
There is no account, no server, and nothing leaves the browser.

## Stack

React 19, Vite 8, TypeScript, Tailwind CSS 4, shadcn/ui on Radix, KaTeX, GSAP,
react-router-dom.

HashRouter is what makes a static host viable: it needs no server-side rewrite
rules for deep routes.

## The learning loop

- **XP** — 50 per section marked read, 20 per question answered correctly
- **Levels** — eight ranks, from STUDENT to MASTER OF THE UNIVERSE
- **Streaks** — consecutive active days, with a one-day grace period so a
  streak does not evaporate before you have had a chance to open the site
- **Badges** — nine achievements
- **Quizzes** — 22 questions placed against the sections they test
- **Dashboard** — `/progress`, per-topic bars and a reset

Every one of those is derived from a single localStorage record
(`physics.progress.v1`) rather than stored separately, so the numbers cannot
drift out of sync with what the reader actually did. Sections are marked read
by hand, not inferred from scroll depth: scrolling past a formula proves
nothing about understanding it.

Answers are recorded once and never re-scored, so XP cannot be farmed by
guessing repeatedly.

## Layout

    scripts/
      extract_content.py    static site -> typed JSON, run once
      generate_diagrams.py  static SVG -> React components, run once
    src/
      components/           Math, Content, SiteChrome, Quiz, Progress, dialogs/, diagrams/
      content/              topics.json + types.ts
      lib/                  progress.ts, ProgressContext.tsx, questions.ts, gsap.ts

## Development

    npm install
    npm run dev
    npm run build

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

## Accessibility and motion

Every dialog has a title, every image has alt text, and progress bars carry a
text equivalent. GSAP animations are disabled under `prefers-reduced-motion`,
and the equation popup stays fully usable when they are.

Verified at 320, 390 and 768px across the home page, dashboard and topic
pages: no horizontal overflow, no raw LaTeX.