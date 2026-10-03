/**
 * Reading progress, persisted to localStorage.
 *
 * The whole progression system hangs off one record: which sections the reader
 * has finished, when they last worked, and how many questions they have got
 * right. Everything else -- XP, level, badges, streaks -- is derived from it
 * rather than stored, so the numbers can never drift out of sync with reality.
 *
 * There is no account and no server. Progress belongs to the browser that
 * earned it, which is the trade for having no backend at all.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'physics.progress.v1'

export interface ProgressRecord {
  /** section ids the reader has marked complete */
  completed: string[]
  /** ISO timestamps of each completion, for the streak calculation */
  completedAt: Record<string, string>
  /** quiz answers, keyed by question id */
  answers: Record<string, string>
  /** days on which at least one section was completed */
  activeDays: string[]
  /** total quiz questions answered correctly, ever */
  correct: number
  /** total quiz questions answered, ever */
  attempted: number
  /** timestamps of earned badge ids, for the "new" indicator */
  badges: string[]
}

const EMPTY: ProgressRecord = {
  completed: [],
  completedAt: {},
  answers: {},
  activeDays: [],
  correct: 0,
  attempted: 0,
  badges: [],
}

/** Today as YYYY-MM-DD in local time. */
function today(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function load(): ProgressRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY
    // Merge onto EMPTY so a record written by an older version -- missing a
    // field, or truncated by a half-finished write -- still loads instead of
    // throwing and wiping the reader's progress.
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<ProgressRecord>) }
  } catch {
    return EMPTY
  }
}

export function useProgress() {
  const [record, setRecord] = useState<ProgressRecord>(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
    } catch {
      // Private browsing or a full quota. Progress simply will not persist,
      // which is better than the page failing to render.
    }
  }, [record])

  const completeSection = useCallback((id: string) => {
    setRecord((prev) => {
      if (prev.completed.includes(id)) return prev
      const day = today()
      return {
        ...prev,
        completed: [...prev.completed, id],
        completedAt: { ...prev.completedAt, [id]: new Date().toISOString() },
        activeDays: prev.activeDays.includes(day)
          ? prev.activeDays
          : [...prev.activeDays, day],
      }
    })
  }, [])

  const uncompleteSection = useCallback((id: string) => {
    setRecord((prev) => {
      const { [id]: _removed, ...restAt } = prev.completedAt
      return {
        ...prev,
        completed: prev.completed.filter((x) => x !== id),
        completedAt: restAt,
      }
    })
  }, [])

  const answerQuestion = useCallback(
    (questionId: string, answer: string, correct: boolean) => {
      setRecord((prev) => {
        if (prev.answers[questionId] !== undefined) return prev
        return {
          ...prev,
          answers: { ...prev.answers, [questionId]: answer },
          correct: prev.correct + (correct ? 1 : 0),
          attempted: prev.attempted + 1,
        }
      })
    },
    [],
  )

  const awardBadges = useCallback((ids: string[]) => {
    if (ids.length === 0) return
    setRecord((prev) => ({ ...prev, badges: [...new Set([...prev.badges, ...ids])] }))
  }, [])

  const reset = useCallback(() => {
    setRecord(EMPTY)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Nothing useful to do; the in-memory record is already cleared.
    }
  }, [])

  return {
    record,
    completeSection,
    uncompleteSection,
    answerQuestion,
    awardBadges,
    reset,
  }
}

/* ---------------------------------------------------------------- */
/* Derived values                                                    */
/* ---------------------------------------------------------------- */

/** XP per completed section, plus a bonus for each correct first answer. */
export const XP_PER_SECTION = 50
export const XP_PER_CORRECT = 20

export interface Stats {
  completedCount: number
  totalSections: number
  percent: number
  xp: number
  level: number
  levelName: string
  xpIntoLevel: number
  xpForNextLevel: number
  streak: number
  accuracy: number
}

const LEVELS = [
  { at: 0, name: 'STUDENT' },
  { at: 200, name: 'LAB ASSISTANT' },
  { at: 500, name: 'JUNIOR RESEARCHER' },
  { at: 1000, name: 'RESEARCHER' },
  { at: 1800, name: 'SENIOR SCIENTIST' },
  { at: 2800, name: 'PRINCIPAL INVESTIGATOR' },
  { at: 4000, name: 'THEORETICIAN' },
  { at: 6000, name: 'MASTER OF THE UNIVERSE' },
]

/** Level titles by level number, for "130 XP to LAB ASSISTANT" style copy. */
export const LEVEL_LABELS = LEVELS.map((l) => l.name)

export function levelFor(xp: number) {
  let index = 0
  for (let i = 0; i < LEVELS.length; i += 1) {
    if (xp >= LEVELS[i].at) index = i
  }
  const current = LEVELS[index]
  const next = LEVELS[index + 1]
  return {
    level: index + 1,
    levelName: current.name,
    xpIntoLevel: xp - current.at,
    xpForNextLevel: next ? next.at - current.at : 0,
  }
}

