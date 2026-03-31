"""Tests for tax year utilities."""

from __future__ import annotations

from datetime import date

import pytest

from backend.forms.tax_year import active_tax_year, available_tax_years, is_new_year_unlocked


class TestActiveTaxYear:
    """active_tax_year() returns current_year - 1."""

    def test_jan_1(self):
        """Jan 1 of year Y → returns Y-1."""
        assert active_tax_year(date(2026, 1, 1)) == 2025

    def test_june_15(self):
        """June 15 of year Y → returns Y-1."""
        assert active_tax_year(date(2026, 6, 15)) == 2025

    def test_dec_31(self):
        """Dec 31 of year Y → returns Y-1."""
        assert active_tax_year(date(2026, 12, 31)) == 2025

    def test_boundary_dec31_to_jan1(self):
        """Boundary: Dec 31 2026 → 2025; Jan 1 2027 → 2026."""
        assert active_tax_year(date(2026, 12, 31)) == 2025
        assert active_tax_year(date(2027, 1, 1)) == 2026

    def test_default_uses_today(self):
        """No arg → uses today's date."""
        result = active_tax_year()
        assert isinstance(result, int)
        assert result == date.today().year - 1


class TestAvailableTaxYears:
    """available_tax_years() returns only years with status='available'."""

    def test_filters_by_available(self):
        """Only rows with status='available' are returned."""
        rows = [
            {"tax_year": 2024, "status": "available"},
            {"tax_year": 2023, "status": "available"},
            {"tax_year": 2022, "status": "failed"},
            {"tax_year": 2025, "status": "pending"},
        ]
        result = available_tax_years(rows)
        assert result == [2023, 2024]

    def test_empty_rows(self):
        """Empty input → empty list."""
        assert available_tax_years([]) == []

    def test_no_available(self):
        """No available rows → empty list."""
        rows = [{"tax_year": 2024, "status": "pending"}]
        assert available_tax_years(rows) == []

    def test_deduplicates(self):
        """Multiple rows for same year → still one entry."""
        rows = [
            {"tax_year": 2024, "status": "available"},
            {"tax_year": 2024, "status": "available"},
        ]
        assert available_tax_years(rows) == [2024]


class TestIsNewYearUnlocked:
    """is_new_year_unlocked checks for available status."""

    def test_year_with_available(self):
        """Year with available row → True."""
        rows = [{"tax_year": 2024, "status": "available"}]
        assert is_new_year_unlocked(2024, rows) is True

    def test_year_without_available(self):
        """Year without available row → False."""
        rows = [{"tax_year": 2024, "status": "pending"}]
        assert is_new_year_unlocked(2024, rows) is False

    def test_year_not_in_rows(self):
        """Year not in rows at all → False."""
        rows = [{"tax_year": 2023, "status": "available"}]
        assert is_new_year_unlocked(2024, rows) is False
