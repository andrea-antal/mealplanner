"""URL fetching service for recipe import"""
import httpx
import logging
from urllib.parse import urlparse, ParseResult
from typing import Tuple

logger = logging.getLogger(__name__)

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
