import { useCallback, useEffect, useRef, useState } from 'react'
import './flappy-bat/FlappyBat.css'
import { createGame } from './flappy-bat/engine.js'
import { useScrollReveal } from '@/lib/gsap'

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

type Phase = 'ready' | 'playing' | 'dying' | 'over' | 'paused'

export default function FlappyBatGame() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<ReturnType<typeof createGame> | null>(null)
  const mutedRef = useRef(readFlag('flappyBatMuted'))
  const revealRef = useScrollReveal<HTMLDivElement>()

  const [phase, setPhase] = useState<Phase>('ready')
  const [score, setScore] = useState(0)
  const [coinsRun, setCoinsRun] = useState(0)
  const [best, setBest] = useState(0)
  const [coinsTotal, setCoinsTotal] = useState(0)
  const [newBest, setNewBest] = useState(false)
  const [muted, setMuted] = useState(() => readFlag('flappyBatMuted'))

  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  /* ─── actions ─── */
  const press = useCallback(() => gameRef.current?.press(), [])
  const togglePause = useCallback(() => gameRef.current?.togglePause(), [])

  const toggleMute = useCallback(() => {
    const next = !mutedRef.current
    mutedRef.current = next
    setMuted(next)
    gameRef.current?.setMuted(next)
    try {
      localStorage.setItem('flappyBatMuted', next ? '1' : '0')
    } catch {
      /* storage unavailable — ignore */
    }
  }, [])

  /* ─── boot the engine once ─── */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const game = createGame({
      canvas,
      onState: (s) => {
        setPhase(s.phase as Phase)
        setScore(s.score)
        setCoinsRun(s.coinsRun)
        setBest(s.best)
        setCoinsTotal(s.coinsTotal)
        setNewBest(s.newBest)
      },
    })
    gameRef.current = game
    game.setMuted(mutedRef.current)
    game.startLoop()

    // keep the canvas backing store in sync with its CSS size
    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => game.resize())
      ro.observe(canvas)
    }
    window.addEventListener('resize', game.resize)

    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', game.resize)
      game.destroy()
      gameRef.current = null
    }
  }, [])

  /* ─── auto-pause when the tab / window goes away ─── */
  useEffect(() => {
    const onHide = () => {
      if (document.hidden && gameRef.current) gameRef.current.pause()
    }
    const onBlur = () => {
      if (gameRef.current) gameRef.current.pause()
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('blur', onBlur)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  /* ─── keyboard ─── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      switch (e.code) {
        case 'Space':
        case 'ArrowUp':
        case 'KeyW':
        case 'Enter':
          e.preventDefault()
          if (!e.repeat) press()
          break
        case 'KeyP':
        case 'Escape':
          e.preventDefault()
          if (!e.repeat) togglePause()
          break
        case 'KeyM':
          e.preventDefault()
          if (!e.repeat) toggleMute()
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [press, togglePause, toggleMute])

  /* ─── pointer / touch ─── */
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return
      if (e.target instanceof Element && e.target.closest('button')) return
      e.preventDefault()
      press()
    },
    [press],
  )

  const over = phase === 'over'
  const paused = phase === 'paused'

  return (
    <div ref={revealRef} className="flappy-wrapper">
      <div
        ref={containerRef}
        className="flappy-stage"
        onPointerDown={onPointerDown}
        data-reveal
      >
        <canvas
          ref={canvasRef}
          className="flappy-screen"
          width={480}
          height={700}
          aria-label="Flappy Bat game canvas"
        />

        {/* HUD — hidden when in ready screen */}
        <div className={`flappy-hud ${phase === 'ready' ? 'flappy-hud-off' : ''}`}>
          <div className={`flappy-score ${score > 0 ? 'flappy-score-pop' : ''}`} key={score}>
            {score}
          </div>
          <div className="flappy-hud-row">
            <span className="flappy-hud-chip">BEST {best}</span>
            <span className="flappy-hud-chip">
              <i className="flappy-coin-dot" />
              {coinsRun}
            </span>
          </div>
        </div>

        {/* Top-right icon buttons */}
        <div className="flappy-top-right">
          <button
            type="button"
            className="flappy-icon-btn"
            onClick={togglePause}
            aria-label={paused ? 'Resume' : 'Pause'}
            title={paused ? 'Resume (P)' : 'Pause (P)'}
          >
            {paused ? '▶' : '❙❙'}
          </button>
          <button
            type="button"
            className="flappy-icon-btn"
            onClick={toggleMute}
            aria-label={muted ? 'Unmute' : 'Mute'}
            title={muted ? 'Unmute (M)' : 'Mute (M)'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>

        {/* READY */}
        {phase === 'ready' && (
          <div className="flappy-overlay">
            <h1 className={`flappy-title ${reduced ? '' : 'flappy-title-pulse'}`}>
              FLAPPY BAT
            </h1>
            <p className="flappy-subtitle">
              Press <strong>SPACE</strong> · <strong>↑</strong> · <strong>TAP</strong> to flap
            </p>
            <div className="flappy-stats">
              <div className="flappy-stat">
                <span className="flappy-stat-label">BEST</span>
                <span className="flappy-stat-value">{best}</span>
              </div>
              <div className="flappy-stat">
                <span className="flappy-stat-label">COINS</span>
                <span className="flappy-stat-value">{coinsTotal}</span>
              </div>
            </div>
            <button type="button" className="flappy-btn" onClick={press}>
              PLAY
            </button>
            <p className="flappy-hint">P pause · M mute</p>
          </div>
        )}

        {/* PAUSED */}
        {paused && (
          <div className="flappy-overlay">
            <h2 className="flappy-go-title flappy-pause-title">PAUSED</h2>
            <p className="flappy-final-score">SCORE {score}</p>
            <button type="button" className="flappy-btn" onClick={togglePause}>
              RESUME
            </button>
            <p className="flappy-hint">Press P or Esc</p>
          </div>
        )}

        {/* GAME OVER */}
        {over && (
          <div className="flappy-overlay">
            <h2 className="flappy-go-title">GAME OVER</h2>
            {newBest && <p className="flappy-new-best">NEW BEST!</p>}
            <p className="flappy-final-score">SCORE {score}</p>
            <p className="flappy-best-score">
              BEST {best} · {coinsRun} COINS
            </p>
            <button type="button" className="flappy-btn" onClick={press}>
              PLAY AGAIN
            </button>
            <p className="flappy-hint">Press SPACE or tap to restart</p>
          </div>
        )}
      </div>
      <p className="flappy-instructions">
        SPACE · ↑ · TAP to flap · P pause · M mute
      </p>
    </div>
  )
}
