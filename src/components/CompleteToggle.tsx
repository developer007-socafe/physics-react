/**
 * Per-section completion control.
 *
 * Completion is the reader's own call, not something inferred from scroll
 * depth. Scrolling past a formula proves nothing about understanding it, and
 * an XP system that pays for scrolling teaches the wrong habit.
 */
import { Button } from '@/components/ui/button'
import { useProgressContext } from '@/lib/ProgressContext'

export function CompleteToggle({ sectionId }: { sectionId: string }) {
  const { isComplete, completeSection, uncompleteSection } = useProgressContext()
  const done = isComplete(sectionId)

  return (
    <div className="mt-4 flex justify-end">
      <Button
        variant={done ? 'outline' : 'default'}
        size="sm"
        className="font-mono"
        aria-pressed={done}
        onClick={() => (done ? uncompleteSection(sectionId) : completeSection(sectionId))}
      >
        {done ? '✓ COMPLETED — UNDO' : 'MARK AS READ ✓'}
      </Button>
    </div>
  )
}