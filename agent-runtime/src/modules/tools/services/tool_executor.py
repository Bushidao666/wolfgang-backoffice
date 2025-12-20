from __future__ import annotations

import base64
import json
import logging
from dataclasses import dataclass
from typing import Any

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential_jitter

from common.security.egress_policy import EgressPolicy, EgressPolicyError
from common.security.payload_limits import PayloadLimits
from modules.tools.domain.tool import ToolConfig
from modules.tools.services.schema_validator import SchemaValidationError, SchemaValidator

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ToolResult:
    ok: bool
    status_code: int
    body: Any
    headers: dict[str, str]


class ToolExecutionError(RuntimeError):
    def __init__(self, message: str, *, details: dict[str, Any] | None = None):
        super().__init__(message)
        self.details = details or {}


class ToolExecutor:
    def __init__(
        self,
        *,
        validator: SchemaValidator | None = None,
        egress_policy: EgressPolicy | None = None,
        payload_limits: PayloadLimits | None = None,
    ):
        self._validator = validator or SchemaValidator()
        self._egress = egress_policy or EgressPolicy.from_env()
        self._limits = payload_limits or PayloadLimits.from_env()

    async def execute_http(self, tool: ToolConfig, params: dict[str, Any]) -> ToolResult:
        # SSRF + allowlist guard (centralized, applies to all HTTP tools).
        try:
            await self._egress.assert_url_allowed(tool.endpoint)
        except EgressPolicyError as err:
            raise ToolExecutionError("Blocked by egress policy", details={"endpoint": tool.endpoint, "error": str(err)}) from err

        # Bound request payloads (prevents oversized HTTP bodies).
        try:
            self._limits.ensure_tool_args(params, tool_name=tool.tool_name)
        except Exception as err:
            raise ToolExecutionError("Tool input too large", details={"error": str(err)}) from err

        if tool.input_schema:
            self._validator.validate_instance(tool.input_schema, params, label="tool input")

        headers = self._build_headers(tool, params=params)
        timeout = httpx.Timeout(tool.timeout_ms / 1000.0)

        method = (tool.method or "POST").upper()
        if method not in ("GET", "POST", "PUT", "PATCH", "DELETE"):
            raise ToolExecutionError("Unsupported HTTP method", details={"method": method})

        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            response = await self._request_with_retry(client, method, tool.endpoint, headers=headers, params=params)

        body: Any = None
        content_type = (response.headers.get("content-type") or "").split(";")[0].strip().lower()
        if content_type == "application/json":
            try:
                body = response.json()
            except Exception:
                body = response.text
        else:
            body = response.text

        ok = response.status_code < 400

        if ok and tool.output_schema and isinstance(body, (dict, list)):
            try:
                self._validator.validate_instance(tool.output_schema, body, label="tool output")
            except SchemaValidationError as err:
                raise ToolExecutionError(
                    "Tool output does not match schema",
                    details={"errors": err.errors[:10]},
                ) from err

        # Keep responses bounded for downstream memory/logging.
        safe_body = self._limits.truncate_tool_result(body)
        return ToolResult(ok=ok, status_code=response.status_code, body=safe_body, headers=dict(response.headers))

    @retry(
        reraise=True,
        stop=stop_after_attempt(3),
        wait=wait_exponential_jitter(initial=0.2, max=2.0),
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.TransportError)),
    )
    async def _request_with_retry(
        self,
        client: httpx.AsyncClient,
        method: str,
        url: str,
        *,
        headers: dict[str, str],
        params: dict[str, Any],
    ) -> httpx.Response:
        try:
            if method == "GET":
                return await client.request(method, url, headers=headers, params=params)
            return await client.request(method, url, headers=headers, json=params)
        except Exception:
            logger.exception("tool.http_request_failed", extra={"url": url, "method": method})
            raise

    def _build_headers(self, tool: ToolConfig, *, params: dict[str, Any]) -> dict[str, str]:
        headers: dict[str, str] = {}
        raw_headers = tool.headers or {}
        for k, v in raw_headers.items():
            if v is None:
                continue
            headers[str(k)] = str(v)

        auth_type = (tool.auth_type or "").strip().lower()
        auth_config = tool.auth_config or {}

        if auth_type in ("", "none"):
            return headers

        if auth_type == "bearer":
            token = str(auth_config.get("token") or "").strip()
            if not token:
                raise ToolExecutionError("Missing bearer token for tool auth")
            headers["Authorization"] = f"Bearer {token}"
            return headers

        if auth_type == "api_key":
            header_name = str(auth_config.get("header_name") or "x-api-key")
            key = str(auth_config.get("key") or "").strip()
            if not key:
                raise ToolExecutionError("Missing api_key for tool auth")
            headers[header_name] = key
            return headers

        if auth_type == "basic":
            username = str(auth_config.get("username") or "")
            password = str(auth_config.get("password") or "")
            token = base64.b64encode(f"{username}:{password}".encode("utf-8")).decode("ascii")
            headers["Authorization"] = f"Basic {token}"
            return headers

        raise ToolExecutionError("Unsupported auth_type for tool", details={"auth_type": auth_type})