/**
 * Consecutive days ending today or yesterday.
 *
 * Yesterday still counts: a streak that resets the moment you wake up before
 * checking in is a streak nobody keeps. Only the stored day strings matter,
 * so this stays correct without a timer.
 */
export function streakFrom(activeDays: string[]): number {
  if (activeDays.length === 0) return 0
  const days = new Set(activeDays)

  const now = new Date()
  let cursor: string
  if (days.has(today())) {
    cursor = today()
  } else {
    // Grace period: check whether yesterday was active.
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    cursor = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(yesterday.getDate()).padStart(2, '0')}`
    if (!days.has(cursor)) return 0
  }

  let streak = 0
  const step = new Date()
  while (days.has(cursor)) {
    streak += 1
    step.setDate(step.getDate() - 1)
    cursor = `${step.getFullYear()}-${String(step.getMonth() + 1).padStart(
      2,
      '0',
    )}-${String(step.getDate()).padStart(2, '0')}`
  }
  return streak
}

export function computeStats(record: ProgressRecord, totalSections: number): Stats {
  const xp =
    record.completed.length * XP_PER_SECTION + record.correct * XP_PER_CORRECT
  const { level, levelName, xpIntoLevel, xpForNextLevel } = levelFor(xp)
  return {
    completedCount: record.completed.length,
    totalSections,
    percent: totalSections ? Math.round((record.completed.length / totalSections) * 100) : 0,
    xp,
    level,
    levelName,
    xpIntoLevel,
    xpForNextLevel,
    streak: streakFrom(record.activeDays),
    accuracy: record.attempted
      ? Math.round((record.correct / record.attempted) * 100)
      : 0,
  }
}

/* ---------------------------------------------------------------- */
/* Badges                                                            */
/* ---------------------------------------------------------------- */

export interface Badge {
  id: string
  name: string
  description: string
  glyph: string
  earned: boolean
}

/** Badge definitions, with `earned` resolved against the reader's record. */
export function badgesFor(record: ProgressRecord): Badge[] {
  const all: Omit<Badge, 'earned'>[] = [
    {
      id: 'first-light',
      name: 'FIRST LIGHT',
      description: 'Complete your first section.',
      glyph: '◉',
    },
    {
      id: 'momentum',
      name: 'MOMENTUM',
      description: 'Complete 5 sections.',
      glyph: '▲',
    },
    {
      id: 'dedicated',
      name: 'DEDICATED',
      description: 'Complete 15 sections.',
      glyph: '◆',
    },
    {
      id: 'completionist',
      name: 'COMPLETIONIST',
      description: 'Complete every section on the site.',
      glyph: '★',
    },
    {
      id: 'streak-3',
      name: 'CONSISTENT',
      description: 'Work on the site 3 days in a row.',
      glyph: '≡',
    },
    {
      id: 'streak-7',
      name: 'UNBROKEN',
      description: 'Work on the site 7 days in a row.',
      glyph: '∞',
    },
    {
      id: 'sharp-shooter',
      name: 'SHARP SHOOTER',
      description: 'Answer 10 questions correctly.',
      glyph: '◎',
    },
    {
      id: 'perfectionist',
      name: 'PERFECTIONIST',
      description: 'Reach 100% quiz accuracy.',
      glyph: '✦',
    },
    {
      id: 'equation-explorer',
      name: 'EXPLORER',
      description: 'Open the equation explorer.',
      glyph: '∑',
    },
  ]

  const earnedIds = new Set(record.badges)
  return all.map((badge) => ({
    ...badge,
    earned: earnedIds.has(badge.id),
  }))
}

/** Which badges the current record qualifies for but has not yet recorded. */
export function newlyEarned(
  record: ProgressRecord,
  stats: Stats,
  explorerOpened: boolean,
): string[] {
  const earned = new Set(record.badges)
  const candidates: Array<[string, boolean]> = [
    ['first-light', record.completed.length >= 1],
    ['momentum', record.completed.length >= 5],
    ['dedicated', record.completed.length >= 15],
    ['completionist', stats.completedCount >= stats.totalSections && stats.totalSections > 0],
    ['streak-3', stats.streak >= 3],
    ['streak-7', stats.streak >= 7],
    ['sharp-shooter', record.correct >= 10],
    ['perfectionist', record.attempted >= 5 && stats.accuracy === 100],
    ['equation-explorer', explorerOpened],
  ]
  return candidates.filter(([id, ok]) => ok && !earned.has(id)).map(([id]) => id)
}

export function useDerivedStats(record: ProgressRecord, totalSections: number) {
  return useMemo(() => computeStats(record, totalSections), [record, totalSections])
}