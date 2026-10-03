/**
 * Routes. HashRouter, not BrowserRouter: GitHub Pages serves files from a
 * static root with no rewrite rules, so a deep path like /topic/quantum would
 * 404. Hash routing keeps every URL working on any static host.
 */
import { SectionView, TopicCard } from '@/components/Content'
import { EquationExplorer } from '@/components/dialogs/EquationExplorer'
import { LiveApod, LiveIss, LiveQuakes } from '@/components/LiveFeeds'
import { PageShell, PageTitle, SiteFooter, SiteHeader } from '@/components/layout/SiteChrome'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { findTopic, topics } from '@/content/topics'
import { useScrollReveal } from '@/lib/gsap'
import { useEffect } from 'react'
import { HashRouter, Link, Route, Routes, useParams } from 'react-router-dom'

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
          time — {topics.length} topics, {sectionCount} sections, and real data
          pulled live from public science APIs.
        </p>
      </section>

      <div ref={reveal}>
        <section className="py-6">
          <h2 data-reveal>CHOOSE A TOPIC</h2>
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

        <section className="py-6">
          <h2 data-reveal>LIVE FROM PUBLIC APIs</h2>
          <p className="mb-4 mt-2 text-muted-foreground" data-reveal>
            Real data, fetched through this site’s own backend so the feeds are
            cached and CORS-safe. Each card degrades to a plain message if its
            source is unreachable — the written pages never depend on them.
          </p>
          <LiveApod />
          <LiveIss />
          <LiveQuakes />
        </section>
      </div>
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

  // Switching topics should start at the top; a router keeps the old offset.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [slug])

  if (!topic) {
    return (
      <Card className="my-10">
        <h1>NO SUCH TOPIC</h1>
        <p className="mt-3 text-muted-foreground">
          Nothing is filed under “{slug}”.
        </p>
        <Button asChild className="mt-4">
          <Link to="/">Back to all topics</Link>
        </Button>
      </Card>
    )
  }

  return (
    <article ref={reveal}>
      <PageTitle
        eyebrow={`// TOPIC ${topic.icon}`}
        title={topic.title}
        tagline={topic.intro}
      />

      <nav aria-label="Sections" className="my-6" data-reveal>
        <p className="mb-2 font-mono text-xs text-muted-foreground">CONTENTS</p>
        <ol className="grid gap-1 sm:grid-cols-2">
          {topic.sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="font-mono text-sm text-accent hover:underline"
              >
                [{String(section.number).padStart(2, '0')}] {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {topic.sections.map((section) => (
        <SectionView key={section.id} section={section} />
      ))}

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
      <div className="min-h-dvh">
        <SiteHeader />
        <main className="mx-auto max-w-5xl px-4 pb-10">
          <PageShell>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/topic/:slug" element={<TopicPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </PageShell>
        </main>
        <SiteFooter />
      </div>
    </HashRouter>
  )
}