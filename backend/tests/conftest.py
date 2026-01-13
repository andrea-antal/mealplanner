"""Pytest fixtures for isolated test data"""
import pytest
import shutil
from pathlib import Path
from typing import Dict, Any, List, Optional
from fastapi.testclient import TestClient


@pytest.fixture
def temp_data_dir(tmp_path, monkeypatch):
    """Provides isolated test data directory and mocks DATA_DIR

    This fixture ensures tests never modify production data by:
    1. Creating a temporary data directory
    2. Copying test fixtures into it
    3. Mocking the DATA_DIR config to point to temp directory
    4. Auto-cleanup after test completes
    """
    # Create test data directory
    test_data_dir = tmp_path / "test_data"
    test_data_dir.mkdir()

    # Copy test fixtures to temp directory
    fixtures_dir = Path(__file__).parent / "fixtures"
    if fixtures_dir.exists():
        for fixture_file in fixtures_dir.glob("*.json"):
            dest_name = fixture_file.name.replace("_test", "")  # household_test.json -> household_profile.json
            shutil.copy(fixture_file, test_data_dir / dest_name)

    # Mock the DATA_DIR config to point to temp directory
    from app import config
    from app.data import data_manager
    monkeypatch.setattr(config.settings, "DATA_DIR", str(test_data_dir))
    # Note: chroma_persist_dir is now a computed property based on DATA_DIR, so no need to patch it separately
    # CRITICAL: Also patch data_manager.DATA_DIR since it uses its own variable
    monkeypatch.setattr(data_manager, "DATA_DIR", test_data_dir)

    yield test_data_dir

    # Cleanup handled automatically by tmp_path


@pytest.fixture
def client(temp_data_dir):
    """Provides FastAPI test client with isolated data directory

    Must be used with temp_data_dir fixture to ensure isolated testing.
    """
    from app.main import app

    with TestClient(app) as test_client:
        yield test_client


# ===== Supabase Mock Fixtures =====

class MockSupabaseResponse:
    """Mock response object from Supabase queries."""
    def __init__(self, data: Any, count: Optional[int] = None):
        self.data = data
        self.count = count


class MockSupabaseQuery:
    """Mock Supabase query builder with fluent interface."""

    def __init__(self, store: Dict[str, Dict], table_name: str):
        self._store = store
        self._table_name = table_name
        self._filters: List[tuple] = []
        self._single = False
        self._select_cols = "*"
        self._count_mode = None
        self._order_col = None
        self._order_desc = False
        self._limit_val = None

    def select(self, *args, count: Optional[str] = None):
        self._select_cols = args[0] if args else "*"
        self._count_mode = count
        return self

    def eq(self, field: str, value: Any):
        self._filters.append((field, "eq", value))
        return self

    def single(self):
        self._single = True
        return self

    def order(self, column: str, desc: bool = False):
        self._order_col = column
        self._order_desc = desc
        return self

    def limit(self, n: int):
        self._limit_val = n
        return self

    def execute(self) -> MockSupabaseResponse:
        """Execute query and return matching records."""
        table_data = self._store.get(self._table_name, {})

        # Apply filters
        results = []
        for key, record in table_data.items():
            match = True
            for field, op, value in self._filters:
                if op == "eq" and record.get(field) != value:
                    match = False
                    break
            if match:
                results.append(record)

        # Apply ordering
        if self._order_col:
            results.sort(
                key=lambda x: x.get(self._order_col) or "",
                reverse=self._order_desc
            )

        # Apply limit
        if self._limit_val:
            results = results[:self._limit_val]

        # Handle single() - raises PGRST116 if no rows
        if self._single:
            if not results:
                raise Exception("PGRST116: JSON object requested, multiple (or no) rows returned")
            return MockSupabaseResponse(results[0])

        # Handle count mode
        if self._count_mode == "exact":
            return MockSupabaseResponse(results, count=len(results))

        return MockSupabaseResponse(results)

    def upsert(self, data: Dict[str, Any], on_conflict: str = None):
        """Upsert data into the mock store."""
        self._upsert_data = data
        self._on_conflict = on_conflict
        return self

    def delete(self):
        """Delete matching records."""
        return self


class MockSupabaseUpsertQuery(MockSupabaseQuery):
    """Query that handles upsert execution."""

    def __init__(self, store: Dict[str, Dict], table_name: str, data: Dict[str, Any], on_conflict: str):
        super().__init__(store, table_name)
        self._upsert_data = data
        self._on_conflict = on_conflict

    def execute(self) -> MockSupabaseResponse:
        """Execute upsert - insert or update based on conflict key."""
        table_data = self._store.setdefault(self._table_name, {})

        # Use conflict key as the record key
        key = self._upsert_data.get(self._on_conflict, str(len(table_data)))
        table_data[key] = self._upsert_data.copy()

        return MockSupabaseResponse(self._upsert_data)


class MockSupabaseTable:
    """Mock Supabase table interface."""

    def __init__(self, store: Dict[str, Dict], table_name: str):
        self._store = store
        self._table_name = table_name

    def select(self, *args, count: Optional[str] = None):
        query = MockSupabaseQuery(self._store, self._table_name)
        return query.select(*args, count=count)

    def upsert(self, data: Dict[str, Any], on_conflict: str = None):
        return MockSupabaseUpsertQuery(self._store, self._table_name, data, on_conflict)

    def delete(self):
        return MockSupabaseQuery(self._store, self._table_name)


class MockSupabaseClient:
    """Mock Supabase client for testing."""

    def __init__(self, store: Dict[str, Dict]):
        self._store = store

    def table(self, table_name: str) -> MockSupabaseTable:
        return MockSupabaseTable(self._store, table_name)


@pytest.fixture
def mock_supabase(monkeypatch):
    """
    Mock Supabase client with in-memory storage for isolated testing.

    Provides a complete mock of Supabase operations:
    - select, eq, single, execute query chains
    - upsert with on_conflict handling
    - PGRST116 error simulation for single() with no results

    Returns:
        Dict[str, Dict]: The in-memory store for assertions

    Usage:
        def test_something(mock_supabase):
            # Test code that uses Supabase
            # Can check mock_supabase["household_profiles"] for stored data
    """
    store: Dict[str, Dict] = {
        "household_profiles": {},
        "recipes": {},
        "meal_plans": {},
        "groceries": {},
        "profiles": {},
    }

    mock_client = MockSupabaseClient(store)

    # Patch the client getter in data_manager
    monkeypatch.setattr(
        "app.data.data_manager._get_client",
        lambda: mock_client
    )

    return store


@pytest.fixture
def client_with_mock_supabase(mock_supabase):
    """
    FastAPI test client with mocked Supabase.

    Use this for testing endpoints that interact with Supabase.
    The mock_supabase store is available for pre-populating test data
    or asserting on stored results.
    """
    from app.main import app

    with TestClient(app) as test_client:
        yield test_client, mock_supabase
