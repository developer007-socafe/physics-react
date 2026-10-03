/**
 * Renders content blocks.
 *
 * Every block maps to real React elements, so no path in this file produces
 * markup from a string. The one place raw text is split is inline math, and
 * even there the pieces are rendered as text nodes.
 */
import { Math, RichText } from '@/components/Math'
import * as diagrams from '@/components/diagrams'
import { Card } from '@/components/ui/card'
import type { Block, DiagramId, Section, Topic } from '@/content/types'
import { animateCardHover } from '@/lib/gsap'
import { useRef } from 'react'

/* ---------------------------------------------------------------- */
/* Diagrams                                                          */
/* ---------------------------------------------------------------- */

const DIAGRAMS: Record<DiagramId, () => React.JSX.Element> = {
  horizonCrossSection: diagrams.horizonCrossSection,
  tidalStretch: diagrams.tidalStretch,
  accretionDisk: diagrams.accretionDisk,
  lensing: diagrams.lensing,
  lightCone: diagrams.lightCone,
  twinParadox: diagrams.twinParadox,
  penroseDiagram: diagrams.penroseDiagram,
  wormhole: diagrams.wormhole,
}

/**
 * A figure wrapper that scrolls its own content rather than widening the
 * page. At 320px the wide diagrams are unreadable if shrunk to fit, so they
 * keep their intrinsic width and the *container* scrolls — the page itself
 * never gains a horizontal scrollbar.
 */
function Diagram({ id, caption }: { id: DiagramId; caption: string }) {
  const Component = DIAGRAMS[id]
  if (!Component) return null

  const isWide = id === 'penroseDiagram'

  return (
    <figure className="my-6" data-reveal>
      <div className="diagram-scroll">
        <div className={isWide ? 'svg-diagram svg-penrose' : 'svg-diagram'}>
          <Component />
        </div>
      </div>
      {caption && (
        <figcaption className="mt-2 px-1 font-mono text-sm text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}

/* ---------------------------------------------------------------- */
/* Blocks                                                            */
/* ---------------------------------------------------------------- */

const CALLOUT_STYLES: Record<string, string> = {
  definition: 'border-l-primary',
  tip: 'border-l-accent',
  example: 'border-l-muted-foreground',
}

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case 'para':
      return (
        <p className="my-4 leading-relaxed">
          <RichText text={block.text} />
        </p>
      )

    case 'equation':
      return (
        <div className="equation my-5 overflow-x-auto">
          <Math tex={block.tex} display />
        </div>
      )

    case 'callout':
      return (
        <div
          // overflow-x-auto matters here: a callout is a padded border box, so
          // inline math inside it has no scroller of its own and would push the
          // page wide on a 320px screen. min-w-0 lets the flex/grid ancestor
          // actually constrain it.
          className={`my-5 min-w-0 overflow-x-auto border border-border border-l-4 bg-card/40 px-4 py-3 ${
            CALLOUT_STYLES[block.variant] ?? ''
          }`}
        >
          <strong className="font-display text-[0.7rem] text-foreground">
            {block.title}
          </strong>
          <p className="mt-2">
            <RichText text={block.text} />
          </p>
        </div>
      )

    case 'diagram':
      return <Diagram id={block.diagram} caption={block.caption} />

    case 'list':
      return (
        <ul className="my-4 list-disc pl-6">
          {block.items.map((item, i) => (
            <li key={i} className="my-1.5">
              <RichText text={item} />
            </li>
          ))}
        </ul>
      )

    case 'takeaways':
      return (
        <Card className="my-8 border-accent/40">
          <h3 className="font-display text-xs text-accent">KEY TAKEAWAYS</h3>
          <ul className="mt-3 list-disc pl-6">
            {block.items.map((item, i) => (
              <li key={i} className="my-1.5">
                <RichText text={item} />
              </li>
            ))}
          </ul>
        </Card>
      )

    default:
      return null
  }
}

/* ---------------------------------------------------------------- */
/* Section                                                           */
/* ---------------------------------------------------------------- */

export function SectionView({ section }: { section: Section }) {
  return (
    <section id={section.id} className="scroll-mt-20 py-6" data-reveal>
      <h2>
        <span className="mr-2 text-muted-foreground">{section.number}.</span>
        {section.title}
      </h2>
      {section.blocks.map((block, i) => (
        <BlockView key={i} block={block} />
      ))}
    </section>
  )
}

/* ---------------------------------------------------------------- */
/* Topic card                                                        */
/* ---------------------------------------------------------------- */

export function TopicCard({ topic }: { topic: Topic }) {
  const ref = useRef<HTMLDivElement>(null)

  const enter = () => ref.current && animateCardHover(ref.current, true)
  const leave = () => ref.current && animateCardHover(ref.current, false)

  return (
    <Card
      ref={ref}
      onMouseEnter={enter}
      onMouseLeave={leave}
      className="group h-full transition-colors hover:border-accent/60"
      data-anim
    >
      <a href={`#/topic/${topic.slug}`} className="block h-full">
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden>
            {topic.icon}
          </span>
          <div className="flex-1">
            <h3 className="font-display text-xs leading-relaxed">{topic.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{topic.tagline}</p>
            <span className="mt-3 block font-mono text-sm text-accent">
              OPEN →
            </span>
          </div>
        </div>
      </a>
    </Card>
  )
}