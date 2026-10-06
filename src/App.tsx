/**
 * Routes. HashRouter, not BrowserRouter: GitHub Pages serves files from a
 * static root with no rewrite rules, so a deep path like /topic/quantum would
 * 404. Hash routing keeps every URL working on any static host.
 */
import { SectionView, TopicCard } from '@/components/Content'
import { CompleteToggle } from '@/components/CompleteToggle'
import { EquationExplorer } from '@/components/dialogs/EquationExplorer'
import { BadgeShelf, BadgeToast, ProgressHud } from '@/components/Progress'
import { Quiz, TopicProgressBar } from '@/components/Quiz'
import { PageShell, PageTitle, SiteFooter, SiteHeader } from '@/components/layout/SiteChrome'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { findTopic, topics } from '@/content/topics'
import { useProgressContext, ProgressProvider } from '@/lib/ProgressContext'
import { useScrollReveal } from '@/lib/gsap'
import { questionsForSection } from '@/lib/questions'
import { useEffect, useState } from 'react'
import { HashRouter, Link, Route, Routes, useParams } from 'react-router-dom'
import GamePage from '@/pages/GamePage'

/* ---------------------------------------------------------------- */
/* Home                                                              */
/* ---------------------------------------------------------------- */

function Home() {
  const reveal = useScrollReveal<HTMLDivElement>()

  const sectionCount = topics.reduce((total, topic) => total + topic.sections.length, 0)

  return (
    <>
      <section className="py-10" data-anim>
        <h1 className="text-lg leading-loose">
          PHYSICS<span className="text-accent">.</span>FUNDAMENTALS
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          An interactive guide to the laws that govern motion, light, space and
          time — {topics.length} topics, {sectionCount} sections, and quizzes
          that check whether any of it stuck.
        </p>
      </section>

      <ProgressHud />

      <div ref={reveal}>
        <section className="py-6">
          <h2 data-reveal>CHOOSE A TRACK</h2>
          <p className="mb-4 mt-2 text-muted-foreground" data-reveal>
            Each topic ends in a short quiz. Mark sections read to earn XP, keep
            a streak going, and unlock achievements.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((topic) => (
              <TopicCard key={topic.slug} topic={topic} />
            ))}
          </div>
        </section>

        <section className="py-6" data-reveal>
          <h2>EQUATION EXPLORER</h2>
          <Card className="mt-4">
            <p className="max-w-2xl">
              Eleven equations with every symbol broken down. Pick a scenario
              and see what the formula is actually asserting — a formula
              without units attached is decoration.
            </p>
            <div className="mt-4">
              <EquationExplorer />
            </div>
          </Card>
        </section>

        <BadgeShelf />
      </div>
    </>
  )
}

/* ---------------------------------------------------------------- */
/* Progress dashboard                                                */
/* ---------------------------------------------------------------- */

function ProgressPage() {
  const { record, reset } = useProgressContext()
  const [confirming, setConfirming] = useState(false)

  return (
    <>
      <PageTitle
        eyebrow="// YOUR PROGRESS"
        title="DASHBOARD"
        tagline="Everything you have unlocked on this device. Nothing is sent anywhere."
      />

      <ProgressHud />

      <section className="my-6">
        <h2 className="font-display text-xs">PER TOPIC</h2>
        <ul className="mt-4 flex flex-col gap-5">
          {topics.map((topic) => {
            const done = topic.sections.filter((s) => record.completed.includes(s.id)).length
            return (
              <li key={topic.slug}>
                {/* A full touch height rather than the text baseline: this is
                    a jump target, not running prose. */}
                <Link
                  to={`/topic/${topic.slug}`}
                  className="block py-2 font-mono text-accent hover:underline"
                >
                  {topic.icon} {topic.title}
                </Link>
                <TopicProgressBar done={done} total={topic.sections.length} />
              </li>
            )
          })}
        </ul>
      </section>

      <BadgeShelf />

      <section className="my-8 border-t border-border pt-4">
        {confirming ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-sm">
              This deletes every completed section, answer and achievement on
              this device. It cannot be undone.
            </span>
            <Button
              variant="destructive"
              className="font-mono"
              onClick={() => {
                reset()
                setConfirming(false)
              }}
            >
              ERASE EVERYTHING
            </Button>
            <Button variant="ghost" className="font-mono" onClick={() => setConfirming(false)}>
              KEEP IT
            </Button>
          </div>
        ) : (
          <button
            type="button"
            className="py-2 font-mono text-sm text-muted-foreground underline"
            onClick={() => setConfirming(true)}
          >
            Reset all progress
          </button>
        )}
      </section>
    </>
  )
}

