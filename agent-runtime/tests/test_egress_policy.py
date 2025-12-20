import pytest

from common.security.egress_policy import EgressPolicy, EgressPolicyError


@pytest.mark.asyncio
async def test_egress_policy_rejects_non_http_schemes_and_credentials():
    policy = EgressPolicy(block_private_networks=False)
    with pytest.raises(EgressPolicyError):
        await policy.assert_url_allowed("ftp://example.com/x")
    with pytest.raises(EgressPolicyError):
        await policy.assert_url_allowed("https://user:pass@example.com/x")


@pytest.mark.asyncio
async def test_egress_policy_blocks_private_ip_literals():
    policy = EgressPolicy()
    with pytest.raises(EgressPolicyError):
        await policy.assert_url_allowed("http://127.0.0.1/x")


@pytest.mark.asyncio
async def test_egress_policy_allows_public_ip_literals():
    policy = EgressPolicy()
    await policy.assert_url_allowed("https://93.184.216.34/x")


@pytest.mark.asyncio
async def test_egress_policy_respects_allowlist_without_dns_resolution():
    policy = EgressPolicy(allowlist=("example.test",), block_private_networks=False)
    await policy.assert_url_allowed("https://api.example.test/tool")
    with pytest.raises(EgressPolicyError):
        await policy.assert_url_allowed("https://api.evil.test/tool")

