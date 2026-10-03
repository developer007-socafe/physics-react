/**
 * Progress context.
 *
 * Every screen that shows XP, a streak or a badge needs the same record, and
 * navigating between topics unmounts the page component. A context keeps one
 * instance alive for the whole session so a completed section does not
 * momentarily show zero XP on the way to the next page.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { topics } from '@/content/topics'
import {
  badgesFor,
  newlyEarned,
  useDerivedStats,
  useProgress,
  type Badge,
  type ProgressRecord,
  type Stats,
} from '@/lib/progress'

const TOTAL_SECTIONS = topics.reduce((total, topic) => total + topic.sections.length, 0)
const EXPLORER_KEY = 'physics.explorer.opened'

interface ProgressContextValue {
  record: ProgressRecord
  stats: Stats
  badges: Badge[]
  /** Badge ids earned in the last few seconds, awaiting acknowledgement. */
  freshBadges: string[]
  dismissFreshBadges: () => void
  completeSection: (id: string) => void
  uncompleteSection: (id: string) => void
  answerQuestion: (id: string, answer: string, correct: boolean) => void
  noteExplorerOpened: () => void
  isComplete: (id: string) => boolean
  reset: () => void
}

const ProgressContext = createContext<ProgressContextValue | null>(null)

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { record, completeSection, uncompleteSection, answerQuestion, awardBadges, reset } =
    useProgress()
  const stats = useDerivedStats(record, TOTAL_SECTIONS)

  // Set when the reader opens the equation explorer. Held outside the main
  // record so resetting progress does not also revoke the badge it earned.
  const [explorerOpened, setExplorerOpened] = useState(
    () => localStorage.getItem(EXPLORER_KEY) === 'true',
  )

  const noteExplorerOpened = useCallback(() => {
    setExplorerOpened(true)
    try {
      localStorage.setItem(EXPLORER_KEY, 'true')
    } catch {
      // Not persisting this is cosmetic; the session still counts.
    }
  }, [])

  const [freshBadges, setFreshBadges] = useState<string[]>([])

  // Award badges as soon as their condition is met so the announcement
  // appears at the moment of earning, not on the next page load.
  useEffect(() => {
    const pending = newlyEarned(record, stats, explorerOpened)
    if (pending.length === 0) return
    awardBadges(pending)
    setFreshBadges(pending)
  }, [record, stats, explorerOpened, awardBadges])

  const dismissFreshBadges = useCallback(() => setFreshBadges([]), [])

  const badges = useMemo(() => badgesFor(record), [record])

  const isComplete = useCallback(
    (id: string) => record.completed.includes(id),
    [record.completed],
  )

  const value = useMemo<ProgressContextValue>(
    () => ({
      record,
      stats,
      badges,
      freshBadges,
      dismissFreshBadges,
      completeSection,
      uncompleteSection,
      answerQuestion,
      noteExplorerOpened,
      isComplete,
      reset,
    }),
    [
      record,
      stats,
      badges,
      freshBadges,
      dismissFreshBadges,
      completeSection,
      uncompleteSection,
      answerQuestion,
      noteExplorerOpened,
      isComplete,
      reset,
    ],
  )

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

export function useProgressContext(): ProgressContextValue {
  const ctx = useContext(ProgressContext)
  if (!ctx) {
    throw new Error('useProgressContext must be used inside <ProgressProvider>')
  }
  return ctx
}