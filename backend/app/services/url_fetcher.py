"""URL fetching service for recipe import"""
import re
import httpx
import logging
from urllib.parse import urlparse, urljoin, parse_qs, urlencode, urlunparse, ParseResult
from typing import Tuple, Optional, NamedTuple

logger = logging.getLogger(__name__)


# =============================================================================
# Types
# =============================================================================


class FetchResult(NamedTuple):
    """Result of fetching recipe HTML with metadata."""
    html_content: str
    source_name: str
    used_print_version: bool
    fetched_url: str  # The URL actually used (may differ from input)


# =============================================================================
# URL Cleaning - Remove tracking parameters
# =============================================================================


# Common tracking parameters to strip from URLs
TRACKING_PARAMS = {
    # Google Analytics / Ads
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'gclid', 'gclsrc', 'dclid',
    # Facebook
    'fbclid', 'fb_action_ids', 'fb_action_types', 'fb_source', 'fb_ref',
    # Microsoft/Bing
    'msclkid',
    # Others
    '_ga', '_gl', 'mc_cid', 'mc_eid',  # Mailchimp
    'ref', 'ref_src',  # Generic referrers
    'share', 'share_source',  # Share tracking
}


def clean_tracking_params(url: str) -> str:
    """
    Remove common tracking query parameters from a URL.

    Preserves legitimate query params like print_recipe=true while stripping
    analytics/tracking junk like utm_source, fbclid, gclid, etc.

    Args:
        url: URL to clean

    Returns:
        URL with tracking parameters removed

    Examples:
        >>> clean_tracking_params("https://example.com/recipe?utm_source=ig&print=true")
        'https://example.com/recipe?print=true'
    """
    parsed = urlparse(url)
    query_params = parse_qs(parsed.query, keep_blank_values=True)

    # Filter out tracking params (case-insensitive)
    cleaned_params = {
        k: v for k, v in query_params.items()
        if k.lower() not in TRACKING_PARAMS
    }

    # Rebuild the URL
    cleaned_query = urlencode(cleaned_params, doseq=True)
    cleaned_url = urlunparse((
        parsed.scheme,
        parsed.netloc,
        parsed.path,
        parsed.params,
        cleaned_query,
        parsed.fragment
    ))

    return cleaned_url


# =============================================================================
# Print Recipe URL Detection
# =============================================================================


# Patterns to detect print recipe URLs in href attributes
PRINT_URL_PATTERNS = [
    # Query parameter patterns (most common - WPRM, Tasty Recipes, etc.)
    r'\?print_recipe(?:=|&|$)',  # ?print_recipe=true or ?print_recipe&other
    r'\?print(?:=|&|$)',          # ?print=true or ?print
    r'&print_recipe(?:=|&|$)',    # &print_recipe=true
    r'&print(?:=|&|$)',           # &print=true
    # Path patterns
    r'/print/?$',                 # /print or /print/
    r'/print-recipe/?$',          # /print-recipe
    r'/wprm_print/',              # WPRM plugin specific
]

# Patterns to detect print links by their text content
PRINT_LINK_TEXT_PATTERNS = [
    r'print\s*recipe',
    r'print\s*this',
    r'printer[-\s]*friendly',
    r'print\s*view',
]


