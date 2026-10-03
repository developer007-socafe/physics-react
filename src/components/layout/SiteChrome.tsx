/**
 * Site chrome: header, footer, and the page-transition wrapper.
 */
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { topics } from '@/content/topics'
import { usePageEnter } from '@/lib/gsap'
import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

/** ---------------------------------------------------------------- */
/* Header                                                            */
/** ---------------------------------------------------------------- */

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  // Navigating away should always dismiss the mobile drawer, otherwise it
  // stays open over the page the reader just asked for.
  useEffect(() => setOpen(false), [location.pathname])

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
        <Link
          to="/"
          className="flex min-h-11 shrink-0 items-center font-display text-xs leading-relaxed text-foreground sm:text-sm"
        >
          Physics<span className="text-accent">.</span>Fundamentals
        </Link>

        {/* Desktop navigation.

            Ten topic links do not fit in a 768px-wide bar: at the md
            breakpoint the row measures ~814px and dragged the whole page
            sideways. The nav scrolls inside its own box instead of widening
            the header -- min-w-0 lets a flex child actually shrink below its
            content width, which it otherwise refuses to do. */}
        <nav className="ml-auto hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex">
          {topics.map((topic) => (
            <NavLink
              key={topic.slug}
              to={`/topic/${topic.slug}`}
              className={({ isActive }) =>
                [
                  'shrink-0 whitespace-nowrap px-2 py-1 font-mono text-sm transition-colors',
                  isActive ? 'text-accent' : 'text-muted-foreground hover:text-foreground',
                ].join(' ')
              }
            >
              {topic.icon} {topic.title.split(' ')[0]}
            </NavLink>
          ))}
          <NavLink
            to="/progress"
            className={({ isActive }) =>
              [
                'shrink-0 whitespace-nowrap px-2 py-1 font-mono text-sm transition-colors',
                isActive ? 'text-accent' : 'text-muted-foreground hover:text-foreground',
              ].join(' ')
            }
          >
            ▓ PROGRESS
          </NavLink>
        </nav>

        {/* Mobile drawer */}
        <div className="ml-auto md:hidden">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              {/* h-11 for the touch target: the button reads as a 32px box but
                  a thumb needs ~44px. The extra height is padding, not size. */}
              <Button variant="outline" size="sm" aria-label="Open topics menu" className="h-11">
                TOPICS ▾
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[80dvh] overflow-y-auto">
              <DialogTitle>Topics</DialogTitle>
              <nav className="flex flex-col">
                <NavLink to="/" className="flex min-h-11 items-center border-b border-border py-2.5 font-mono">
                  Home
                </NavLink>
                <NavLink to="/progress" className="flex min-h-11 items-center border-b border-border py-2.5 font-mono">
                  ▓ Progress
                </NavLink>
                {topics.map((topic) => (
                  <NavLink
                    key={topic.slug}
                    to={`/topic/${topic.slug}`}
                    className="flex min-h-11 items-center gap-2 border-b border-border py-2.5 font-mono"
                  >
                    <span aria-hidden>{topic.icon}</span>
                    {topic.title}
                  </NavLink>
                ))}
              </nav>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  )
}

/** ---------------------------------------------------------------- */
/* Footer                                                            */
/** ---------------------------------------------------------------- */

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 font-mono text-sm text-muted-foreground">
        <p>
          Physics Fundamentals — an open educational project. No login, no ads, no
          tracking.
        </p>
        <p>
          Equations typeset with{' '}
          <a
            href="https://katex.org"
            target="_blank"
            rel="noreferrer"
            className="text-accent"
          >
            KaTeX
          </a>
          . Progress is stored only in this browser — no account, no server,
          nothing leaves your device.
        </p>
        <Separator />
        <p className="text-xs">
          Source on{' '}
          <a
            href="https://github.com/developer007-socafe/physics-fundamentals"
            target="_blank"
            rel="noreferrer"
            className="text-accent"
          >
            GitHub
          </a>
          .
        </p>
      </div>
    </footer>
  )
}

/** ---------------------------------------------------------------- */
/* Page transition wrapper                                           */
/** ---------------------------------------------------------------- */

/**
 * Replays the entrance animation on every route change by keying the effect
 * on the pathname. Also scrolls to the top, which a router does not do on
 * its own — without it a reader who scrolled halfway down lands mid-page.
 */
export function PageShell({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const ref = usePageEnter(location.pathname)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.pathname])

  return (
    <div ref={ref} className="min-h-[60dvh]">
      {children}
    </div>
  )
}

/** Small section heading used across pages. */
export function PageTitle({
  eyebrow,
  title,
  tagline,
}: {
  eyebrow: string
  title: string
  tagline: string
}) {
  return (
    <div className="mb-8 flex flex-col gap-3" data-anim>
      <Badge variant="outline" className="w-fit font-mono">
        {eyebrow}
      </Badge>
      <h1>{title}</h1>
      <p className="max-w-2xl text-muted-foreground">{tagline}</p>
    </div>
  )
}