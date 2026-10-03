/**
 * The GSAP popup: an equation explorer.
 *
 * Twelve scenarios, each pairing a formula with what it actually means and
 * what every symbol stands for. The point is that the equation changes under
 * the reader while the explanation stays concrete — a formula with no units
 * attached is decoration.
 */
import { Math } from '@/components/Math'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { animateDialogIn, animateDialogOut, animateTypewrite } from '@/lib/gsap'
import { useProgressContext } from '@/lib/ProgressContext'
import { useEffect, useRef, useState } from 'react'

interface Scenario {
  id: string
  label: string
  /** Why this equation earns its place. One sentence, no jargon. */
  intuition: string
  tex: string
  symbols: Array<[string, string]>
}

const SCENARIOS: Scenario[] = [
  {
    id: 'newton',
    label: 'Newtonian gravity',
    intuition:
      'Two masses pull on each other with a force that weakens as the square of their separation.',
    tex: 'F = G \\frac{m_1 m_2}{r^2}',
    symbols: [
      ['F', 'the force between them, in newtons'],
      ['G', 'the gravitational constant, 6.674 × 10⁻¹¹ N·m²/kg²'],
      ['m₁, m₂', 'the two masses, in kilograms'],
      ['r', 'the distance between their centres, in metres'],
    ],
  },
  {
    id: 'field',
    label: 'Gravitational field',
    intuition:
      'The pull a single mass exerts at a point — what a weighing scale would read there.',
    tex: 'g = \\frac{GM}{r^2}',
    symbols: [
      ['g', 'field strength, in newtons per kilogram (≈ 9.81 on Earth)'],
      ['M', 'the mass doing the pulling'],
      ['r', 'distance from its centre'],
    ],
  },
  {
    id: 'orbit',
    label: 'Orbital velocity',
    intuition:
      'How fast you must move sideways to keep falling towards something forever.',
    tex: 'v = \\sqrt{\\frac{GM}{r}}',
    symbols: [
      ['v', 'orbital speed, in m/s'],
      ['M', 'the central mass'],
      ['r', 'the radius of the circular orbit'],
    ],
  },
  {
    id: 'escape',
    label: 'Escape velocity',
    intuition:
      'The speed at which gravity can no longer pull you back — and it depends on where you start.',
    tex: 'v_{esc} = \\sqrt{\\frac{2GM}{r}}',
    symbols: [
      ['v_esc', 'escape speed at that distance'],
      ['M', 'the mass being escaped'],
      ['r', 'distance from its centre — halve the distance and you need √2 × the speed'],
    ],
  },
  {
    id: 'schwarzschild',
    label: 'Schwarzschild radius',
    intuition:
      'Below this radius, nothing can get out. It is the only length scale mass and light can build.',
    tex: 'r_s = \\frac{2GM}{c^2}',
    symbols: [
      ['r_s', 'the horizon radius'],
      ['G', 'gravitational constant'],
      ['M', 'the mass enclosed'],
      ['c', 'speed of light, 3 × 10⁸ m/s'],
    ],
  },
  {
    id: 'redshift',
    label: 'Gravitational redshift',
    intuition:
      'Light climbing out of a gravitational well loses energy, so it arrives redder.',
    tex: '\\frac{\\nu_\\infty}{\\nu_r} = \\frac{1}{\\sqrt{1 - r_s/r}}',
    symbols: [
      ['ν_∞', 'frequency measured by a distant observer'],
      ['ν_r', 'frequency measured by someone hovering at r'],
      ['r_s', 'the Schwarzschild radius'],
      ['r', 'where the hovering observer is — as r → r_s the factor diverges'],
    ],
  },
  {
    id: 'kepler',
    label: "Kepler's third law",
    intuition:
      'Orbit size sets the period completely — mass barely matters, which is why moons and planets share the rule.',
    tex: 'T^2 = \\frac{4\\pi^2 r^3}{GM}',
    symbols: [
      ['T', 'orbital period'],
      ['r', 'semi-major axis of the orbit'],
      ['M', 'total mass of the system'],
      ['π', 'the circle constant, 3.14159…'],
    ],
  },
  {
    id: 'interval',
    label: 'Spacetime interval',
    intuition:
      'One number that says whether two events could ever influence each other. No observer disagrees about it.',
    tex: 'ds^2 = -c^2 dt^2 + d\\vec{x}^2',
    symbols: [
      ['ds²', 'negative → timelike, can connect; zero → light; positive → causally separate'],
      ['dt', 'separation in time'],
      ['d\\vec{x}', 'separation in space'],
    ],
  },
  {
    id: 'proper',
    label: 'Proper time',
    intuition:
      'What a clock actually reads. Integrate it along each path and differing paths give differing ages.',
    tex: 'd\\tau = \\sqrt{dt^2 - \\frac{d\\vec{x}^2}{c^2}}',
    symbols: [
      ['dτ', 'time elapsed on the clock you are carrying'],
      ['dt', 'time elapsed for a stationary distant observer'],
      ['d\\vec{x}', 'how far you moved while the clock ticked'],
    ],
  },
  {
    id: 'hawking',
    label: 'Hawking temperature',
    intuition:
      'A black hole glows, and the glow is hotter the smaller it is. Tiny holes would be hot.',
    tex: 'T_H = \\frac{\\hbar c^3}{8\\pi G M k_B}',
    symbols: [
      ['T_H', 'the effective temperature of the hole'],
      ['ħ', 'reduced Planck constant'],
      ['M', 'the mass — halve it and the temperature doubles'],
      ['k_B', 'Boltzmann constant'],
    ],
  },
  {
    id: 'isco',
    label: 'Innermost stable orbit',
    intuition:
      'Inside this radius, an orbiting object spirals in rather than holding a circular orbit.',
    tex: 'r_{ISCO} = \\frac{6GM}{c^2} = 3\\,r_s',
    symbols: [
      ['r_ISCO', 'the innermost stable circular orbit'],
      ['r_s', 'the horizon radius — the ISCO sits at three horizons'],
      ['M', 'the black hole’s mass'],
    ],
  },
]

