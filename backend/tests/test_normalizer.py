"""Tests for normalizer service."""

from app.services.normalizer import _extract_conversions


def test_extract_conversions_purchase():
    raw = {
        "actions": [
            {"action_type": "link_click", "value": "50"},
            {"action_type": "purchase", "value": "3"},
        ]
    }
    assert _extract_conversions(raw) == 3


def test_extract_conversions_lead():
    raw = {
        "actions": [
            {"action_type": "lead", "value": "10"},
        ]
    }
    assert _extract_conversions(raw) == 10


def test_extract_conversions_pixel():
    raw = {
        "actions": [
            {"action_type": "offsite_conversion.fb_pixel_purchase", "value": "5"},
            {"action_type": "offsite_conversion.fb_pixel_lead", "value": "2"},
        ]
    }
    assert _extract_conversions(raw) == 7


def test_extract_conversions_empty():
    assert _extract_conversions({}) == 0
    assert _extract_conversions({"actions": []}) == 0


def test_extract_conversions_no_known_type_fallback():
    raw = {
        "actions": [
            {"action_type": "some_custom_action", "value": "8"},
        ]
    }
    assert _extract_conversions(raw) == 8
