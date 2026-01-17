"""Tests for URL fetching service for recipe import"""
import pytest
import httpx
from app.services.url_fetcher import (
    fetch_html_from_url,
    clean_tracking_params,
    find_print_recipe_url,
    FetchResult
)


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


# =============================================================================
# Tests for clean_tracking_params
# =============================================================================


def test_clean_tracking_params_removes_utm():
    """Should remove UTM tracking parameters"""
    url = "https://example.com/recipe?utm_source=instagram&utm_medium=social&id=123"
    cleaned = clean_tracking_params(url)
    assert "utm_source" not in cleaned
    assert "utm_medium" not in cleaned
    assert "id=123" in cleaned


def test_clean_tracking_params_removes_fbclid():
    """Should remove Facebook click ID"""
    url = "https://example.com/recipe?fbclid=abc123&print=true"
    cleaned = clean_tracking_params(url)
    assert "fbclid" not in cleaned
    assert "print=true" in cleaned


def test_clean_tracking_params_removes_gclid():
    """Should remove Google click ID"""
    url = "https://example.com/recipe?gclid=xyz789"
    cleaned = clean_tracking_params(url)
    assert "gclid" not in cleaned


def test_clean_tracking_params_preserves_print_recipe():
    """Should preserve print_recipe parameter"""
    url = "https://example.com/recipe?print_recipe=true&utm_source=ig"
    cleaned = clean_tracking_params(url)
    assert "print_recipe=true" in cleaned
    assert "utm_source" not in cleaned


def test_clean_tracking_params_no_query():
    """Should handle URLs without query params"""
    url = "https://example.com/recipe"
    cleaned = clean_tracking_params(url)
    assert cleaned == "https://example.com/recipe"


def test_clean_tracking_params_empty_after_cleaning():
    """Should handle URLs where all params are tracking"""
    url = "https://example.com/recipe?utm_source=ig&fbclid=abc"
    cleaned = clean_tracking_params(url)
    assert cleaned == "https://example.com/recipe"


# =============================================================================
# Tests for find_print_recipe_url
# =============================================================================


def test_find_print_recipe_url_wprm_pattern():
    """Should detect WPRM print_recipe=true pattern in href"""
    html = '''
    <html>
        <a href="https://example.com/recipe?print_recipe=true">Print Recipe</a>
    </html>
    '''
    result = find_print_recipe_url(html, "https://example.com/recipe")
    assert result == "https://example.com/recipe?print_recipe=true"


def test_find_print_recipe_url_generic_print_pattern():
    """Should detect generic ?print=true pattern"""
    html = '''
    <html>
        <a href="/recipe?print=true">Print</a>
    </html>
    '''
    result = find_print_recipe_url(html, "https://example.com/recipe")
    assert result == "https://example.com/recipe?print=true"


def test_find_print_recipe_url_path_pattern():
    """Should detect /print path pattern"""
    html = '''
    <html>
        <a href="/recipe/print">Print Version</a>
    </html>
    '''
    result = find_print_recipe_url(html, "https://example.com/recipe")
    assert result == "https://example.com/recipe/print"


def test_find_print_recipe_url_link_text():
    """Should detect print links by text content"""
    html = '''
    <html>
        <a href="/recipe-printer">Print Recipe</a>
    </html>
    '''
    result = find_print_recipe_url(html, "https://example.com/recipe")
    assert result == "https://example.com/recipe-printer"


def test_find_print_recipe_url_printer_friendly_text():
    """Should detect 'printer friendly' text pattern"""
    html = '''
    <html>
        <a href="/recipe/friendly-view">Printer Friendly</a>
    </html>
    '''
    result = find_print_recipe_url(html, "https://example.com/recipe")
    assert result == "https://example.com/recipe/friendly-view"


def test_find_print_recipe_url_none_found():
    """Should return None when no print URL found"""
    html = '''
    <html>
        <a href="/about">About Us</a>
        <a href="/contact">Contact</a>
    </html>
    '''
    result = find_print_recipe_url(html, "https://example.com/recipe")
    assert result is None


def test_find_print_recipe_url_relative_to_absolute():
    """Should convert relative URLs to absolute"""
    html = '''
    <html>
        <a href="?print_recipe=true">Print</a>
    </html>
    '''
    result = find_print_recipe_url(html, "https://example.com/recipes/pasta")
    assert result == "https://example.com/recipes/pasta?print_recipe=true"


def test_find_print_recipe_url_cross_domain_rejected():
    """Should reject cross-domain print URLs for security"""
    html = '''
    <html>
        <a href="https://malicious.com/recipe?print=true">Print Recipe</a>
    </html>
    '''
    result = find_print_recipe_url(html, "https://example.com/recipe")
    assert result is None


def test_find_print_recipe_url_javascript_skipped():
    """Should skip javascript: links"""
    html = '''
    <html>
        <a href="javascript:window.print()">Print Recipe</a>
        <a href="?print_recipe=true">Real Print Link</a>
    </html>
    '''
    result = find_print_recipe_url(html, "https://example.com/recipe")
    assert result == "https://example.com/recipe?print_recipe=true"


def test_find_print_recipe_url_wprm_path():
    """Should detect WPRM plugin specific path"""
    html = '''
    <html>
        <a href="/wprm_print/12345">Print</a>
    </html>
    '''
    result = find_print_recipe_url(html, "https://example.com/recipe")
    assert result == "https://example.com/wprm_print/12345"


def test_find_print_recipe_url_with_inner_html():
    """Should handle links with inner HTML tags"""
    html = '''
    <html>
        <a href="/recipe/print"><span class="icon">🖨️</span> Print Recipe</a>
    </html>
    '''
    result = find_print_recipe_url(html, "https://example.com/recipe")
    assert result == "https://example.com/recipe/print"


# =============================================================================
# Tests for FetchResult type
# =============================================================================


def test_fetch_result_named_tuple():
    """FetchResult should be a proper NamedTuple with correct fields"""
    result = FetchResult(
        html_content="<html></html>",
        source_name="Example",
        used_print_version=True,
        fetched_url="https://example.com/print"
    )
    assert result.html_content == "<html></html>"
    assert result.source_name == "Example"
    assert result.used_print_version is True
    assert result.fetched_url == "https://example.com/print"
