# Sierra Estates — Python FastAPI service for Cloud Run
# Multi-stage build for lean production image

# ── Stage 1: Builder ──────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app
RUN pip install --no-cache-dir uv

COPY requirements.txt .
RUN uv pip install --system --no-cache -r requirements.txt

# ── Stage 2: Runtime ──────────────────────────────────────
FROM python:3.12-slim AS runtime

WORKDIR /app

# Non-root user for Cloud Run security
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy source (exclude tests and cache)
COPY main.py ecc_memory_engine.py property_finder_sync.py valuation_agent_skill.py ./

USER appuser

EXPOSE 8000

ENV PORT=8000
ENV LOG_LEVEL=INFO
ENV PYTHONUNBUFFERED=1

# Graceful startup with keep-alive for Cloud Run
CMD ["uvicorn", "main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "2", \
     "--timeout-keep-alive", "75"]
