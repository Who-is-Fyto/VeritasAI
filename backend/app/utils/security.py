"""
Cybersecurity utilities for VeritasAI.
Provides SSRF (Server-Side Request Forgery) protection, text input sanitisation,
and response size limiting helpers.
"""
import socket
import ipaddress
import html
import logging
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


def is_safe_url(url: str) -> bool:
    """
    Validates a URL to prevent Server-Side Request Forgery (SSRF)
    and protocol tricks (e.g. file://, gopher://).
    Allows only public, non-local IPv4 and IPv6 addresses on standard ports (80/443).
    """
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            logger.warning("Unsafe URL scheme blocked: %s", parsed.scheme)
            return False

        hostname = parsed.hostname
        if not hostname:
            logger.warning("Invalid URL hostname (empty)")
            return False

        # Reject loopback and local names directly
        hostname_lower = hostname.lower().strip()
        if hostname_lower in ("localhost", "localhost.localdomain", "loopback", "127.0.0.1", "::1"):
            logger.warning("Local loopback domain blocked: %s", hostname)
            return False

        # Resolve hostname to all associated IPs (IPv4 and IPv6)
        try:
            addrinfo = socket.getaddrinfo(hostname, None)
        except socket.gaierror as e:
            logger.debug("Hostname resolution failed for %s: %s", hostname, e)
            return False

        for family, _, _, _, sockaddr in addrinfo:
            ip_str = sockaddr[0]
            try:
                ip = ipaddress.ip_address(ip_str)
            except ValueError:
                continue

            # Block loopback, private IP ranges, link-local, multicast, reserved
            if (
                ip.is_private or
                ip.is_loopback or
                ip.is_link_local or
                ip.is_multicast or
                ip.is_reserved or
                ip.is_unspecified
            ):
                logger.warning("Unsafe IP range blocked: %s (resolved from %s)", ip_str, hostname)
                return False

        # Enforce standard ports
        if parsed.port and parsed.port not in (80, 443):
            logger.warning("Non-standard port blocked: %d", parsed.port)
            return False

        return True
    except Exception as e:
        logger.error("Error validating URL %s: %s", url, e)
        return False


def sanitize_text(text: str) -> str:
    """
    Sanitises text inputs by stripping non-printable control characters
    and escaping HTML tags to prevent XSS (Cross-Site Scripting).
    """
    if not text:
        return ""
    # Strip dangerous non-printable control chars, keeping newline, carriage return, and tab
    clean_chars = [ch for ch in text if ch.isprintable() or ch in ("\n", "\r", "\t")]
    clean_text = "".join(clean_chars)
    # HTML escape any characters with special meaning in HTML templates
    return html.escape(clean_text)
