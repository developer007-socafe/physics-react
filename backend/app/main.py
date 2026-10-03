"""Physics Fundamentals — FastAPI backend.

Serves the live-data endpoints that the React frontend consumes, so the
browser never talks to a third-party API directly. That matters for three
reasons discovered the hard way while building the static version:

1. CORS.  Several of these feeds are CORS-enabled, but not all reliably, and
   a feed that stops sending ``Access-Control-Allow-Origin`` would break the
   page for every visitor at once rather than gracefully degrading.
2. Rate limits and flakiness.  ``api.nasa.gov`` intermittently returns HTTP 500
   to anonymous callers.  Proxying lets us retry a fallback upstream, cache a
   good response for a while, and serve the last good copy when everything
   upstream is down.
3. Mixed content.  Some feeds only answer on http://, which a browser refuses
   to load from an https page.  The proxy is served over https and does that
   hop server-side.

Every endpoint degrades to a JSON body carrying ``ok: false`` plus a human
readable ``message``; it never returns a 5xx for an upstream problem, because
the frontend treats non-2xx as "show the error state" and we would rather it
render a specific explanation.

Run locally::

    uv run uvicorn backend.app.main:app --reload --port 8000
"""

from __future__ import annotations

import asyncio
import time
from typing import Any

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="Physics Fundamentals API",
    description="Cached, CORS-safe proxy for free public physics and space data.",
    version="1.0.0",
)

# The Vite dev server and the deployed GitHub Pages origin. In production this
# should be narrowed to the real site origin.
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "https://developer007-socafe.github.io",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)

# ----------------------------------------------------------------------
# Upstream feeds
# ----------------------------------------------------------------------

# Each entry is (primary, fallbacks...). NASA intermittently 500s on
# anonymous requests, so the documented no-key mirror is a peer, not a backup.
FEEDS: dict[str, dict[str, Any]] = {
    "apod": {
        "urls": [
            "https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY",
            "https://apod.as93.net/apod",
        ],
        "ttl": 60 * 60,  # NASA's picture of the day changes once a day
        "timeout": 8.0,
        "label": "NASA Astronomy Picture of the Day",
    },
    "quakes": {
        "urls": [
            "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
        ],
        "ttl": 300,  # all-day feed; five minutes is plenty fresh
        "timeout": 8.0,
        "label": "USGS Earthquake Hazards Program",
    },
    "iss": {
        "urls": [
            # Open Notify's HTTPS endpoint is broken — it only answers on
            # http://. This one is https and reports altitude and velocity.
            "https://api.wheretheiss.at/v1/satellites/25544",
            "http://api.open-notify.org/iss-now.json",
        ],
        "ttl": 30,  # the station moves visibly
        "timeout": 8.0,
        "label": "ISS position",
    },
}

# Simple TTL cache. Keyed by feed name; holds the last good payload so a
# total upstream outage still renders real data with a staleness note.
_cache: dict[str, dict[str, Any]] = {}


class FeedError(Exception):
    """Raised when every upstream for a feed failed."""


def _read_cache(name: str) -> dict[str, Any] | None:
    entry = _cache.get(name)
    if not entry:
        return None
    if time.time() - entry["at"] > FEEDS[name]["ttl"]:
        return None
    return entry


def _cached_response(name: str) -> dict[str, Any] | None:
    """Return a still-fresh cache entry, or None."""
    return _read_cache(name)


async def _fetch_feed(name: str) -> dict[str, Any]:
    """Fetch a feed from its first healthy upstream, caching the result."""
    spec = FEEDS[name]
    headers = {"User-Agent": "PhysicsFundamentals/1.0 (+educational site)"}
    last_error = "no upstream responded"

    async with httpx.AsyncClient(
        timeout=spec["timeout"], follow_redirects=True, headers=headers
    ) as client:
        for url in spec["urls"]:
            try:
                response = await client.get(url)
                response.raise_for_status()
                payload = response.json()
            except httpx.HTTPStatusError as exc:
                last_error = f"{spec['label']} returned HTTP {exc.response.status_code}"
            except httpx.TimeoutException:
                last_error = f"{spec['label']} did not respond within {spec['timeout']:g}s"
            except httpx.HTTPError as exc:
                last_error = f"{spec['label']} could not be reached: {exc.__class__.__name__}"
            except ValueError:
                last_error = f"{spec['label']} returned a response that is not JSON"
            else:
                _cache[name] = {"at": time.time(), "payload": payload}
                return payload

    raise FeedError(last_error)


def _stale_response(name: str) -> dict[str, Any] | None:
    """Last good payload, ignoring TTL — used when every upstream is down."""
    entry = _cache.get(name)
    if not entry:
        return None
    age = int(time.time() - entry["at"])
    return {"ok": True, "stale": True, "age_seconds": age, "data": entry["payload"]}


def _failure(name: str, message: str) -> dict[str, Any]:
    return {
        "ok": False,
        "message": message,
        "source": FEEDS[name]["label"],
        "hint": "This feed needs an internet connection. The rest of the site works offline.",
    }


# ----------------------------------------------------------------------
# Response shaping
# ----------------------------------------------------------------------


