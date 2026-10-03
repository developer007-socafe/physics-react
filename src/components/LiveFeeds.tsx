/**
 * Live public-data widgets.
 *
 * All three share one contract from `useFeed`: four explicit states, and an
 * error that renders a message rather than leaving a spinner or an empty box.
 * The wording of each failure state is deliberate — "the feed is quiet today"
 * and "we could not reach the service" are different problems and the reader
 * should be able to tell them apart.
 */
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useFeed } from '@/hooks/useFeed'
import {
  formatDegrees,
  formatUtc,
  getApod,
  getIss,
  getQuakes,
  hemisphere,
  toKmPerSecond,
  type ApodPayload,
  type IssPayload,
  type QuakePayload,
} from '@/lib/api'
import { useEffect, useRef } from 'react'

/** ---------------------------------------------------------------- */
/* Shared chrome                                                     */
/** ---------------------------------------------------------------- */

function FeedHeader({
  title,
  source,
  status,
  ageSeconds,
}: {
  title: string
  source: React.ReactNode
  status: 'loading' | 'live' | 'stale' | 'error'
  ageSeconds?: number
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <h3 className="font-display text-xs">{title}</h3>
      {status === 'live' && <Badge>live</Badge>}
      {status === 'stale' && (
        <Badge variant="outline" className="border-accent/60 text-accent">
          cached{ageSeconds ? ` · ${ageSeconds}s old` : ''}
        </Badge>
      )}
      <span className="ml-auto font-mono text-xs text-muted-foreground">{source}</span>
    </div>
  )
}

function FeedError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-sm text-destructive">{message}</p>
      <Button variant="outline" size="sm" className="w-fit font-mono" onClick={onRetry}>
        RETRY
      </Button>
    </div>
  )
}

/** ---------------------------------------------------------------- */
/* NASA Astronomy Picture of the Day                                 */
/** ---------------------------------------------------------------- */

export function LiveApod() {
  const apod = useFeed<ApodPayload>(getApod)

  return (
    <Card className="my-6" data-anim>
      <FeedHeader
        title="🌌 Astronomy Picture of the Day"
        source="api.nasa.gov"
        status={apod.status}
        ageSeconds={apod.ageSeconds}
      />

      {apod.status === 'loading' && <Progress className="h-1" />}

      {apod.status === 'error' && (
        <FeedError message={apod.message} onRetry={apod.reload} />
      )}

      {apod.status === 'stale' && !apod.data && <p className="font-mono text-sm">{apod.message}</p>}

      {apod.data && (
        <figure className="flex flex-col gap-3">
          {apod.data.media_type === 'image' ? (
            <img
              src={apod.data.url}
              alt={`Astronomy Picture of the Day: ${apod.data.title}`}
              className="max-h-96 w-full border border-border object-cover"
              loading="lazy"
            />
          ) : (
            // NASA posts video and interactive items some days; there is no
            // still to show, so offer the link rather than an empty frame.
            <p className="border border-border px-3 py-2 font-mono text-sm text-muted-foreground">
              Today’s entry is a {apod.data.media_type || 'non-image'} item, so
              there is no still picture. Open it below.
            </p>
          )}

          <figcaption className="flex flex-col gap-2">
            <p className="font-mono text-accent">{apod.data.title}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {apod.data.date}
              {apod.data.copyright ? ` · ${apod.data.copyright}` : ''}
            </p>
            <p className="leading-relaxed">{apod.data.explanation}</p>
            <a
              href={apod.data.hdurl || apod.data.url}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-sm text-accent underline"
            >
              Open full resolution →
            </a>
          </figcaption>
        </figure>
      )}
    </Card>
  )
}

/** ---------------------------------------------------------------- */
/* Earthquakes                                                       */
/** ---------------------------------------------------------------- */

