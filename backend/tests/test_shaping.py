"""Tests for the physics data API.

The shaping functions are where the real bugs lived last time: a feed that
nests fields differently, a timestamp in seconds read as milliseconds, a
velocity converted with the wrong factor. Each of those is pinned here.

These tests do not touch the network. The shaping functions are pure, which
is the reason they were separated out.
"""

from __future__ import annotations

import pytest
from backend.app.main import (
    FeedError,
    _shape_apod,
    _shape_iss,
    _shape_quakes,
)


class TestShapeApod:
    def test_extracts_the_fields_the_page_renders(self) -> None:
        payload = {
            "title": "A Spiral",
            "explanation": "Look closely.",
            "media_type": "image",
            "url": "https://example.test/small.jpg",
            "hdurl": "https://example.test/big.jpg",
            "date": "2026-01-01",
            "copyright": "NASA",
        }
        assert _shape_apod(payload) == {
            "title": "A Spiral",
            "explanation": "Look closely.",
            "media_type": "image",
            "url": "https://example.test/small.jpg",
            "hdurl": "https://example.test/big.jpg",
            "date": "2026-01-01",
            "copyright": "NASA",
        }

    def test_hdurl_falls_back_to_url(self) -> None:
        shaped = _shape_apod({"title": "t", "url": "https://example.test/a.jpg"})
        assert shaped["hdurl"] == "https://example.test/a.jpg"

    def test_missing_fields_become_empty_not_none(self) -> None:
        """The frontend renders these as text; None would print 'null'."""
        shaped = _shape_apod({})
        assert shaped["title"] == "Untitled"
        assert shaped["explanation"] == ""
        assert shaped["media_type"] == ""

    def test_preserves_video_media_type_so_the_ui_can_link_instead(self) -> None:
        shaped = _shape_apod({"media_type": "video", "url": "https://example.test/v"})
        assert shaped["media_type"] == "video"


class TestShapeQuakes:
    def test_filters_below_the_magnitude_floor(self) -> None:
        payload = {
            "features": [
                {"properties": {"mag": 5.5, "place": "Big"}},
                {"properties": {"mag": 4.4, "place": "Small"}},
                {"properties": {"mag": None, "place": "Unknown"}},
                {"properties": {}},
            ]
        }
        shaped = _shape_quakes(payload)
        assert [row["place"] for row in shaped["events"]] == ["Big"]
        assert shaped["total_above_floor"] == 1
        assert shaped["magnitude_floor"] == 4.5

    def test_sorts_strongest_first_and_caps_the_list(self) -> None:
        features = [
            {"properties": {"mag": 4.5 + i * 0.1, "place": f"E{i}"}} for i in range(20)
        ]
        shaped = _shape_quakes({"features": features})
        magnitudes = [row["magnitude"] for row in shaped["events"]]
        assert magnitudes == sorted(magnitudes, reverse=True)
        assert len(shaped["events"]) == 9
        # The cap applies to the returned rows only, never the real total.
        assert shaped["total_above_floor"] == 20

    def test_empty_feed_is_not_an_error(self) -> None:
        shaped = _shape_quakes({"features": []})
        assert shaped["events"] == []
        assert shaped["total_above_floor"] == 0

    def test_missing_place_gets_readable_text(self) -> None:
        shaped = _shape_quakes({"features": [{"properties": {"mag": 5.0}}]})
        assert shaped["events"][0]["place"] == "Location unreported"


class TestShapeIss:
    def test_reads_the_flat_shape_from_wheretheiss(self) -> None:
        shaped = _shape_iss(
            {
                "latitude": 51.25,
                "longitude": -7.83,
                "altitude": 425.06,
                "velocity": 27563.6,
                "timestamp": 1791017803,
                "units": "kilometers",
            }
        )
        assert shaped["latitude"] == 51.25
        assert shaped["altitude_km"] == 425.06
        assert shaped["velocity_kmh"] == 27563.6
        # Seconds -> milliseconds. 1_000_000 is Jan 1970 in disguise.
        assert shaped["timestamp_ms"] == 1791017803000
        assert shaped["timestamp_ms"] > 1_700_000_000_000

    def test_reads_the_nested_shape_from_open_notify(self) -> None:
        shaped = _shape_iss(
            {
                "message": "success",
                "timestamp": 1791016765,
                "iss_position": {"latitude": "51.2495", "longitude": "62.2627"},
            }
        )
        assert shaped["latitude"] == 51.2495
        assert shaped["longitude"] == 62.2627

    def test_absent_altitude_and_velocity_are_none_not_zero(self) -> None:
        """Open Notify reports neither; zero would read as 'on the ground'."""
        shaped = _shape_iss({"iss_position": {"latitude": 1.0, "longitude": 2.0}})
        assert shaped["altitude_km"] is None
        assert shaped["velocity_kmh"] is None

    @pytest.mark.parametrize(
        "payload",
        [
            {},
            {"iss_position": {}},
            {"latitude": "not-a-number", "longitude": 0},
            {"iss_position": {"latitude": None, "longitude": 1}},
        ],
    )
    def test_unreadable_position_raises_rather_than_returning_junk(self, payload) -> None:
        with pytest.raises(FeedError):
            _shape_iss(payload)

    def test_unparseable_timestamp_is_none_not_a_wrong_date(self) -> None:
        shaped = _shape_iss({"latitude": 1.0, "longitude": 2.0, "timestamp": "nope"})
        assert shaped["timestamp_ms"] is None