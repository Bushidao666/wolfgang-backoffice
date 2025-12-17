FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

FROM base AS deps

RUN python -m pip install --no-cache-dir poetry==1.8.5

WORKDIR /app/agent-runtime
COPY agent-runtime/pyproject.toml agent-runtime/pyproject.toml
COPY agent-runtime/poetry.lock agent-runtime/poetry.lock
COPY agent-runtime/README.md agent-runtime/README.md
RUN poetry config virtualenvs.create false && poetry install --only main --no-interaction --no-ansi

FROM base AS runner

WORKDIR /app/agent-runtime
COPY --from=deps /usr/local /usr/local
COPY agent-runtime/src /app/agent-runtime/src

EXPOSE 5000
CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-5000}"]
