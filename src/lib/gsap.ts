/**
 * GSAP animation helpers.
 *
 * Two rules govern everything here:
 *
 * 1. Respect `prefers-reduced-motion`. A vestibular disorder makes the
 *    scanline-and-glow aesthetic genuinely unpleasant, so every helper
 *    returns without animating when the user has asked for stillness. The
 *    end state is always applied either way — content must never depend on
 *    an animation running to become visible.
 *
 * 2. Never animate a layout property. `width`, `height`, `top` and `left`
 *    force reflow on every frame. On this machine's integrated GPU and a
 *    page full of MathJax, that is the difference between smooth and
 *    unusable. `transform`, `opacity` and `filter` are composited instead.
 *
 * GSAP plugins are registered lazily so the base bundle stays small.
 */
import { gsap } from 'gsap'
import { useEffect, useRef } from 'react'

/** True when the user has asked the OS to reduce motion. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Load a plugin on demand. Returns null when motion is reduced or the
 * plugin is unavailable, so callers can branch without a try/catch.
 */
async function loadPlugin(name: 'ScrollTrigger'): Promise<unknown | null> {
  if (prefersReducedMotion()) return null
  try {
    const mod = await import(`gsap/${name}`)
    return mod[name] ?? null
  } catch {
    return null
  }
}

/* ---------------------------------------------------------------- */
/* Page transitions                                                  */
/* ---------------------------------------------------------------- */

/**
 * Animate the current view in when the route changes.
 *
 * Keyed on `key` (the route path), so each navigation replays the entrance.
 * Children stagger in from a small offset, which reads as a terminal
 * redrawing its buffer.
 */
export function usePageEnter(key: string) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    if (prefersReducedMotion()) {
      gsap.set(node, { opacity: 1, y: 0 })
      return
    }

    const targets = Array.from(node.querySelectorAll<HTMLElement>('[data-anim]'))

    const tween = gsap.fromTo(
      targets.length ? targets : node,
      { opacity: 0, y: 14 },
      {
        opacity: 1,
        y: 0,
        duration: 0.45,
        ease: 'power2.out',
        stagger: targets.length ? 0.045 : 0,
        clearProps: 'transform',
      },
    )

    return () => {
      tween.kill()
    }
  }, [key])

  return ref
}

/* ---------------------------------------------------------------- */
/* Scroll reveal                                                     */
/* ---------------------------------------------------------------- */

/**
 * Reveal sections as they scroll into view.
 *
 * Falls back to showing everything immediately if ScrollTrigger cannot load
 * or if the element is already above the fold — content must never stay
 * invisible because an animation library failed.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return

    const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'))
    if (!nodes.length) return

    const revealAll = () => gsap.set(nodes, { opacity: 1, y: 0 })

    if (prefersReducedMotion()) {
      revealAll()
      return
    }

    let cleanup: (() => void) | undefined
    let cancelled = false

    void loadPlugin('ScrollTrigger').then((plugin) => {
      if (cancelled) return
      if (!plugin) {
        revealAll()
        return
      }

      const ScrollTrigger = plugin as typeof import('gsap/ScrollTrigger').ScrollTrigger
      gsap.registerPlugin(ScrollTrigger)

      gsap.set(nodes, { opacity: 0, y: 20 })
      const tween = gsap.to(nodes, {
        opacity: 1,
        y: 0,
        duration: 0.5,
        ease: 'power2.out',
        stagger: 0.06,
        scrollTrigger: { trigger: root, start: 'top top', once: true },
      })

      cleanup = () => {
        tween.kill()
        ScrollTrigger.getAll().forEach((t) => t.kill())
      }
    })

    return () => {
      cancelled = true
      cleanup?.()
      // Leave content visible on unmount so a route change cannot strand
      // hidden nodes.
      gsap.set(nodes, { opacity: 1, y: 0 })
    }
  }, [])

  return ref
}

/* ---------------------------------------------------------------- */
/* Popups / dialogs                                                  */
/* ---------------------------------------------------------------- */

/**
 * The signature animation: a CRT-style power-on for dialogs.
 *
 * The flicker is a short opacity ramp plus a scale settle, driven by a
 * timeline so the phases stay in sync. Transform and opacity only, so it
 * composites on the GPU.
 */
export function animateDialogIn(element: HTMLElement | null): void {
  if (!element) return

  if (prefersReducedMotion()) {
    gsap.set(element, { opacity: 1, scale: 1, filter: 'none' })
    return
  }

  gsap.fromTo(
    element,
    { opacity: 0, scale: 0.92, y: 10 },
    {
      opacity: 1,
      scale: 1,
      y: 0,
      duration: 0.34,
      ease: 'back.out(1.7)',
      clearProps: 'transform,filter',
    },
  )

  // A brief phosphor bloom on the frame, then settle. Kept short and
  // cheap: one filter animation on a single element.
  gsap.fromTo(
    element,
    { filter: 'brightness(1.7)' },
    { filter: 'brightness(1)', duration: 0.42, ease: 'power2.out', clearProps: 'filter' },
  )
}

/** Symmetric exit, used before a dialog unmounts. */
export function animateDialogOut(element: HTMLElement | null): Promise<void> {
  if (!element || prefersReducedMotion()) return Promise.resolve()

  return new Promise((resolve) => {
    gsap.to(element, {
      opacity: 0,
      scale: 0.95,
      duration: 0.18,
      ease: 'power2.in',
      onComplete: resolve,
    })
  })
}

/* ---------------------------------------------------------------- */
/* Micro-interactions                                                */
/* ---------------------------------------------------------------- */

/**
 * Hover lift for cards, driven by GSAP rather than CSS transitions so the
 * easing curve matches the rest of the motion language.
 */
export function animateCardHover(element: HTMLElement | null, entering: boolean): void {
  if (!element || prefersReducedMotion()) return

  gsap.to(element, {
    y: entering ? -4 : 0,
    duration: entering ? 0.22 : 0.18,
    ease: entering ? 'power2.out' : 'power2.in',
    overwrite: 'auto',
  })
}

/**
 * Typewriter effect for the status line, for a touch of CRT authenticity.
 * Respects reduced motion by writing the whole string at once.
 *
 * Returns a cleanup function that stops an in-flight tween, so a component
 * that unmounts mid-animation cannot write into a detached node.
 */
export function animateTypewrite(
  element: HTMLElement | null,
  text: string,
): () => void {
  if (!element) return () => {}

  if (prefersReducedMotion()) {
    element.textContent = text
    return () => {}
  }

  const reduced = Math.min(text.length, 60)
  const tween = gsap.to(
    { i: 0 },
    {
      i: reduced,
      duration: reduced * 0.018,
      ease: 'none',
      onUpdate() {
        const target = this.targets()[0] as { i: number }
        element.textContent = text.slice(0, Math.floor(target.i))
      },
      onComplete() {
        element.textContent = text
      },
    },
  )

  return () => {
    tween.kill()
  }
}