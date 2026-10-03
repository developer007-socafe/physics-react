/**
 * Loads one feed and exposes a status the UI can render directly.
 *
 * Every widget needs the same four states and the same guarantee: an error
 * must never leave a spinner running or an empty box on screen. Centralising
 * it here means a new feed gets that behaviour by construction.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { FeedError, FeedMeta } from '@/lib/api'

export type Status = 'loading' | 'live' | 'stale' | 'error'

export interface LiveState<T> {
  status: Status
  data: T | null
  message: string
  /** Seconds since the cached copy was fetched, when stale. */
  ageSeconds?: number
  reload: () => void
}

export function useFeed<T>(
  fetcher: () => Promise<FeedMeta | FeedError>,
): LiveState<T> {
  const [state, setState] = useState<LiveState<T>>({
    status: 'loading',
    data: null,
    message: '',
    reload: () => {},
  })

  // Guards against a slow first response overwriting a newer one after a
  // manual reload.
  const requestId = useRef(0)

  const load = useCallback(async () => {
    const id = ++requestId.current
    setState((prev) => ({ ...prev, status: 'loading' }))

    const result = await fetcher()

    if (id !== requestId.current) return

    if (result.ok) {
      setState({
        status: result.stale ? 'stale' : 'live',
        data: result.data as T,
        message: result.stale ? 'Showing a cached copy from earlier.' : '',
        ageSeconds: result.age_seconds,
        reload: () => {},
      })
    } else {
      setState({
        status: 'error',
        data: null,
        message: result.message,
        reload: () => {},
      })
    }
  }, [fetcher])

  useEffect(() => {
    void load()
  }, [load])

  const reload = useCallback(() => {
    void load()
  }, [load])

  return { ...state, reload }
}