export function EquationExplorer() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(SCENARIOS[0].id)
  const content = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLParagraphElement>(null)
  const { noteExplorerOpened } = useProgressContext()

  const scenario = SCENARIOS.find((s) => s.id === active) ?? SCENARIOS[0]

  // Power-on when the dialog opens; skip straight to the exit animation
  // when it closes so nothing pops.
  useEffect(() => {
    if (!open) return
    // Opening it at all is the achievement; once earned it never re-fires.
    noteExplorerOpened()
    animateDialogIn(content.current)

    if (heading.current) {
      const stop = animateTypewrite(heading.current, scenario.label)
      return stop
    }
  }, [open, scenario.label])

  const handleOpenChange = (next: boolean) => {
    if (!next && content.current) {
      void animateDialogOut(content.current).then(() => setOpen(false))
      return
    }
    setOpen(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="lg" className="font-display text-xs">
          ⚡ OPEN EQUATION EXPLORER
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl">
        <DialogTitle className="font-display text-xs">
          EQUATION EXPLORER
        </DialogTitle>
        <DialogDescription className="font-mono">
          Eleven equations, and what every symbol in them stands for.
        </DialogDescription>

        <div ref={content}>
          <Tabs value={active} onValueChange={setActive}>
            <TabsList className="flex-wrap">
              {SCENARIOS.map((s) => (
                <TabsTrigger key={s.id} value={s.id} className="font-mono text-xs">
                  {s.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {SCENARIOS.map((s) => (
              <TabsContent key={s.id} value={s.id} className="mt-4">
                <p ref={s.id === active ? heading : undefined} className="mb-1 font-mono">
                  {s.label}
                </p>
                <p className="mb-4 text-muted-foreground">{s.intuition}</p>

                <div className="equation my-4 overflow-x-auto">
                  <Math tex={s.tex} display />
                </div>

                <dl className="mt-4 grid gap-2">
                  {s.symbols.map(([symbol, meaning]) => (
                    <div
                      key={symbol}
                      className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 border-b border-border/60 pb-1.5"
                    >
                      <dt className="font-mono text-accent">{symbol}</dt>
                      <dd className="text-muted-foreground">{meaning}</dd>
                    </div>
                  ))}
                </dl>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <Badge variant="outline" className="mt-4 font-mono">
          {SCENARIOS.length} equations
        </Badge>
      </DialogContent>
    </Dialog>
  )
}