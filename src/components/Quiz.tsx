/**
 * Section quiz.
 *
 * Answers are recorded the first time a question is submitted and never
 * re-scored, so a reader cannot farm XP by guessing repeatedly. The explanation
 * shows whether they got it right *and* says why, because a lucky guess that
 * teaches nothing is the worst kind of quiz feedback.
 */
// Aliased: the component would otherwise shadow the global Math.
import { Math as TeX } from '@/components/Math'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useProgressContext } from '@/lib/ProgressContext'
import type { Question } from '@/lib/questions'
import { useState } from 'react'

export function Quiz({ questions, title }: { questions: Question[]; title: string }) {
  const { record, answerQuestion } = useProgressContext()
  const [picked, setPicked] = useState<string | null>(null)
  const [revealed, setRevealed] = useState(false)
  // Which question we are on. A quiz can hold more than one, so NEXT has to
  // advance rather than reset to the start.
  const [index, setIndex] = useState(0)
  // Set only when the reader dismisses the last feedback. Deriving "am I
  // done" from answeredAll alone fires the instant the answer is recorded,
  // which replaced the explanation with the score screen before it was ever
  // read -- the one thing the explanation exists to prevent.
  const [finished, setFinished] = useState(false)

  if (questions.length === 0) return null

  const answeredAll = questions.every((q) => record.answers[q.id] !== undefined)
  const correctCount = questions.filter(
    (q) => record.answers[q.id] === q.answer,
  ).length

  if (answeredAll && finished) {
    const score = correctCount
    const total = questions.length
    return (
      <Card className="my-6 border-accent/50" data-reveal>
        <h3 className="font-display text-xs">SECTION QUIZ ✓</h3>
        <p className="mt-3 font-mono">
          {score} / {total} correct
          {score === total ? ' — perfect.' : '.'}
        </p>
        <p className="mt-2 text-muted-foreground">
          {score === total
            ? 'Every question right. Move on.'
            : 'Review the explanations above, then keep going — the XP is already banked.'}
        </p>
        <button
          type="button"
          className="mt-3 font-mono text-sm text-accent underline"
          onClick={() => {
            setPicked(null)
            setRevealed(false)
            setIndex(0)
            setFinished(false)
          }}
        >
          Show the questions again
        </button>
      </Card>
    )
  }

  const question = questions[Math.min(index, questions.length - 1)]
  const isCorrect = picked === question.answer
  // Once a question has an answer on record, it is shown for reference and
  // cannot be re-submitted -- otherwise a reader could guess repeatedly until
  // the right answer stuck and farm the XP.
  const alreadyAnswered = record.answers[question.id] !== undefined

  return (
    <Card className="my-6" data-reveal>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="font-display text-xs">{title}</h3>
        <Badge variant="outline" className="font-mono">
          {questions.length} question{questions.length === 1 ? '' : 's'}
        </Badge>
        {questions.length > 1 && (
          <span className="font-mono text-xs text-muted-foreground">
            {index + 1} of {questions.length}
          </span>
        )}
      </div>

      <p className="mt-3 text-lg">{question.prompt}</p>

      <ul className="mt-4 flex flex-col gap-2">
        {question.options.map((option) => {
          const chosen = picked === option
          const correct = option === question.answer
          const given = record.answers[question.id]
          // Reveal the verdict once the reader has committed, either just now
          // or on a previous visit.
          const state =
            revealed || alreadyAnswered
              ? correct
                ? 'right'
                : given === option
                  ? 'wrong'
                  : 'idle'
              : 'idle'
          return (
            <li key={option}>
              <button
                type="button"
                aria-pressed={chosen}
                disabled={revealed || alreadyAnswered}
                onClick={() => !revealed && !alreadyAnswered && setPicked(option)}
                className={[
                  'w-full border px-3 py-3 text-left font-mono leading-snug transition-colors sm:py-2',
                  state === 'right'
                    ? 'border-accent bg-accent/15 text-accent'
                    : state === 'wrong'
                      ? 'border-destructive bg-destructive/10 text-destructive'
                      : 'border-border hover:border-accent/60',
                  revealed || alreadyAnswered ? 'cursor-default opacity-100' : 'cursor-pointer',
                ].join(' ')}
              >
                {state === 'right' ? '▸ ' : state === 'wrong' ? '✗ ' : '  '}
                {option}
              </button>
            </li>
          )
        })}
      </ul>

      {!revealed && !alreadyAnswered ? (
        <div className="mt-4 flex items-center gap-3">
          <Button
            disabled={picked === null}
            onClick={() => {
              if (picked === null) return
              setRevealed(true)
              answerQuestion(question.id, picked, picked === question.answer)
            }}
            className="w-fit font-mono"
          >
            SUBMIT
          </Button>
          <span className="font-mono text-xs text-muted-foreground">
            {picked === null
              ? 'Pick an answer first.'
              : `${Math.max(questions.length - index - 1, 0)} to go after this.`}
          </span>
        </div>
      ) : (
        <div className="mt-4">
          <p
            className={`font-mono ${
              (alreadyAnswered ? record.answers[question.id] === question.answer : isCorrect)
                ? 'text-accent'
                : 'text-destructive'
            }`}
          >
            {(alreadyAnswered
              ? record.answers[question.id] === question.answer
              : isCorrect)
              ? '✓ Correct.'
              : '✗ Not quite.'}
          </p>
          {/* The explanation carries TeX for some questions. */}
          <Mathish text={question.explanation} />
          {questions.length > 1 ? (
            <Button
              className="mt-3 w-fit font-mono"
              onClick={() => {
                setPicked(null)
                setRevealed(false)
                // On the last question, NEXT means "I'm done reading this".
                if (index >= questions.length - 1) {
                  setFinished(true)
                } else {
                  setIndex(index + 1)
                }
              }}
            >
              {index >= questions.length - 1 ? 'SEE RESULT ✓' : 'NEXT QUESTION →'}
            </Button>
          ) : (
            <Button
              className="mt-3 w-fit font-mono"
              onClick={() => setFinished(true)}
            >
              SEE RESULT ✓
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}

/**
 * Render an explanation, typesetting any \(...\) it contains.
 *
 * The question bank is plain text with a little inline maths, so rather than
 * force every explanation through a content block we wrap the maths spans only.
 */
function Mathish({ text }: { text: string }) {
  const parts = text.split(/(\\\([^)]+\\\))/g)
  return (
    <p className="mt-2 text-muted-foreground">
      {parts.map((part, i) =>
        part.startsWith('\\(') ? (
          <TeX key={i} tex={part} />
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </p>
  )
}

export function TopicProgressBar({
  done,
  total,
}: {
  done: number
  total: number
}) {
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <div className="my-2">
      <div className="mb-1 flex justify-between font-mono text-xs">
        <span>
          {done} / {total} sections
        </span>
        <span>{pct}%</span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  )
}