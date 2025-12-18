import { apiFetch } from "@/lib/api/client";
import { resolveEvolutionManagerUrl } from "@/lib/runtime-config";

export type ChannelType = "whatsapp" | "instagram" | "telegram";
export type InstanceState = "connected" | "disconnected" | "qr_ready" | "error";

export type ChannelInstance = {
  id: string;
  company_id: string;
  channel_type: ChannelType;
  instance_name: string;
  state: InstanceState;
  phone_number?: string | null;
  profile_name?: string | null;
  last_connected_at?: string | null;
  last_disconnected_at?: string | null;
  error_message?: string | null;
};

export async function listInstances(companyId: string) {
  const baseUrl = await resolveEvolutionManagerUrl();
  return apiFetch<ChannelInstance[]>(`/instances?company_id=${encodeURIComponent(companyId)}`, {
    baseUrl,
  });
}

export async function createInstance(input: {
  company_id: string;
  instance_name: string;
  channel_type?: ChannelType;
  telegram_bot_token?: string;
  instagram_account_id?: string;
}) {
  const baseUrl = await resolveEvolutionManagerUrl();
  return apiFetch<ChannelInstance>("/instances", {
    method: "POST",
    body: JSON.stringify({ ...input, channel_type: input.channel_type ?? "whatsapp" }),
    baseUrl,
  });
}

export async function refreshInstanceStatus(instanceId: string) {
  const baseUrl = await resolveEvolutionManagerUrl();
  return apiFetch<ChannelInstance>(`/instances/${encodeURIComponent(instanceId)}/status`, {
    baseUrl,
  });
}

export async function connectInstance(instanceId: string) {
  const baseUrl = await resolveEvolutionManagerUrl();
  return apiFetch<{ qrcode: string | null }>(`/instances/${encodeURIComponent(instanceId)}/connect`, {
    method: "POST",
    baseUrl,
  });
}

export async function disconnectInstance(instanceId: string) {
  const baseUrl = await resolveEvolutionManagerUrl();
  return apiFetch<void>(`/instances/${encodeURIComponent(instanceId)}/disconnect`, {
    method: "POST",
    baseUrl,
  });
}

export async function getInstanceQrCode(instanceId: string) {
  const baseUrl = await resolveEvolutionManagerUrl();
  return apiFetch<{ qrcode: string | null }>(`/instances/${encodeURIComponent(instanceId)}/qrcode`, {
    baseUrl,
  });
}

export async function sendInstanceTestMessage(instanceId: string, input: { to: string; text: string }) {
  const baseUrl = await resolveEvolutionManagerUrl();
  return apiFetch<{ ok: true }>(`/instances/${encodeURIComponent(instanceId)}/test`, {
    method: "POST",
    body: JSON.stringify(input),
    baseUrl,
  });
}

export async function deleteInstance(instanceId: string) {
  const baseUrl = await resolveEvolutionManagerUrl();
  return apiFetch<void>(`/instances/${encodeURIComponent(instanceId)}`, {
    method: "DELETE",
    baseUrl,
  });
}
