import { apiFetch } from "@/lib/api/client";

function getEvolutionManagerUrl() {
  return process.env.NEXT_PUBLIC_EVOLUTION_MANAGER_URL ?? "http://localhost:4001";
}

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
  return apiFetch<ChannelInstance[]>(`/instances?company_id=${encodeURIComponent(companyId)}`, {
    baseUrl: getEvolutionManagerUrl(),
  });
}

export async function createInstance(input: {
  company_id: string;
  instance_name: string;
  channel_type?: ChannelType;
  telegram_bot_token?: string;
  instagram_account_id?: string;
}) {
  return apiFetch<ChannelInstance>("/instances", {
    method: "POST",
    body: JSON.stringify({ ...input, channel_type: input.channel_type ?? "whatsapp" }),
    baseUrl: getEvolutionManagerUrl(),
  });
}

export async function refreshInstanceStatus(instanceId: string) {
  return apiFetch<ChannelInstance>(`/instances/${encodeURIComponent(instanceId)}/status`, {
    baseUrl: getEvolutionManagerUrl(),
  });
}

export async function connectInstance(instanceId: string) {
  return apiFetch<{ qrcode: string | null }>(`/instances/${encodeURIComponent(instanceId)}/connect`, {
    method: "POST",
    baseUrl: getEvolutionManagerUrl(),
  });
}

export async function disconnectInstance(instanceId: string) {
  return apiFetch<void>(`/instances/${encodeURIComponent(instanceId)}/disconnect`, {
    method: "POST",
    baseUrl: getEvolutionManagerUrl(),
  });
}

export async function getInstanceQrCode(instanceId: string) {
  return apiFetch<{ qrcode: string | null }>(`/instances/${encodeURIComponent(instanceId)}/qrcode`, {
    baseUrl: getEvolutionManagerUrl(),
  });
}

export async function sendInstanceTestMessage(instanceId: string, input: { to: string; text: string }) {
  return apiFetch<{ ok: true }>(`/instances/${encodeURIComponent(instanceId)}/test`, {
    method: "POST",
    body: JSON.stringify(input),
    baseUrl: getEvolutionManagerUrl(),
  });
}

export async function deleteInstance(instanceId: string) {
  return apiFetch<void>(`/instances/${encodeURIComponent(instanceId)}`, {
    method: "DELETE",
    baseUrl: getEvolutionManagerUrl(),
  });
}
