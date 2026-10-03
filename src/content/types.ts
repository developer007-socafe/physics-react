/**
 * Topic content model.
 *
 * Content is data, not markup. Sections hold typed blocks that the renderer
 * turns into React elements, so nothing ever needs `dangerouslySetInnerHTML`
 * and KaTeX source stays a plain string the reader can select and copy.
 *
 * TeX is written with `\\(` `\\)` for inline and `\\[` `\\]` for display, which
 * is what the `Math` component expects. The raw `$` delimiter is deliberately
 * not used: it collides with currency symbols and was the source of a
 * rendering bug in the previous static build.
 */

export type Block =
  /** A paragraph. `tex` parts are rendered as inline math. */
  | { kind: 'para'; text: string }
  /** A display equation centred in its own bordered block. */
  | { kind: 'equation'; tex: string; label?: string }
  /** A highlighted aside: definition, tip, or worked example. */
  | { kind: 'callout'; variant: 'definition' | 'tip' | 'example'; title: string; text: string }
  /** A figure: one of the hand-authored SVG diagrams. */
  | { kind: 'diagram'; diagram: DiagramId; caption: string }
  /** A bulleted list. */
  | { kind: 'list'; items: string[] }
  /** A run of key/value rows, e.g. the summary table at the end of a topic. */
  | { kind: 'takeaways'; items: string[] }

/** Identifiers exported by src/components/diagrams. */
export type DiagramId =
  | 'horizonCrossSection'
  | 'redshift'
  | 'tidalStretch'
  | 'accretionDisk'
  | 'lensing'
  | 'penroseDiagram'
  | 'lightCone'
  | 'twinParadox'

export interface Section {
  id: string
  number: number
  title: string
  blocks: Block[]
}

export interface Topic {
  slug: string
  title: string
  /** One line, shown on the card and as the page subtitle. */
  tagline: string
  /** Longer intro shown at the top of the page. */
  intro: string
  /** Emoji glyph used on cards. */
  icon: string
  /** Accent hue in degrees, used for the card's border glow. */
  hue: number
  sections: Section[]
}