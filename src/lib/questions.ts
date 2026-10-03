/**
 * Question bank.
 *
 * Questions are written against the site's own content, keyed by the section
 * they test so the quiz can sit at the end of what it just taught. Answers are
 * stored as full strings rather than indices so reordering a question's
 * options cannot silently change what a previously correct answer means.
 */

export interface Question {
  id: string
  topic: string
  /** Section this belongs after. */
  sectionId: string
  prompt: string
  options: string[]
  answer: string
  explanation: string
}

export const QUESTIONS: Question[] = [
  /* ---------------- Mechanics ---------------- */
  {
    id: 'm-newton',
    topic: 'mechanics',
    sectionId: 'newton',
    prompt: 'A force of 10 N acts on a 2 kg mass. What is its acceleration?',
    options: ['2 m/s²', '5 m/s²', '20 m/s²', '0.2 m/s²'],
    answer: '5 m/s²',
    explanation: "Newton's second law gives a = F/m = 10/2 = 5 m/s².",
  },
  {
    id: 'm-inertia',
    topic: 'mechanics',
    sectionId: 'newton',
    prompt: 'Which statement about inertia is correct?',
    options: [
      'Inertia depends on the mass of an object',
      'Inertia is the same for all objects',
      'Inertia is a force that resists motion',
      'Inertia increases with velocity',
    ],
    answer: 'Inertia depends on the mass of an object',
    explanation:
      'Inertia is the resistance to acceleration, and it scales with mass. More mass means more force is needed for the same change in velocity.',
  },
  {
    id: 'm-energy',
    topic: 'mechanics',
    sectionId: 'energy',
    prompt: 'A ball rolls off a table. Which quantity is conserved as it falls?',
    options: ['Kinetic energy', 'Total mechanical energy', 'Momentum alone', 'Gravitational potential energy'],
    answer: 'Total mechanical energy',
    explanation:
      'Ignoring air resistance, energy converts from potential to kinetic while the total stays constant. Momentum is not conserved because gravity is an external force.',
  },
  {
    id: 'm-work',
    topic: 'mechanics',
    sectionId: 'energy',
    prompt: 'Work is force multiplied by displacement in the direction of that force. If you push perpendicular to the motion, the work done is…',
    options: ['Negative', 'Zero', 'Twice the force', 'Unchanged'],
    answer: 'Zero',
    explanation:
      'W = F·d·cos(θ). At 90° the cosine is zero, so no energy transfers no matter how hard you push.',
  },

  /* ---------------- Thermodynamics ---------------- */
  {
    id: 't-second',
    topic: 'thermodynamics',
    sectionId: 'entropy',
    prompt: 'The second law says the total entropy of an isolated system…',
    options: ['Stays constant', 'Decreases', 'Never decreases', 'Always increases'],
    answer: 'Never decreases',
    explanation:
      'Entropy can stay flat for a reversible process, but it can never fall. That is what "isolated" buys you — no external influence to carry entropy away.',
  },
  {
    id: 't-heat',
    topic: 'thermodynamics',
    sectionId: 'temperature',
    prompt: 'Heat flows spontaneously from…',
    options: ['Cold to hot', 'Hot to cold', 'High pressure to low pressure only', 'Large to small objects only'],
    answer: 'Hot to cold',
    explanation:
      'Spontaneous heat flow always goes from higher to lower temperature. Pumping it the other way costs energy — that is a refrigerator.',
  },

  /* ---------------- Electromagnetism ---------------- */
  {
    id: 'e-coulomb',
    topic: 'electromagnetism',
    sectionId: 'charge',
    prompt: "If you double the distance between two charges, the force between them becomes…",
    options: ['Twice as strong', 'Half as strong', 'One quarter as strong', 'Unchanged'],
    answer: 'One quarter as strong',
    explanation:
      "Coulomb's law falls off as 1/r². Doubling r multiplies the force by 1/4.",
  },
  {
    id: 'e-field',
    topic: 'electromagnetism',
    sectionId: 'field',
    prompt: 'The electric field is defined as…',
    options: [
      'Force per unit charge',
      'Force per unit mass',
      'Energy per unit charge',
      'Charge per unit volume',
    ],
    answer: 'Force per unit charge',
    explanation: 'E = F/q. A test charge placed in the field feels a force proportional to q.',
  },

  /* ---------------- Waves ---------------- */
  {
    id: 'w-speed',
    topic: 'waves',
    sectionId: 'wave-equation',
    prompt: 'Doubling the frequency of a wave, with speed unchanged, halves its…',
    options: ['Amplitude', 'Wavelength', 'Frequency', 'Phase'],
    answer: 'Wavelength',
    explanation: 'v = fλ. With v fixed, f and λ trade off against each other inversely.',
  },
  {
    id: 'w-doppler',
    topic: 'waves',
    sectionId: 'doppler',
    prompt: 'A siren approaching you sounds higher-pitched because…',
    options: [
      'The sound source moves faster',
      'Wavefronts bunch up in front of the source',
      'Air temperature rises',
      'The frequency of the source increases',
    ],
    answer: 'Wavefronts bunch up in front of the source',
    explanation:
      'The source does not change its own frequency. It moves toward you between wavefront emissions, so they arrive closer together.',
  },

  /* ---------------- Quantum ---------------- */
  {
    id: 'q-duality',
    topic: 'quantum',
    sectionId: 'wave-particle',
    prompt: 'Electron diffraction proves that…',
    options: [
      'Electrons are waves in some conditions',
      'Electrons have no mass',
      'Light has mass',
      'Quantum mechanics is wrong',
    ],
    answer: 'Electrons are waves in some conditions',
    explanation:
      'An interference pattern only appears if something is behaving as a wave. Individual electrons build it up one at a time.',
  },
  {
    id: 'q-uncertainty',
    topic: 'quantum',
    sectionId: 'uncertainty',
    prompt: "Heisenberg's uncertainty principle says you cannot simultaneously know…",
    options: [
      'Position and momentum precisely',
      'Charge and mass',
      'Spin and charge',
      'Energy and time precisely',
    ],
    answer: 'Position and momentum precisely',
    explanation:
      'This is not a limit of instruments. A state with a sharp position has no definite momentum, and vice versa.',
  },
  {
    id: 'q-photon',
    topic: 'quantum',
    sectionId: 'blackbody',
    prompt: 'The energy of a photon is proportional to…',
    options: ['Its wavelength', 'Its frequency', 'Its speed', 'Its amplitude'],
    answer: 'Its frequency',
    explanation:
      'E = hf. Because c = fλ, energy is also inversely proportional to wavelength — which is why blue light is more energetic than red.',
  },

  /* ---------------- Relativity ---------------- */
  {
    id: 'r-time-dilation',
    topic: 'relativity',
    sectionId: 'light-clock',
    prompt: 'A clock on a fast-moving ship, compared to one on the ground, reads…',
    options: ['Faster', 'Slower', 'The same', 'Randomly different'],
    answer: 'Slower',
    explanation:
      'Time dilation means the moving clock accumulates less proper time. Both observers agree on this; there is no preferred frame.',
  },
  {
    id: 'r-simultaneity',
    topic: 'relativity',
    sectionId: 'spacetime',
    prompt: 'Two events simultaneous for one observer are…',
    options: [
      'Simultaneous for every observer',
      'Not simultaneous for a moving observer',
      'Impossible',
      'Simultaneous only on Earth',
    ],
    answer: 'Not simultaneous for a moving observer',
    explanation:
      'Simultaneity is frame-dependent. This is what makes relativity more than a trick with clocks.',
  },
  {
    id: 'r-length',
    topic: 'relativity',
    sectionId: 'lorentz',
    prompt: 'A moving ruler, measured in the lab frame, appears…',
    options: ['Longer', 'Shorter', 'The same length', 'To change colour'],
    answer: 'Shorter',
    explanation:
      'Length contraction is a real measurement, not an optical trick: putting the ruler end-to-end at once really does give a shorter result.',
  },

  /* ---------------- Modern physics ---------------- */
  {
    id: 'm-particle-wave',
    topic: 'modern-physics',
    sectionId: 'particle',
    prompt: 'The de Broglie wavelength of a particle is inversely proportional to its…',
    options: ['Speed', 'Momentum', 'Charge', 'Temperature'],
    answer: 'Momentum',
    explanation: 'λ = h/p. Heavy, fast particles have tiny wavelengths, which is why they behave classically.',
  },

  /* ---------------- Black holes ---------------- */
  {
    id: 'bh-horizon',
    topic: 'black-holes',
    sectionId: 'horizon',
    prompt: 'Inside the event horizon…',
    options: [
      'Light can still escape if you move fast',
      'No signal can reach an outside observer',
      'Gravity disappears at the centre',
      'Time stops for the infalling observer',
    ],
    answer: 'No signal can reach an outside observer',
    explanation:
      'Inside the horizon every future path points inward. The infalling observer notices nothing special at the crossing — the distortion is for the distant observer.',
  },
  {
    id: 'bh-hawking',
    topic: 'black-holes',
    sectionId: 'hawking',
    prompt: 'A smaller black hole is…',
    options: [
      'Hotter and evaporating faster',
      'Colder and evaporating slower',
      'Exactly the same temperature',
      'Not able to radiate at all',
    ],
    answer: 'Hotter and evaporating faster',
    explanation:
      'Hawking temperature goes as 1/M. Halving the mass doubles the temperature, and hotter holes radiate away their mass quicker.',
  },
  {
    id: 'bh-redshift',
    topic: 'black-holes',
    sectionId: 'redshift',
    prompt: 'Light escaping from near a black hole appears to outside observers as…',
    options: ['Bluer', 'Redder', 'Unchanged', 'Polarised'],
    answer: 'Redder',
    explanation:
      'Climbing out of the gravitational well costs energy, so the arriving photons have lower frequency — gravitational redshift.',
  },
  {
    id: 'bh-tidal',
    topic: 'black-holes',
    sectionId: 'tidal',
    prompt: 'Why is a supermassive black hole safer to approach than a small one?',
    options: [
      'It has weaker gravity',
      'The tidal force at the horizon is gentler',
      'It spins more slowly',
      'It is further away in every case',
    ],
    answer: 'The tidal force at the horizon is gentler',
    explanation:
      'Tidal forces depend on mass over distance squared. A far larger mass means the same horizon sits much further out, where the gradient is far weaker.',
  },

  /* ---------------- Time travel ---------------- */
  {
    id: 'tt-proper-time',
    topic: 'time-travel',
    sectionId: 'dilation',
    prompt: 'The twin who travels a near-light-speed journey and returns…',
    options: [
      'Is younger than the stay-at-home twin',
      'Is older than the stay-at-home twin',
      'Is the same age',
      'Cannot be compared',
    ],
    answer: 'Is younger than the stay-at-home twin',
    explanation:
      'The traveller accumulates less proper time. This is measurable and is not a paradox — the travellers reunite in one frame, unlike the separated-twins case.',
  },
  {
    id: 'tt-light-cone',
    topic: 'time-travel',
    sectionId: 'cones',
    prompt: 'An event outside your light cone is…',
    options: [
      'In your past or future, but unreachable by any signal',
      'Definitely in your past',
      'Definitely in your future',
      'Not real',
    ],
    answer: 'In your past or future, but unreachable by any signal',
    explanation:
      'Spacelike-separated events are ordered differently by different observers, and no causal influence can connect them.',
  },
  {
    id: 'tt-wormhole',
    topic: 'time-travel',
    sectionId: 'wormholes',
    prompt: 'A traversable wormhole would most likely require…',
    options: [
      'Exotic matter with negative energy density',
      'Ordinary matter and a great deal of it',
      'No matter at all',
      'Only magnetic fields',
    ],
    answer: 'Exotic matter with negative energy density',
    explanation:
      'The mouths must be held apart against collapse, which needs a stress-energy tensor no known positive-energy material provides.',
  },
]

/** Questions belonging after a given section. */
export function questionsForSection(sectionId: string): Question[] {
  return QUESTIONS.filter((q) => q.sectionId === sectionId)
}

/** Every question for a topic, ignoring section placement. */
export function questionsForTopic(topic: string): Question[] {
  return QUESTIONS.filter((q) => q.topic === topic)
}