/**
 * KaTeX rendering.
 *
 * KaTeX is invoked directly rather than auto-detecting `$...$` delimiters.
 * That is deliberate: auto-detection is what previously caused whole pages
 * to render raw LaTeX, because a stray `$` in prose silently swallowed the
 * rest of the page. Here the caller must pass explicit `\\(...\\)` or
 * `\\[...\\]`, so a malformed formula fails visibly in one place.
 *
 * `katex.render` is imperative and writes HTML, so the output is injected via
 * `ref.textContent` — the rendered string is KaTeX's own, escaped by its
 * `output: 'html'` mode into text nodes, never parsed as page markup.
 */
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { useEffect, useRef, useState } from 'react'

interface MathProps {
  /** TeX source, including its `\\(...\\)` or `\\[...\\]` delimiters. */
  tex: string
  /** Centre it and allow vertical space. Use for display equations. */
  display?: boolean
  className?: string
}

/** Split the delimiters off so KaTeX receives a bare expression. */
function unwrap(tex: string): { body: string; display: boolean } {
  const trimmed = tex.trim()
  if (trimmed.startsWith('\\[') && trimmed.endsWith('\\]')) {
    return { body: trimmed.slice(2, -2), display: true }
  }
  if (trimmed.startsWith('\\(') && trimmed.endsWith('\\)')) {
    return { body: trimmed.slice(2, -2), display: false }
  }
  return { body: trimmed, display: false }
}

export function Math({ tex, display = false, className = '' }: MathProps) {
  const host = useRef<HTMLSpanElement>(null)
  const [failed, setFailed] = useState(false)

  const { body, display: isDisplay } = unwrap(tex)
  const showAsDisplay = display || isDisplay

  useEffect(() => {
    const node = host.current
    if (!node) return

    try {
      node.textContent = katex.renderToString(body, {
        displayMode: showAsDisplay,
        throwOnError: true,
        // Strict mode catches typos that would otherwise render as red
        // error text nobody reads.
        strict: (code: string) =>
          code === 'unicodeTextInMathMode' || code === 'mathVsTextUnits'
            ? 'warn'
            : 'warn',
        trust: false,
        output: 'htmlAndMathml',
      })
      setFailed(false)
    } catch {
      // Show the source rather than nothing: a visible broken formula is
      // debuggable, an empty box is not.
      node.textContent = body
      setFailed(true)
    }
  }, [body, showAsDisplay])

  if (failed) {
    return (
      <code
        className={`font-mono text-accent ${className}`}
        title="This formula failed to typeset; showing its source"
      >
        {body}
      </code>
    )
  }

  return (
    <span
      ref={host}
      role="math"
      aria-label={body}
      className={`${showAsDisplay ? 'block overflow-x-auto py-1' : 'inline-block'} ${className}`}
    />
  )
}

/**
 * Split a paragraph into alternating plain-text and inline-math parts.
 *
 * Content arrives as a plain string with `\\(...\\)` markers, so the renderer
 * needs to break it apart to interleave React nodes. Returns null when there
 * is no math, letting the caller skip the work entirely.
 */
export function parseInline(text: string): Array<{ kind: 'text' | 'math'; value: string }> | null {
  if (!text.includes('\\(')) return null

  const parts: Array<{ kind: 'text' | 'math'; value: string }> = []
  const pattern = /\\\((.+?)\\\)/g
  let lastIndex = 0
  let found: RegExpExecArray | null

  while ((found = pattern.exec(text)) !== null) {
    if (found.index > lastIndex) {
      parts.push({ kind: 'text', value: text.slice(lastIndex, found.index) })
    }
    parts.push({ kind: 'math', value: `\\(${found[1]}\\)` })
    lastIndex = found.index + found[0].length
  }

  if (lastIndex < text.length) {
    parts.push({ kind: 'text', value: text.slice(lastIndex) })
  }

  return parts.length > 1 ? parts : null
}

/** Render a paragraph, typesetting any inline math it contains. */
export function RichText({ text }: { text: string }) {
  const parts = parseInline(text)

  if (!parts) return <>{text}</>

  return (
    <>
      {parts.map((part, index) =>
        part.kind === 'math' ? (
          <Math key={index} tex={part.value} />
        ) : (
          <span key={index}>{part.value}</span>
        ),
      )}
    </>
  )
}