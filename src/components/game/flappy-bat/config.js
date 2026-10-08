/* ═══════════════════════════════════════════════
   FLAPPY BAT — tunable constants
   All gameplay math happens in a single logical
   coordinate space: 480 x 700, y=0 at the top,
   y=PLAY_H is the ground line. Pipes, the bat and
   the collision boxes all share this space, which is
   what the old DOM version got wrong.
   ═══════════════════════════════════════════════ */

/* ─── viewport / playfield ─── */
export const VIEW_W = 480
export const VIEW_H = 700
export const GROUND_H = 84
export const PLAY_H = VIEW_H - GROUND_H // 616 — top of the ground

/* ─── loop ─── */
export const FIXED_DT = 1 / 60 // fixed physics step (seconds)
export const MAX_FRAME_DT = 0.25 // clamp huge gaps (tab switch)
export const MAX_STEPS = 5 // catch-up cap per frame

/* ─── the bat ─── */
export const BAT_X = 112 // fixed horizontal position
export const BAT_W = 46 // visual width (wings included)
export const BAT_H = 34 // visual height
export const BAT_HIT_W = 22 // forgiving hitbox width
export const BAT_HIT_H = 15 // forgiving hitbox height
export const BAT_FLOOR_PAD = 0 // extra forgiveness at the ceiling

export const GRAVITY = 1520 // px / s²
export const FLAP_V = -400 // px / s (instant upward impulse)
export const MAX_FALL_V = 640 // terminal velocity
export const CEILING_Y = BAT_H / 2 + BAT_FLOOR_PAD

/* body rotation follows velocity, smoothed */
export const TILT_UP = -0.45 // rad while climbing
export const TILT_DOWN = 0.95 // rad while diving
export const TILT_LERP = 11 // smoothing speed

/* Wing flap. The sweep is deliberately shallow: rotating a wing
   through a big angle swings its tip up and *inward* over the body,
   which destroys the "flying right" read. Shallow sweep + a little
   foreshortening keeps the membrane trailing behind at all times. */
export const FLAP_WING_TIME = 0.3
export const WING_UP = 0.45
export const WING_DOWN = -0.32
export const WING_IDLE = -0.2
export const WING_IDLE_AMP = 0.07
export const WING_IDLE_FREQ = 2.4
export const WING_FORESHORTEN = 0.16 // x-scale loss at the top of the stroke

/* squash on flap */
export const SQUASH_TIME = 0.18
export const SQUASH_SQUASH_Y = 0.34
export const SQUASH_STRETCH_X = 0.2

/* ─── pipes ─── */
export const PIPE_W = 64
export const PIPE_CAP_H = 30
export const PIPE_CAP_OVERHANG = 7

export const GAP_START = 172
export const GAP_MIN = 140
export const GAP_SHRINK_EVERY = 6 // points
export const GAP_SHRINK_STEP = 5

export const SPEED_START = 188 // px / s
export const SPEED_STEP = 7 // every N points
export const SPEED_EVERY = 5
export const SPEED_MAX = 272

export const SPACING_START = 268 // px between pipes (distance based!)
export const SPACING_MIN = 218
export const SPACING_SHRINK_EVERY = 4
export const SPACING_SHRINK_STEP = 8

export const GAP_EDGE_MARGIN = 64 // keep gaps off the ceiling/ground
export const GAP_MAX_JUMP = 105 // max vertical change between pipes
export const PIPE_SPAWN_X = VIEW_W + 24 // spawn just off the right edge

/* ─── coins ─── */
export const COIN_R = 11
export const COIN_CHANCE = 0.74
export const COIN_SPIN_HZ = 0.75 // full spins per second

/* ─── death ─── */
export const DEATH_FALL_V = 120 // initial downward nudge
export const DEATH_TILT = 1.9 // spin to this angle while falling
export const DEATH_LAND_PAUSE = 0.34 // beat before the game-over card

/* ─── storage keys ─── */
export const BEST_KEY = 'flappyBatBest'
export const COINS_KEY = 'flappyBatCoins'
export const MUTE_KEY = 'flappyBatMuted'
