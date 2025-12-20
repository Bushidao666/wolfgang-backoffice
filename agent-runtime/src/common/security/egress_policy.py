from __future__ import annotations

import asyncio
import ipaddress
import os
import socket
from dataclasses import dataclass
from typing import Iterable
from urllib.parse import urlparse


class EgressPolicyError(ValueError):
    pass


def _host_in_allowlist(hostname: str, allowlist: Iterable[str]) -> bool:
    host = hostname.lower().strip(".")
    for entry in allowlist:
        entry = entry.lower().strip()
        if not entry:
            continue
        entry = entry.strip(".")
        if host == entry:
            return True
        if host.endswith("." + entry):
            return True
    return False


def _is_blocked_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    return bool(
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_unspecified
        or ip.is_reserved
    )


@dataclass(frozen=True)
class EgressPolicy:
    """
    Minimal SSRF guard + allowlist for outbound HTTP requests.

    If `allowlist` is empty, any public IP/domain is allowed. When set, only domains in the allowlist
    (or their subdomains) are allowed.
    """

    allowlist: tuple[str, ...] = ()
    block_private_networks: bool = True
    resolve_timeout_s: float = 1.5

    @classmethod
    def from_env(cls, env: dict[str, str] | None = None) -> "EgressPolicy":
        e = env or os.environ
        raw = (e.get("EGRESS_ALLOWLIST") or "").strip()
        allowlist = tuple([x.strip() for x in raw.split(",") if x.strip()])
        return cls(allowlist=allowlist)

    async def assert_url_allowed(self, url: str) -> None:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            raise EgressPolicyError("Only http/https URLs are allowed")
        if parsed.username or parsed.password:
            raise EgressPolicyError("Credentials in URL are not allowed")

        hostname = (parsed.hostname or "").strip()
        if not hostname:
            raise EgressPolicyError("Missing hostname")

        if self.allowlist and not _host_in_allowlist(hostname, self.allowlist):
            raise EgressPolicyError(f"Hostname not in allowlist: {hostname}")

        if not self.block_private_networks:
            return

        # If host is an IP literal, validate directly.
        try:
            ip = ipaddress.ip_address(hostname)
            if _is_blocked_ip(ip):
                raise EgressPolicyError("Blocked IP range")
            return
        except ValueError:
            pass

        # Resolve DNS and reject private IPs.
        try:
            infos = await asyncio.wait_for(
                asyncio.to_thread(socket.getaddrinfo, hostname, parsed.port or 443, type=socket.SOCK_STREAM),
                timeout=self.resolve_timeout_s,
            )
        except TimeoutError as err:
            raise EgressPolicyError("DNS resolution timed out") from err
        except Exception as err:
            raise EgressPolicyError("DNS resolution failed") from err

        for family, _socktype, _proto, _canonname, sockaddr in infos:
            if family == socket.AF_INET:
                ip_str = sockaddr[0]
            elif family == socket.AF_INET6:
                ip_str = sockaddr[0]
            else:
                continue

            try:
                ip = ipaddress.ip_address(ip_str)
            except ValueError:
                continue
            if _is_blocked_ip(ip):
                raise EgressPolicyError("Hostname resolves to blocked IP range")

