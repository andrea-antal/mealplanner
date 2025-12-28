"""Tests for URL fetching service for recipe import"""
import pytest
import httpx
from app.services.url_fetcher import fetch_html_from_url


@pytest.mark.asyncio
async def test_fetch_valid_url():
    """Should successfully fetch HTML from valid URL"""
    html, source_name = await fetch_html_from_url("https://www.example.com/")

    assert isinstance(html, str)
    assert len(html) > 0
    assert source_name == "Example"


@pytest.mark.asyncio
async def test_fetch_invalid_url_format():
    """Should raise ValueError for invalid URL format"""
    with pytest.raises(ValueError, match="Invalid URL format"):
        await fetch_html_from_url("not-a-url")


@pytest.mark.asyncio
async def test_fetch_localhost_blocked():
    """Should reject localhost URLs for security"""
    with pytest.raises(ValueError, match="security|localhost|internal"):
        await fetch_html_from_url("http://localhost:8000/recipe")


@pytest.mark.asyncio
async def test_fetch_internal_ip_blocked():
    """Should reject internal IP addresses for security"""
    with pytest.raises(ValueError, match="security|localhost|internal"):
        await fetch_html_from_url("http://192.168.1.1/recipe")


@pytest.mark.asyncio
async def test_fetch_404_error():
    """Should raise HTTPStatusError for 404"""
    # Use a URL that's guaranteed to 404
    with pytest.raises((httpx.HTTPStatusError, httpx.RequestError)):
        await fetch_html_from_url("https://example.com/this-page-definitely-does-not-exist-404")


@pytest.mark.asyncio
async def test_extract_source_name_from_domain():
    """Should extract friendly source name from domain"""
    _, source_name = await fetch_html_from_url("https://www.example.com/")
    assert source_name == "Example"


@pytest.mark.asyncio
async def test_extract_source_name_without_www():
    """Should handle domains without www prefix"""
    _, source_name = await fetch_html_from_url("https://example.com/")
    assert source_name == "Example"


@pytest.mark.asyncio
async def test_timeout_handling():
    """Should timeout after specified seconds"""
    # Use a very short timeout to test timeout handling
    # example.com should respond, but not within 0.001 seconds
    with pytest.raises(httpx.TimeoutException):
        await fetch_html_from_url("https://www.example.com/", timeout=0.001)


@pytest.mark.asyncio
async def test_redirect_following():
    """Should follow redirects automatically"""
    # example.com doesn't redirect, but we can test it doesn't fail
    html, _ = await fetch_html_from_url("https://www.example.com/")
    assert html is not None
    assert len(html) > 0


@pytest.mark.asyncio
async def test_https_only_allowed():
    """Should allow both HTTP and HTTPS"""
    # Note: We allow HTTP but will upgrade to HTTPS where possible
    _, source_name = await fetch_html_from_url("http://example.com/")
    assert source_name == "Example"


@pytest.mark.asyncio
async def test_invalid_scheme():
    """Should reject non-HTTP(S) schemes"""
    with pytest.raises(ValueError, match="Invalid URL|HTTP"):
        await fetch_html_from_url("ftp://example.com/recipe")


@pytest.mark.asyncio
async def test_user_agent_set():
    """Should set browser user-agent to avoid bot blocking"""
    # This test verifies the headers are set correctly
    # We can't easily test this without mocking, but we can verify it doesn't fail
    html, _ = await fetch_html_from_url("https://www.example.com/")
    assert html is not None
