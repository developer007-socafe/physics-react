/**
 * The status HUD: level, XP, streak, and the badge shelf.
 *
 * Styled as a terminal readout rather than a game overlay. The whole thing is
 * derived from one localStorage record, so it renders instantly on load with no
 * network request and no loading state to design for.
 */
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useProgressContext } from '@/lib/ProgressContext'
import { LEVEL_LABELS } from '@/lib/progress'
import { useState } from 'react'

/* ---------------------------------------------------------------- */
/* HUD                                                               */
/** Compact level + XP readout, safe to drop into any page. */
export function ProgressHud() {
  const { stats, reset } = useProgressContext()
  const [confirming, setConfirming] = useState(false)

  return (
    <Card className="my-6" data-reveal>
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-display text-xs text-accent">
              LEVEL {stats.level}
            </span>
            <span className="font-mono text-sm">{stats.levelName}</span>
          </div>

          <div className="mt-3">
            <div className="mb-1 flex justify-between font-mono text-xs text-muted-foreground">
              <span>{stats.xp} XP</span>
              {stats.xpForNextLevel > 0 ? (
                // "170 / 300" would read as "170 of the 300 you still need",
                // which is wrong -- 300 is the width of the level band, and
                // what remains is the difference. State both plainly.
                <span>
                  {stats.xpForNextLevel - stats.xpIntoLevel} XP to{' '}
                  {LEVEL_LABELS[stats.level + 1] ?? 'the next level'}
                </span>
              ) : (
                <span>maximum level</span>
              )}
            </div>
            <Progress
              value={
                stats.xpForNextLevel
                  ? Math.round((stats.xpIntoLevel / stats.xpForNextLevel) * 100)
                  : 100
              }
              className="h-2"
            />
          </div>
        </div>

        <dl className="flex gap-5 font-mono text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">STREAK</dt>
            <dd className="text-accent">
              {stats.streak} day{stats.streak === 1 ? '' : 's'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">SECTIONS</dt>
            <dd>
              {stats.completedCount}/{stats.totalSections}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">QUIZ</dt>
            <dd>{stats.accuracy}%</dd>
          </div>
        </dl>
      </div>

      <div className="mt-4 border-t border-border/60 pt-3">
        {confirming ? (
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            <span>Delete all progress permanently?</span>
            <Button
              size="sm"
              variant="destructive"
              className="font-mono"
              onClick={() => {
                reset()
                setConfirming(false)
              }}
            >
              YES, ERASE
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="font-mono"
              onClick={() => setConfirming(false)}
            >
              CANCEL
            </Button>
          </div>
        ) : (
          <button
            type="button"
            className="font-mono text-xs text-muted-foreground underline"
            onClick={() => setConfirming(true)}
          >
            reset progress
          </button>
        )}
      </div>
    </Card>
  )
}

/* ---------------------------------------------------------------- */
/* Badges                                                            */
/** ---------------------------------------------------------------- */

export function BadgeShelf() {
  const { badges } = useProgressContext()
  const earned = badges.filter((b) => b.earned).length

  return (
    <section className="my-6" data-reveal>
      <h2 className="font-display text-xs">ACHIEVEMENTS</h2>
      <p className="mb-4 mt-2 font-mono text-sm text-muted-foreground">
        {earned} of {badges.length} unlocked
      </p>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {badges.map((badge) => (
          <li key={badge.id}>
            <div
              className={[
                'flex h-full flex-col items-center gap-1 border p-3 text-center',
                badge.earned
                  ? 'border-accent/60 bg-accent/10'
                  : 'border-border/60 opacity-45',
              ].join(' ')}
              title={badge.description}
            >
              <span
                className={`text-2xl ${badge.earned ? 'text-accent' : 'text-muted-foreground'}`}
                aria-hidden="true"
              >
                {badge.glyph}
              </span>
              <span className="font-mono text-xs">
                {badge.earned ? badge.name : '???'}
              </span>
              <span className="text-xs leading-tight text-muted-foreground">
                {badge.description}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ---------------------------------------------------------------- */
/* Toast                                                             */
/** ---------------------------------------------------------------- */

/**
 * Announces a badge the moment it is earned.
 *
 * Position fixed rather than inline so it reads as an event rather than part
 * of the page the reader was on. It does not steal focus: the reader may be
 * mid-paragraph, and interrupting them to read a congratulations is hostile.
 */
export function BadgeToast() {
  const { freshBadges, badges, dismissFreshBadges } = useProgressContext()

  if (freshBadges.length === 0) return null
  const earned = badges.filter((b) => freshBadges.includes(b.id))

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[60] max-w-xs border border-accent bg-background/95 p-3 shadow-lg"
    >
      <p className="font-display text-[0.65rem] text-accent">ACHIEVEMENT UNLOCKED</p>
      <ul className="mt-2 flex flex-col gap-1">
        {earned.map((badge) => (
          <li key={badge.id} className="font-mono text-sm">
            <span className="text-accent">{badge.glyph}</span> {badge.name}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={dismissFreshBadges}
        className="mt-2 font-mono text-xs text-muted-foreground underline"
      >
        dismiss
      </button>
    </div>
  )
}

export { Badge }