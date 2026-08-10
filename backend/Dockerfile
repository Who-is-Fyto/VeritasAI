# ── VeritasAI Backend Dockerfile ──────────────────────────────────────────
# Multi-stage build: "builder" installs deps, "runtime" is the slim image.

# Stage 1: builder
FROM python:3.11-slim AS builder
WORKDIR /app

# Install build deps for packages that compile C extensions (e.g. lxml)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc libxml2-dev libxslt1-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: runtime
FROM python:3.11-slim AS runtime
WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 veritas
USER veritas

EXPOSE 8000

# Uvicorn with 2 workers — increase for production
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
