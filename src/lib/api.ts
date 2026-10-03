/**
 * API client for the FastAPI backend.
 *
 * The backend already normalises the three feeds into stable shapes and
 * answers 200 with `{ ok: false, message }` when an upstream is unhappy —
 * so this module's job is only: build the URL, apply a timeout, and turn a
 * network-level failure into the same `{ ok: false, message }` envelope the
 * backend uses. Components therefore have exactly one error shape to handle.
 */

/** Read at build time; falls back to the local dev backend. */
const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://127.0.0.1:8000'

/** Matches the backend's own per-request ceiling. */
const TIMEOUT_MS = 10_000

export type FeedStatus = 'loading' | 'live' | 'stale' | 'error'

/** Normalised error, shaped like the backend's failure envelope. */
export interface FeedError {
  ok: false
  message: string
  source?: string
}

export interface FeedMeta {
  ok: true
  cached: boolean
  stale?: boolean
  age_seconds?: number
  data: unknown
}

/* ---------------------------------------------------------------- */
/* Payload shapes (mirroring backend/app/main.py `_shape_*`)        */
/* ---------------------------------------------------------------- */

export interface ApodPayload {
  title: string
  explanation: string
  media_type: string
  url: string
  hdurl: string
  date: string
  copyright: string
}

export interface QuakePayload {
  events: Array<{
    magnitude: number
    place: string
    time_ms: number | null
    url: string
    tsunami: boolean
  }>
  total_above_floor: number
  magnitude_floor: number
}

export interface IssPayload {
  latitude: number
  longitude: number
  altitude_km: number | null
  velocity_kmh: number | null
  timestamp_ms: number | null
}

/* ---------------------------------------------------------------- */
/* Fetch plumbing                                                    */
/* ---------------------------------------------------------------- */

/**
 * GET a feed, always resolving to `{ ok }`.
 *
 * Uses an AbortController rather than relying on the browser's own timeout,
 * because a hung request on a captive portal or a sleeping laptop can sit
 * open indefinitely and leave a widget stuck on "connecting".
 */
async function fetchFeed<T>(name: string): Promise<FeedMeta | FeedError> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(`${BASE}/api/${name}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      return {
        ok: false,
        message: `The data service replied with HTTP ${response.status}.`,
      }
    }

    const body = (await response.json()) as FeedMeta | FeedError
    if (!body || typeof body !== 'object' || !('ok' in body)) {
      return { ok: false, message: 'The data service sent an unreadable response.' }
    }
    return body as FeedMeta | FeedError
  } catch (error) {
    // An abort and a genuine outage need different wording: one is "this is
    // slow", the other is "there is no route to the service".
    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        ok: false,
        message: `The data service did not respond within ${TIMEOUT_MS / 1000}s.`,
      }
    }
    return {
      ok: false,
      message:
        'Could not reach the data service. The written pages work without it — ' +
        'only the live figures are affected.',
    }
  } finally {
    clearTimeout(timer)
  }
}

export const getApod = () => fetchFeed<ApodPayload>('apod')
export const getQuakes = () => fetchFeed<QuakePayload>('quakes')
export const getIss = () => fetchFeed<IssPayload>('iss')

/* ---------------------------------------------------------------- */
/* Formatting helpers                                                */
/* ---------------------------------------------------------------- */

/** Signed degrees with a fixed precision, for lat/lon readouts. */
export function formatDegrees(value: number): string {
  const sign = value >= 0 ? '+' : '−'
  return `${sign}${Math.abs(value).toFixed(3)}°`
}

/**
 * km/h to km/s.
 *
 * Divide by 3600. Multiplying by 1000 first — a mistake in the static
 * version — reports the ISS at roughly 7,600 km/s.
 */
export function toKmPerSecond(kmh: number): number {
  return kmh / 3600
}

/** Unix milliseconds to a readable UTC stamp, or null when unusable. */
export function formatUtc(ms: number | null): string | null {
  if (ms === null || !Number.isFinite(ms)) return null
  const date = new Date(ms)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
}

/** Which hemisphere, for the ISS readout. */
export function hemisphere(latitude: number): string {
  if (Math.abs(latitude) < 1) return 'over the equator'
  return latitude > 0 ? 'over the northern hemisphere' : 'over the southern hemisphere'
}