/* ---------------------------------------------------------------- */
/* Topic page                                                        */
/* ---------------------------------------------------------------- */

function TopicPage() {
  const { slug = '' } = useParams()
  const topic = findTopic(slug)
  const reveal = useScrollReveal<HTMLDivElement>()
  const { record } = useProgressContext()

  // Switching topics should start at the top; a router keeps the old offset.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [slug])

  if (!topic) {
    return (
      <Card className="my-10">
        <h1>NO SUCH TOPIC</h1>
        <p className="mt-3 text-muted-foreground">Nothing is filed under “{slug}”.</p>
        <Button asChild className="mt-4">
          <Link to="/">Back to all topics</Link>
        </Button>
      </Card>
    )
  }

  const done = topic.sections.filter((s) => record.completed.includes(s.id)).length

  return (
    <article ref={reveal}>
      <PageTitle
        eyebrow={`// TOPIC ${topic.icon}`}
        title={topic.title}
        tagline={topic.intro}
      />

      <TopicProgressBar done={done} total={topic.sections.length} />

      <nav aria-label="Sections" className="my-6" data-reveal>
        <p className="mb-2 font-mono text-xs text-muted-foreground">CONTENTS</p>
        {/* py-2 rather than py-1: at 390px these links are the primary way to
            jump around, and 19px-tall rows are close to unhittable with a
            thumb. 36px each clears the comfortable minimum without turning a
            nine-item list into a wall of space. */}
        <ol className="grid gap-1 sm:grid-cols-2">
          {topic.sections.map((section) => {
            const complete = record.completed.includes(section.id)
            return (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="block py-2 font-mono text-sm leading-snug text-accent hover:underline"
                >
                  {complete ? '✓' : ' '} [{String(section.number).padStart(2, '0')}] {section.title}
                </a>
              </li>
            )
          })}
        </ol>
      </nav>

      {topic.sections.map((section) => {
        const quiz = questionsForSection(section.id)
        return (
          <div key={section.id}>
            <SectionView section={section} />
            {quiz.length > 0 && (
              <Quiz questions={quiz} title={`CHECK YOURSELF — ${section.title}`} />
            )}
            <CompleteToggle sectionId={section.id} />
          </div>
        )
      })}

      <div className="mt-10" data-reveal>
        <EquationExplorer />
      </div>
    </article>
  )
}

/* ---------------------------------------------------------------- */
/* Not found                                                         */
/* ---------------------------------------------------------------- */

function NotFound() {
  return (
    <Card className="my-10">
      <h1>404 · SIGNAL LOST</h1>
      <p className="mt-3 text-muted-foreground">
        That address does not resolve to a page on this site.
      </p>
      <Button asChild className="mt-4">
        <Link to="/">Return to the index</Link>
      </Button>
    </Card>
  )
}

/* ---------------------------------------------------------------- */
/* Shell                                                             */
/* ---------------------------------------------------------------- */

export default function App() {
  return (
    <HashRouter>
      <ProgressProvider>
        <div className="min-h-dvh">
          <SiteHeader />
          <main className="mx-auto max-w-5xl px-4 pb-10">
            <PageShell>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/progress" element={<ProgressPage />} />
                <Route path="/topic/:slug" element={<TopicPage />} />
                <Route path="*" element={<NotFound />} />
                <Route path="/game/black-hole-dive" element={<GamePage />} />
              </Routes>
            </PageShell>
          </main>
          <SiteFooter />
          <BadgeToast />
        </div>
      </ProgressProvider>
    </HashRouter>
  )
}