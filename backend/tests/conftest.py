"""Pytest fixtures for isolated test data"""
import pytest
import shutil
from pathlib import Path
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
    monkeypatch.setattr(config.settings, "CHROMA_PERSIST_DIR", str(test_data_dir / "chroma_db"))
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
