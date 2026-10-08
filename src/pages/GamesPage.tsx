import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageTitle } from '@/components/layout/SiteChrome'
import { useScrollReveal } from '@/lib/gsap'

const FONT_DISPLAY = "'Press Start 2P', monospace"

interface GameEntry {
  title: string
  slug: string
  href: string
  description: string
  bestKey: string
  color: string
}

const GAMES: GameEntry[] = [
  {
    title: 'BLACK HOLE DIVE',
    slug: 'black-hole-dive',
    href: '/game/black-hole-dive',
    description:
      'Survive the abyss. Collect cyan particles as the event horizon grows around a retro pixel black hole. How long can you last?',
    bestKey: 'blackHoleDive.highScore',
    color: '#4de2c2',
  },
  {
    title: 'FLAPPY BAT',
    slug: 'flappy-bat',
    href: '/games/flappy-bat',
    description:
      'Classic flap-through-the-pipes arcade action with a retro CRT bat. Dodge pipes, collect coins, chase that high score.',
    bestKey: 'flappyBatBest',
    color: '#ffd76b',
  },
]

function readBest(key: string): string {
  try {
    const v = localStorage.getItem(key)
    return v ? v : ' —'
  } catch {
    return ' —'
  }
}

export default function GamesPage() {
  const revealRef = useScrollReveal<HTMLDivElement>()
  const spotlightRef = useRef<HTMLDivElement>(null)
  const [bestScores, setBestScores] = useState<Record<string, string>>({})

  // Load best scores on mount
  useEffect(() => {
    const next: Record<string, string> = {}
    for (const g of GAMES) next[g.slug] = readBest(g.bestKey)
    setBestScores(next)
  }, [])

  // Aceternity-style spotlight: a radial-gradient veil follows the cursor
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!spotlightRef.current) return
      const rect = spotlightRef.current.getBoundingClientRect()
      spotlightRef.current.style.setProperty('--mx', `${e.clientX - rect.left}px`)
      spotlightRef.current.style.setProperty('--my', `${e.clientY - rect.top}px`)
    }
    const el = spotlightRef.current
    if (!el) return
    el.addEventListener('mousemove', handleMove)
    return () => el.removeEventListener('mousemove', handleMove)
  }, [])

  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <div ref={revealRef} data-anim>
        <PageTitle
          eyebrow="// GAMES"
          title="ARCADE"
          tagline="Retro pixel games built into the physics learning platform. Your high scores are saved locally."
        />

      <p className="mb-6 max-w-xl text-sm text-muted-foreground">
        Interactive games built into the physics learning platform. Each one
        reinforces a concept — or just gives your brain a break with some retro
        pixel fun. Your high scores are saved locally in this browser.
      </p>

      <div
        ref={spotlightRef}
        className="relative grid gap-5 sm:grid-cols-2"
        style={{
          '--mx': '50%',
          '--my': '50%',
        } as CSSProperties}
      >
        {/* Spotlight overlay — a dark radial gradient that follows the cursor */}
        <div
          className="pointer-events-none absolute -inset-2 -z-10 rounded-xl"
          style={{
            background: !reduced
              ? 'radial-gradient(circle at var(--mx) var(--my), rgba(255,255,255,0.06) 0%, rgba(255,255,255,0) 60%)'
              : 'none',
          }}
        />

        {GAMES.map((game) => (
          <Card
            key={game.slug}
            className="relative overflow-hidden border-border/50 p-0"
          >
            {/* Glow accent matching the game's color */}
            <div
              className="absolute -inset-3 -z-10 rounded-xl opacity-20"
              style={{
                background: `radial-gradient(ellipse at 50% 35%, ${game.color}40 0%, ${game.color}00 70%)`,
                filter: 'blur(20px)',
              }}
            />

            <div className="p-6 pb-5">
              <h3
                className="mb-2 font-display text-xs uppercase tracking-widest"
                style={{ color: game.color }}
              >
                {game.title}
              </h3>
              <p className="mb-4 text-sm text-muted-foreground">
                {game.description}
              </p>
              <div className="mb-4 flex items-center gap-2 font-mono text-xs">
                <span className="text-muted-foreground">BEST</span>
                <span style={{ color: game.color }}>{bestScores[game.slug]}</span>
              </div>
              <Button asChild className="w-full">
                <Link
                  to={game.href}
                  style={{ fontFamily: FONT_DISPLAY }}
                  className="btn-game"
                >
                  PLAY
                </Link>
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <style>{`
        .btn-game {
          min-height: 44px;
          font-size: clamp(0.55rem, 2.2vw, 0.8rem);
          letter-spacing: 0.05em;
        }
      `}</style>
    </div>
  )
}
