/** Type declarations for the Flappy Bat vanilla-JS engine modules.
   The original flappy-bat source ships plain .js files (Vite handles them
   at runtime), but TypeScript needs declarations so it can type-check
   our React wrapper. */

export interface GameStateSnapshot {
  phase: 'ready' | 'playing' | 'dying' | 'over' | 'paused'
  score: number
  coinsRun: number
  best: number
  coinsTotal: number
  newBest: boolean
}

export interface GameOptions {
  canvas: HTMLCanvasElement
  onState: (s: GameStateSnapshot) => void
}

export interface GameInstance {
  press: () => void
  start: () => void
  pause: () => void
  resume: () => void
  togglePause: () => void
  reset: () => void
  resize: () => void
  setMuted: (m: boolean) => void
  unlockAudio: () => void
  destroy: () => void
  startLoop: () => void
  muted: boolean
}

export function createGame(options: GameOptions): GameInstance

/** Config constants */
export const MUTE_KEY = 'flappyBatMuted'
export const BEST_KEY = 'flappyBatBest'
export const COINS_KEY = 'flappyBatCoins'
