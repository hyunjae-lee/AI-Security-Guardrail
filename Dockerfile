FROM python:3.12-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    GUARDRAIL_PORT=8088

WORKDIR /app

# Dependencies first for layer caching.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY attacks ./attacks

# Non-root runtime user; data dir for the SQLite audit log.
RUN useradd --create-home --uid 10001 guardrail \
    && mkdir -p /app/data \
    && chown -R guardrail:guardrail /app
USER guardrail

EXPOSE 8088

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8088/healthz').status==200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8088"]