def _shape_apod(payload: dict[str, Any]) -> dict[str, Any]:
    """Reduce NASA's payload to the fields the page actually renders."""
    media_type = payload.get("media_type") or ""
    return {
        "title": payload.get("title") or "Untitled",
        "explanation": payload.get("explanation") or "",
        "media_type": media_type,
        "url": payload.get("url") or "",
        "hdurl": payload.get("hdurl") or payload.get("url") or "",
        "date": payload.get("date") or "",
        "copyright": payload.get("copyright") or "",
    }


def _shape_quakes(payload: dict[str, Any]) -> dict[str, Any]:
    """Filter the all-day GeoJSON down to the significant events.

    Magnitude floor and row cap mirror what the frontend asks for, so the
    browser never receives a payload it would immediately discard.
    """
    magnitude_floor = 4.5
    limit = 9

    rows = []
    for feature in payload.get("features") or []:
        props = (feature or {}).get("properties") or {}
        magnitude = props.get("mag")
        if not isinstance(magnitude, (int, float)) or magnitude < magnitude_floor:
            continue
        rows.append(
            {
                "magnitude": magnitude,
                "place": props.get("place") or "Location unreported",
                "time_ms": props.get("time"),
                "url": props.get("url") or "",
                "tsunami": bool(props.get("tsunami")),
            }
        )

    rows.sort(key=lambda row: row["magnitude"], reverse=True)
    return {
        "events": rows[:limit],
        "total_above_floor": len(rows),
        "magnitude_floor": magnitude_floor,
    }


def _shape_iss(payload: dict[str, Any]) -> dict[str, Any]:
    """Normalise two feeds with different shapes into one response.

    WhereTheISSAt puts ``latitude``/``altitude`` at the top level; Open Notify
    nests them under ``iss_position`` and calls the field ``altitude_km``.
    """
    position = payload.get("iss_position") or payload or {}
    try:
        latitude = float(position["latitude"])
        longitude = float(position["longitude"])
    except (KeyError, TypeError, ValueError) as err:
        raise FeedError("The ISS feed replied without a readable position") from err

    altitude = position.get("altitude_km", position.get("altitude"))
    velocity = position.get("velocity")

    # Both feeds send Unix seconds; the frontend needs milliseconds so that
    # `new Date()` does not render 21 Jan 1970.
    timestamp = payload.get("timestamp")
    try:
        timestamp_ms = int(float(timestamp) * 1000)
    except (TypeError, ValueError):
        timestamp_ms = None

    return {
        "latitude": latitude,
        "longitude": longitude,
        "altitude_km": float(altitude) if altitude is not None else None,
        "velocity_kmh": float(velocity) if velocity is not None else None,
        "timestamp_ms": timestamp_ms,
    }


SHAPERS = {"apod": _shape_apod, "quakes": _shape_quakes, "iss": _shape_iss}


# ----------------------------------------------------------------------
# Routes
# ----------------------------------------------------------------------


@app.get("/api/health")
async def health() -> dict[str, Any]:
    """Liveness probe. Also reports which feeds are currently cached."""
    return {
        "status": "ok",
        "cached_feeds": sorted(_cache),
        "feeds": sorted(FEEDS),
    }


class Health(BaseModel):
    status: str
    detail: str


@app.get("/api/ping", response_model=Health, tags=["meta"])
async def ping() -> Health:
    """Trivial typed endpoint, useful for checking the schema end to end.

    Declared before ``/api/{feed_name}`` because FastAPI matches routes in
    registration order — the catch-all would otherwise swallow this path.
    """
    await asyncio.sleep(0)
    return Health(status="pong", detail="Physics Fundamentals API is responding.")


@app.get("/api/{feed_name}")
async def get_feed(feed_name: str) -> dict[str, Any]:
    """Return one feed's data, cached, with a documented failure shape.

    Always answers 200. A missing feed is the only 404, because the frontend
    distinguishes "upstream is unhappy" (render the message) from "this
    endpoint does not exist" (a real bug worth surfacing loudly).
    """
    if feed_name not in FEEDS:
        return {
            "ok": False,
            "message": f"Unknown feed '{feed_name}'.",
            "available": sorted(FEEDS),
        }

    cached = _cached_response(feed_name)
    if cached is not None:
        return {
            "ok": True,
            "cached": True,
            "data": SHAPERS[feed_name](cached["payload"]),
        }

    try:
        payload = await _fetch_feed(feed_name)
    except FeedError as exc:
        # Prefer showing slightly old real data over an error message.
        stale = _stale_response(feed_name)
        if stale is not None:
            return {
                "ok": True,
                "cached": True,
                "stale": True,
                "age_seconds": stale["age_seconds"],
                "data": SHAPERS[feed_name](stale["data"]),
            }
        return _failure(feed_name, str(exc))

    try:
        shaped = SHAPERS[feed_name](payload)
    except FeedError as exc:
        return _failure(feed_name, str(exc))
    except Exception as exc:  # noqa: BLE001 - never 500 the frontend
        label = FEEDS[feed_name]["label"]
        return _failure(feed_name, f"Could not read the {label} response: {exc}")

    return {"ok": True, "cached": False, "data": shaped}


# ----------------------------------------------------------------------
# Content API
# ----------------------------------------------------------------------