def find_print_recipe_url(html_content: str, base_url: str) -> Optional[str]:
    """
    Search HTML for a print-friendly recipe URL.

    Looks for links with print-related patterns in href or link text.
    Returns the first matching URL found, converted to absolute.

    Args:
        html_content: Raw HTML to search
        base_url: Original URL for resolving relative links

    Returns:
        Absolute print recipe URL if found, None otherwise

    Security:
        Only returns URLs on the same domain as base_url to prevent
        open redirect attacks.

    Examples:
        >>> html = '<a href="?print_recipe=true">Print Recipe</a>'
        >>> find_print_recipe_url(html, "https://example.com/recipe")
        'https://example.com/recipe?print_recipe=true'
    """
    base_parsed = urlparse(base_url)
    base_domain = base_parsed.netloc.lower()

    # Extract all <a> tags with href attributes
    # Simple regex extraction - avoid full HTML parsing for speed
    link_pattern = r'<a\s+[^>]*href\s*=\s*["\']([^"\']+)["\'][^>]*>(.*?)</a>'
    links = re.findall(link_pattern, html_content, re.IGNORECASE | re.DOTALL)

    for href, link_text in links:
        # Skip empty hrefs and javascript links
        if not href or href.startswith(('javascript:', '#', 'mailto:')):
            continue

        # Check if href matches print URL patterns
        for pattern in PRINT_URL_PATTERNS:
            if re.search(pattern, href, re.IGNORECASE):
                absolute_url = _resolve_and_validate_url(href, base_url, base_domain)
                if absolute_url:
                    logger.debug(f"Found print URL via href pattern: {absolute_url}")
                    return absolute_url

        # Check if link text matches print link patterns
        clean_text = re.sub(r'<[^>]+>', '', link_text).strip()  # Remove inner HTML tags
        for pattern in PRINT_LINK_TEXT_PATTERNS:
            if re.search(pattern, clean_text, re.IGNORECASE):
                absolute_url = _resolve_and_validate_url(href, base_url, base_domain)
                if absolute_url:
                    logger.debug(f"Found print URL via link text: {absolute_url}")
                    return absolute_url

    logger.debug("No print recipe URL found in HTML")
    return None


def _resolve_and_validate_url(href: str, base_url: str, base_domain: str) -> Optional[str]:
    """
    Resolve relative URL and validate it's on the same domain.

    Args:
        href: The href attribute value (may be relative)
        base_url: Base URL for resolving relative links
        base_domain: Domain of base URL (for security validation)

    Returns:
        Absolute URL if valid and same domain, None otherwise
    """
    try:
        # Resolve relative URLs to absolute
        absolute_url = urljoin(base_url, href)
        parsed = urlparse(absolute_url)

        # Security: Must be same domain (prevent open redirects)
        if parsed.netloc.lower() != base_domain:
            logger.debug(f"Rejecting cross-domain print URL: {absolute_url}")
            return None

        # Must be HTTP(S)
        if parsed.scheme not in ('http', 'https'):
            return None

        return absolute_url
    except Exception as e:
        logger.debug(f"Failed to resolve URL '{href}': {e}")
        return None

# Security: Blocked hosts for preventing SSRF attacks
BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '::1']
INTERNAL_IP_PREFIXES = ['192.168.', '10.', '172.16.', '127.']


def _validate_url(url: str) -> ParseResult:
    """
    Validate URL format and security constraints.

    Args:
        url: The URL to validate

    Returns:
        Parsed URL object

    Raises:
        ValueError: If URL is invalid or points to blocked/internal address
    """
    parsed_url = urlparse(url)

    # Check for valid scheme
    if parsed_url.scheme not in ['http', 'https']:
        raise ValueError(f"Invalid URL format: must use HTTP or HTTPS, got '{parsed_url.scheme}'")

    # Check for valid netloc (domain)
    if not parsed_url.netloc:
        raise ValueError("Invalid URL format: missing domain")

    # Security: Block localhost
    if parsed_url.netloc.lower() in BLOCKED_HOSTS or \
       parsed_url.netloc.lower().startswith('localhost:'):
        raise ValueError("Invalid URL: localhost and internal addresses are blocked for security")

    # Security: Block internal IP ranges
    hostname = parsed_url.hostname or parsed_url.netloc
    if any(hostname.startswith(prefix) for prefix in INTERNAL_IP_PREFIXES):
        raise ValueError("Invalid URL: internal IP addresses are blocked for security")

    logger.debug(f"URL validation passed for: {parsed_url.netloc}")
    return parsed_url


def _extract_source_name(parsed_url: ParseResult) -> str:
    """
    Extract friendly source name from domain.

    Args:
        parsed_url: Parsed URL object

    Returns:
        Friendly source name (e.g., "Allrecipes" from "www.allrecipes.com")

    Examples:
        >>> from urllib.parse import urlparse
        >>> _extract_source_name(urlparse("https://www.allrecipes.com/recipe/123"))
        'Allrecipes'
    """
    domain = parsed_url.netloc.replace('www.', '').split(':')[0]  # Remove www. and port
    source_name = domain.split('.')[0].title()  # Get first part and capitalize
    return source_name