export function LiveQuakes() {
  const quakes = useFeed<QuakePayload>(getQuakes)

  return (
    <Card className="my-6" data-anim>
      <FeedHeader
        title="🌍 Recent significant earthquakes"
        source="USGS"
        status={quakes.status}
        ageSeconds={quakes.ageSeconds}
      />

      {quakes.status === 'loading' && <Progress className="h-1" />}

      {quakes.status === 'error' && (
        <FeedError message={quakes.message} onRetry={quakes.reload} />
      )}

      {quakes.data && (
        <>
          <p className="mb-3 font-mono text-sm text-muted-foreground">
            {quakes.data.total_above_floor} event
            {quakes.data.total_above_floor === 1 ? '' : 's'} at M
            {quakes.data.magnitude_floor.toFixed(1)} or above in the last 24 hours
          </p>

          {quakes.data.events.length === 0 ? (
            <p className="font-mono text-sm">
              The feed responded normally but listed nothing above M
              {quakes.data.magnitude_floor.toFixed(1)} in the past day. That is a
              quiet day for the planet, not a failure.
            </p>
          ) : (
            <ul className="flex flex-col">
              {quakes.data.events.map((event, i) => (
                <li
                  key={`${event.time_ms}-${i}`}
                  className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-baseline gap-3 border-b border-border/60 py-1.5"
                >
                  <span className="font-mono text-accent">M {event.magnitude.toFixed(1)}</span>
                  <span>
                    {event.url ? (
                      <a href={event.url} target="_blank" rel="noreferrer" className="underline">
                        {event.place}
                      </a>
                    ) : (
                      event.place
                    )}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatUtc(event.time_ms) ?? 'time unknown'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Card>
  )
}

/** ---------------------------------------------------------------- */
/* ISS                                                               */
/** ---------------------------------------------------------------- */

/**
 * Sub-satellite point on an equirectangular graticule.
 *
 * Latitude is a plain fraction of the box height; longitude wraps at ±180°.
 * The projection distorts area badly toward the poles, which is why the
 * readout below carries the real coordinates rather than leaving the map to
 * imply precision.
 */
function IssMap({ lat, lon }: { lat: number; lon: number }) {
  const x = (lon + 180) / 360
  const y = (90 - lat) / 180

  return (
    <svg
      viewBox="0 0 100 50"
      className="my-3 w-full border border-border"
      role="img"
      aria-label={`ISS sub-satellite point at ${lat.toFixed(2)}°, ${lon.toFixed(2)}°`}
    >
      {/* meridians every 20° of longitude, parallels every 30° of latitude */}
      <g stroke="currentColor" strokeWidth="0.15" opacity="0.28" fill="none">
        <path d="M20 0 V50 M40 0 V50 M60 0 V50 M80 0 V50" />
        <path d="M0 16.67 H100 M0 33.33 H100" />
        <path d="M0 25 H100" strokeDasharray="1 1" />
      </g>
      {/* equator-to-station track */}
      <path
        d={`M0 25 L${(x * 100).toFixed(2)} ${(y * 100).toFixed(2)}`}
        stroke="currentColor"
        strokeWidth="0.3"
        opacity="0.6"
        fill="none"
      />
      <circle cx={(x * 100).toFixed(2)} cy={(y * 100).toFixed(2)} r="1.4" fill="currentColor" />
    </svg>
  )
}

export function LiveIss() {
  const iss = useFeed<IssPayload>(getIss)
  const first = useRef(true)

  // Draw attention to the dot only on the first successful load; a badge
  // that blinks on every poll would be noise.
  useEffect(() => {
    if (iss.data) first.current = false
  }, [iss.data])

  return (
    <Card className="my-6" data-anim>
      <FeedHeader
        title="🛰️ ISS live position"
        source="wheretheiss.at"
        status={iss.status}
        ageSeconds={iss.ageSeconds}
      />

      {iss.status === 'loading' && <Progress className="h-1" />}

      {iss.status === 'error' && <FeedError message={iss.message} onRetry={iss.reload} />}

      {iss.data && (
        <>
          <IssMap lat={iss.data.latitude} lon={iss.data.longitude} />

          <dl className="grid gap-1">
            {(
              [
                ['Latitude', formatDegrees(iss.data.latitude)],
                ['Longitude', formatDegrees(iss.data.longitude)],
                [
                  'Altitude',
                  // A missing value must read as missing. Zero would say the
                  // station is on the ground.
                  iss.data.altitude_km === null
                    ? 'not reported by this service'
                    : `${iss.data.altitude_km.toFixed(1)} km`,
                ],
                [
                  'Speed',
                  iss.data.velocity_kmh === null
                    ? 'not reported by this service'
                    : `${iss.data.velocity_kmh.toFixed(0)} km/h (${toKmPerSecond(
                        iss.data.velocity_kmh,
                      ).toFixed(2)} km/s)`,
                ],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 border-b border-border/60 py-1"
              >
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-mono">{value}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-3 font-mono text-sm text-accent">
            Station is {hemisphere(iss.data.latitude)}.
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            Updated {formatUtc(iss.data.timestamp_ms) ?? 'at an unknown time'}.
          </p>
        </>
      )}
    </Card>
  )
}