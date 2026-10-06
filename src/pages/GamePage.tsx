import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import GameCanvas from '@/components/game/GameCanvas'

/* ------------------------------------------------------------------
   High-score key — scoped to this game so it never collides with
   the site's progress/achievement storage.
   ------------------------------------------------------------------ */
const HIGH_SCORE_KEY = 'blackHoleDive.highScore'

/* ------------------------------------------------------------------
   Pixel-font display utilities (site already loads Press Start 2P +
   VT323 in index.css — re-use the same tokens here).
   ------------------------------------------------------------------ */
const FONT_DISPLAY = 'Press Start 2P, ui-monospace, monospace'
const FONT_MONO    = 'VT323, ui-monospace, monospace'

/* ==================================================================
   Game page
   ================================================================== */

export default function GamePage() {
  type Phase = 'start' | 'playing' | 'gameOver'

  const [phase,   setPhase]   = useState<Phase>('start')
  const [score,   setScore]   = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [collected, setCollected] = useState(0)
  const [highScore, setHighScore] = useState(() => {
    try { return parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10) || 0 }
    catch { return 0 }
  })

  /* ---- persist high score on game over ---- */
  const onGameOver = useCallback((s: number, e: number, c: number) => {
    setScore(s); setElapsed(e); setCollected(c)
    const current = parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10) || 0
    if (s > current) {
      try { localStorage.setItem(HIGH_SCORE_KEY, String(s)) } catch { /* noop */ }
      setHighScore(s)
    }
    setPhase('gameOver')
  }, [])

  const startGame = useCallback(() => setPhase('playing'), [])
  const retry     = useCallback(() => {
    setScore(0); setElapsed(0); setCollected(0)
    setPhase('playing')
  }, [])

  /* ==================================================================
     Spotlight overlay — a radial-gradient veil that follows the cursor.
     This is the same visual effect Aceternity's SpotlightCard uses,
     implemented as plain CSS + mouse tracking (no extra package needed).
     ================================================================== */
  const spotRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!spotRef.current) return
      spotRef.current.style.setProperty('--mx', `${e.clientX}px`)
      spotRef.current.style.setProperty('--my', `${e.clientY}px`)
    }
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])

  /* ==================================================================
     Magnetic button — nudges toward the cursor. Shared ref so both
     the BEGIN and RETRY buttons use the same tracking logic.
     ================================================================== */
  const btnRef = useRef<HTMLButtonElement>(null)
  const btnDelta = useRef({ x: 0, y: 0 })
  useEffect(() => {
    const move = (e: MouseEvent) => {
      const b = btnRef.current
      if (!b) return
      const r = b.getBoundingClientRect()
      const cx = r.left + r.width  / 2
      const cy = r.top  + r.height / 2
      const dx = (e.clientX - cx) * 0.07
      const dy = (e.clientY - cy) * 0.07
      btnDelta.current = { x: dx, y: dy }
      b.style.transform = `translate(${dx}px, ${dy}px)`
    }
    const reset = () => {
      if (btnRef.current) btnRef.current.style.transform = 'translate(0, 0)'
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseleave', reset)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseleave', reset)
    }
  }, [])

  /* ==================================================================
     Render helpers — keep JSX readable.
     ================================================================== */

  const hudPanel = (
    <AnimatePresence>
      {phase === 'playing' && (
        <motion.div
          key="hud"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
          className="fixed top-0 left-0 right-0 z-20 pointer-events-none p-3 sm:p-4"
        >
          <div
            className="mx-auto max-w-5xl"
            style={{
              background: 'rgba(10,8,5,0.82)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
          >
            <div className="flex items-center justify-between gap-3 sm:gap-6 px-3 py-2 sm:px-4 sm:py-2.5">
            <Stat label="SCORE"        value={String(score)} />
            <Stat label="TIME"         value={`${elapsed}s`} />
            <Stat label="PARTICLES"   value={String(collected)} />
            <Stat label="HIGH SCORE"  value={String(highScore)} accent />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  const startScreen = (
    <AnimatePresence>
      {phase === 'start' && (
        <motion.div
          key="start"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-30 flex items-center justify-center p-4"
        >
          {/* CRT-grade dark veil */}
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(7,5,3,0.88)' }}
          />
          <div ref={spotRef} className="spotlight-overlay" />

          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative w-full max-w-md"
          >
            {/* Glow ring behind card — Aceternity signature */}
            <div
              className="absolute -inset-4 -z-10 rounded-2xl"
              style={{
                background: 'radial-gradient(ellipse at 50% 40%, rgba(77,226,194,0.12) 0%, rgba(77,226,194,0) 70%)',
                filter: 'blur(24px)',
              }}
            />

            <div
              className="relative rounded-xl p-5 sm:p-7"
              style={{
                background: 'rgba(18,13,6,0.92)',
                border: '1px solid var(--border)',
                boxShadow: '0 0 0 1px rgba(255,179,0,0.06), 0 8px 32px rgba(0,0,0,0.5)',
              }}
            >
              {/* Title */}
              <h1
                className="text-center"
                style={{
                  fontFamily: FONT_DISPLAY,
                  color: 'var(--foreground)',
                  textShadow: '0 0 8px rgba(255,179,0,0.5), 0 0 2px rgba(255,179,0,0.8)',
                  fontSize: 'clamp(0.85rem, 5vw, 1.35rem)',
                  letterSpacing: '0.04em',
                  lineHeight: '1.4',
                  marginBottom: '0.5rem',
                }}
              >
                BLACK HOLE<br className="sm:hidden" /> DIVE
              </h1>

              {/* Subtitle */}
              <p
                className="text-center mb-5"
                style={{
                  fontFamily: FONT_MONO,
                  color: 'var(--accent)',
                  fontSize: 'clamp(0.95rem, 3.5vw, 1.2rem)',
                  letterSpacing: '0.02em',
                }}
              >
                SURVIVE THE ABYSS · COLLECT THE LIGHT
              </p>

              {/* Instructions card */}
              <div
                className="mb-5 rounded bg-[rgba(255,179,0,0.04)] border border-[var(--border)] p-3 sm:p-4 text-left"
                style={{ boxShadow: 'inset 0 0 0 1px rgba(255,179,0,0.04)' }}
              >
                <p
                  className="mb-2 font-mono text-xs tracking-widest uppercase"
                  style={{ color: 'var(--muted-foreground)' }}
                >
                  Controls
                </p>
                <ul
                  className="space-y-1 font-mono text-sm"
                  style={{ color: 'var(--card-foreground)' }}
                >
                  <li>
                    <span style={{ color: 'var(--accent)' }}>← →</span> or{' '}
                    <span style={{ color: 'var(--accent)' }}>A D</span> — rotate ship
                  </li>
                  <li>
                    <span style={{ color: 'var(--foreground)' }}>↑</span> or{' '}
                    <span style={{ color: 'var(--foreground)' }}>W</span> — thrust forward
                  </li>
                  <li>
                    <span style={{ color: 'var(--foreground)' }}>Space</span> or{' '}
                    <span style={{ color: 'var(--foreground)' }}>Z</span> — burst thrust
                  </li>
                  <li>
                    Touch / drag on mobile — thrust toward your finger
                  </li>
                </ul>
                <p
                  className="mt-3 pt-3 font-mono text-xs leading-relaxed"
                  style={{
                    color: 'var(--muted-foreground)',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  Collect cyan particles for score. The event horizon
                  grows every second — don't let it swallow your ship.
                </p>
              </div>

              {/* BEGIN button — 48px tall, clears 44px touch */}
              <button
                ref={btnRef}
                className="magnetic-btn w-full"
                onClick={startGame}
                aria-label="Begin game"
              >
                <span
                  className="relative z-10"
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 'clamp(0.7rem, 3.5vw, 0.95rem)',
                    letterSpacing: '0.08em',
                  }}
                >
                  BEGIN
                </span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  const gameOverScreen = (
    <AnimatePresence>
      {phase === 'gameOver' && (
        <motion.div
          key="gameover"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-30 flex items-center justify-center p-4"
        >
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(7,5,3,0.9)' }}
          />
          <div ref={spotRef} className="spotlight-overlay" />

          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative w-full max-w-sm"
          >
            {/* Glow behind card */}
            <div
              className="absolute -inset-4 -z-10 rounded-2xl"
              style={{
                background: 'radial-gradient(ellipse at 50% 40%, rgba(255,92,92,0.10) 0%, rgba(255,92,92,0) 70%)',
                filter: 'blur(24px)',
              }}
            />

            <div
              className="relative rounded-xl p-5 sm:p-7"
              style={{
                background: 'rgba(18,13,6,0.92)',
                border: '1px solid var(--border)',
                boxShadow: '0 0 0 1px rgba(255,92,92,0.06), 0 8px 32px rgba(0,0,0,0.5)',
              }}
            >
              {/* Title */}
              <h1
                className="text-center mb-4"
                style={{
                  fontFamily: FONT_DISPLAY,
                  color: '#ff5c5c',
                  textShadow: '0 0 10px rgba(255,92,92,0.6), 0 0 3px rgba(255,92,92,0.9)',
                  fontSize: 'clamp(0.75rem, 4.5vw, 1.1rem)',
                  letterSpacing: '0.06em',
                }}
              >
                GAME OVER
              </h1>

              {/* Stats grid */}
              <div
                className="grid gap-3 mb-4 rounded bg-[rgba(0,0,0,0.3)] p-3 sm:p-4"
                style={{ border: '1px solid var(--border)' }}
              >
                <FinalStat label="FINAL SCORE"   value={String(score)}   highlight />
                <FinalStat label="TIME SURVIVED" value={`${elapsed}s`} />
                <FinalStat label="PARTICLES"     value={String(collected)} />
              </div>

              {/* High score */}
              <div
                className="mb-5 rounded bg-[rgba(77,226,194,0.06)] p-3 sm:p-4 text-center"
                style={{ border: '1px solid rgba(77,226,194,0.2)' }}
              >
                <p
                  className="font-mono text-xs tracking-widest uppercase mb-1"
                  style={{ color: 'var(--accent)' }}
                >
                  High Score
                </p>
                <p
                  className="font-display text-center"
                  style={{
                    fontFamily: FONT_DISPLAY,
                    color: 'var(--accent)',
                    fontSize: 'clamp(1.1rem, 6vw, 1.6rem)',
                    textShadow: '0 0 8px rgba(77,226,194,0.5)',
                  }}
                >
                  {highScore}
                </p>
              </div>

              {/* RETRY button — 48px tall */}
              <button
                ref={btnRef}
                className="magnetic-btn w-full"
                onClick={retry}
                aria-label="Retry game"
              >
                <span
                  className="relative z-10"
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontSize: 'clamp(0.7rem, 3.5vw, 0.95rem)',
                    letterSpacing: '0.08em',
                  }}
                >
                  RETRY
                </span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <div
      className="relative w-full h-screen overflow-hidden"
      style={{ backgroundColor: 'var(--background)' }}
    >
      {/* The canvas fills the viewport; overlays sit on top */}
      <GameCanvas onGameOver={onGameOver} isActive={phase === 'playing'} />

      {/* HUD during play */}
      {hudPanel}

      {/* Start screen */}
      {startScreen}

      {/* Game-over overlay */}
      {gameOverScreen}

      {/* Global style block — spotlight + magnetic button + stat components.
          Kept inline so this page is self-contained; the site's global
          index.css already handles scanlines + vignette on body. */}
      <style>{`
        /* ---- Spotlight overlay ---- */
        .spotlight-overlay {
          position: fixed;
          inset: 0;
          z-index: 31;
          pointer-events: none;
          background: radial-gradient(
            circle at var(--mx, 50%) var(--my, 50%),
            rgba(7,5,3,0)       0%,
            rgba(7,5,3,0)       10%,
            rgba(7,5,3,0.50)   28%,
            rgba(7,5,3,0.82)   50%,
            rgba(7,5,3,0.97)   100%
          );
        }

        /* ---- Magnetic button base ---- */
        .magnetic-btn {
          position: relative;
          display: block;
          width: 100%;
          min-height: 48px;
          padding: 0 1.5rem;
          margin-top: 0.75rem;
          border: none;
          border-radius: 6px;
          background: linear-gradient(135deg, var(--accent), #2aa890);
          color: #04120e;
          font-family: ${FONT_DISPLAY};
          font-size: clamp(0.7rem, 3.5vw, 0.95rem);
          letter-spacing: 0.08em;
          cursor: pointer;
          transition: transform 0.12s ease-out, box-shadow 0.12s ease-out;
          box-shadow:
            0 0 0 1px rgba(77,226,194,0.3),
            0 0 18px rgba(77,226,194,0.25),
            inset 0 1px 0 rgba(255,255,255,0.15);
          outline: none;
        }
        .magnetic-btn:hover {
          box-shadow:
            0 0 0 1px rgba(77,226,194,0.5),
            0 0 28px rgba(77,226,194,0.45),
            inset 0 1px 0 rgba(255,255,255,0.2);
        }
        .magnetic-btn:focus-visible {
          outline: 2px solid var(--ring);
          outline-offset: 3px;
        }
        .magnetic-btn:active {
          transform: translate(0, 0) scale(0.97);
        }

        /* ---- Stat row (HUD) ---- */
        .stat-label {
          display: block;
          font-family: ${FONT_DISPLAY};
          font-size: clamp(0.45rem, 2vw, 0.6rem);
          letter-spacing: 0.1em;
          color: var(--muted-foreground);
          margin-bottom: 0.1rem;
        }
        .stat-value {
          display: block;
          font-family: ${FONT_MONO};
          font-size: clamp(0.9rem, 4vw, 1.2rem);
          color: var(--card-foreground);
          letter-spacing: 0.02em;
        }
        .stat-value.accent {
          color: var(--accent);
          text-shadow: 0 0 6px rgba(77,226,194,0.4);
        }

        /* ---- Final stat (game-over card) ---- */
        .final-label {
          display: block;
          font-family: ${FONT_DISPLAY};
          font-size: clamp(0.45rem, 2vw, 0.6rem);
          letter-spacing: 0.1em;
          color: var(--muted-foreground);
          margin-bottom: 0.15rem;
        }
        .final-value {
          display: block;
          font-family: ${FONT_MONO};
          font-size: clamp(1rem, 5vw, 1.4rem);
          color: var(--card-foreground);
        }
        .final-value.highlight {
          color: var(--foreground);
          text-shadow: 0 0 8px rgba(255,179,0,0.5);
        }
      `}</style>
    </div>
  )
}

/* ------------------------------------------------------------------
   Small sub-components — defined outside the main component so they
   don't re-create on every render.
   ------------------------------------------------------------------ */

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="stat-label">{label}</span>
      <span className={`stat-value${accent ? ' accent' : ''}`}>{value}</span>
    </div>
  )
}

function FinalStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="final-label">{label}</span>
      <span className={`final-value${highlight ? ' highlight' : ''}`}>{value}</span>
    </div>
  )
}
