from __future__ import annotations

from prometheus_client import Counter, Histogram

HTTP_REQUESTS_TOTAL = Counter(
    "http_requests_total",
    "Total de requests HTTP",
    ["method", "path", "status_code"],
)

HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "http_request_duration_seconds",
    "Duração dos requests HTTP em segundos",
    ["method", "path", "status_code"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)

DOMAIN_EVENTS_TOTAL = Counter(
    "domain_events_total",
    "Total de eventos de domínio publicados",
    ["type"],
)

MESSAGES_TOTAL = Counter(
    "messages_total",
    "Total de mensagens processadas/enviadas",
    ["direction", "channel_type", "content_type"],
)

LEADS_CREATED_TOTAL = Counter(
    "leads_created_total",
    "Total de leads criados",
    ["channel_type"],
)

LEADS_QUALIFIED_TOTAL = Counter(
    "leads_qualified_total",
    "Total de leads qualificados",
    [],
)