async def fetch_html_from_url(url: str, timeout: int = 10) -> Tuple[str, str]:
    """
    Fetch HTML content from a URL and extract source name.

    Args:
        url: The URL to fetch (must be HTTP or HTTPS)
        timeout: Request timeout in seconds (default: 10)

    Returns:
        Tuple of (html_content, source_name)
        - html_content: Raw HTML as string
        - source_name: Friendly source name (e.g., "Allrecipes" from "www.allrecipes.com")

    Raises:
        ValueError: If URL format is invalid or points to localhost/internal IP
        httpx.HTTPStatusError: If HTTP request fails (404, 403, 500, etc.)
        httpx.TimeoutException: If request times out

    Examples:
        >>> html, source = await fetch_html_from_url("https://www.allrecipes.com/recipe/123")
        >>> source
        'Allrecipes'
    """
    # Validate URL
    parsed_url = _validate_url(url)

    # Extract source name
    source_name = _extract_source_name(parsed_url)

    # Set up browser-like headers to avoid bot blocking
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
    }

    try:
        # Fetch HTML with httpx
        async with httpx.AsyncClient(
            timeout=timeout,
            follow_redirects=True,  # Follow up to 20 redirects by default
            headers=headers
        ) as client:
            logger.info(f"Fetching recipe from URL: {url}")
            response = await client.get(url)

            # Raise exception for HTTP errors (404, 403, 500, etc.)
            response.raise_for_status()

            html_content = response.text
            logger.info(f"Successfully fetched {len(html_content)} characters from {source_name}")

            return html_content, source_name

    except httpx.TimeoutException as e:
        logger.error(f"Timeout fetching URL {url}: {e}")
        raise

    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error fetching URL {url}: {e.response.status_code}")
        raise

    except httpx.RequestError as e:
        logger.error(f"Request error fetching URL {url}: {e}")
        raise

    except Exception as e:
        logger.error(f"Unexpected error fetching URL {url}: {e}")
        raise


async def fetch_recipe_html(url: str, timeout: int = 10) -> FetchResult:
    """
    Fetch recipe HTML, automatically detecting and using print-friendly versions.

    This wrapper function:
    1. Cleans tracking params from the URL
    2. Fetches the initial HTML
    3. Searches for print recipe links (e.g., ?print_recipe=true)
    4. If found, fetches the print version for cleaner parsing

    The print version typically has:
    - No ads, comments, or navigation
    - Clean structured recipe data (via plugins like WPRM)
    - Better signal-to-noise ratio for AI parsing

    Args:
        url: Recipe URL to fetch
        timeout: Request timeout in seconds (default: 10)

    Returns:
        FetchResult with:
        - html_content: The HTML (from print version if available)
        - source_name: Friendly domain name
        - used_print_version: True if print URL was used
        - fetched_url: The actual URL that was fetched

    Raises:
        ValueError: If URL format is invalid or points to blocked address
        httpx.HTTPStatusError: If HTTP request fails
        httpx.TimeoutException: If request times out

    Examples:
        >>> result = await fetch_recipe_html("https://example.com/recipe?utm_source=ig")
        >>> result.used_print_version
        True
        >>> result.fetched_url
        'https://example.com/recipe?print_recipe=true'
    """
    # Clean tracking params from input URL
    cleaned_url = clean_tracking_params(url)
    logger.info(f"Fetching recipe from URL: {cleaned_url}")

    # Fetch initial HTML
    html_content, source_name = await fetch_html_from_url(cleaned_url, timeout)

    # Search for print recipe URL
    print_url = find_print_recipe_url(html_content, cleaned_url)

    if print_url:
        logger.info(f"Found print recipe URL: {print_url}")
        try:
            # Fetch the print version
            print_html, _ = await fetch_html_from_url(print_url, timeout)
            logger.info(f"Successfully fetched print version ({len(print_html)} chars)")
            return FetchResult(
                html_content=print_html,
                source_name=source_name,
                used_print_version=True,
                fetched_url=print_url
            )
        except Exception as e:
            # Fall back to original HTML on any print-fetch error
            logger.warning(f"Failed to fetch print URL, using original: {e}")
            return FetchResult(
                html_content=html_content,
                source_name=source_name,
                used_print_version=False,
                fetched_url=cleaned_url
            )
    else:
        # No print URL found, return original
        return FetchResult(
            html_content=html_content,
            source_name=source_name,
            used_print_version=False,
            fetched_url=cleaned_url
        )
