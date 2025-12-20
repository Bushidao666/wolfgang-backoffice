import { apiFetch } from "@/lib/api/client";

export type MediaAssetRow = {
  id: string;
  company_id: string;
  centurion_id: string | null;
  name: string;
  description: string | null;
  media_type: "audio" | "image" | "video" | "document";
  mime_type: string;
  bucket: string;
  file_path: string;
  file_size_bytes: number | null;
  tags: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export async function listMediaAssets(companyId: string, params: { centurion_id?: string } = {}) {
  const qs = new URLSearchParams();
  if (params.centurion_id) qs.set("centurion_id", params.centurion_id);
  const query = qs.toString();
  return apiFetch<MediaAssetRow[]>(`/media/assets${query ? `?${query}` : ""}`, { headers: { "x-company-id": companyId } });
}

export async function createMediaAsset(
  companyId: string,
  payload: { name: string; description?: string; tags?: string; centurion_id?: string; media_type?: string; is_active?: boolean },
  file: File,
) {
  const form = new FormData();
  form.append("name", payload.name);
  if (payload.description) form.append("description", payload.description);
  if (payload.tags) form.append("tags", payload.tags);
  if (payload.centurion_id) form.append("centurion_id", payload.centurion_id);
  if (payload.media_type) form.append("media_type", payload.media_type);
  if (payload.is_active !== undefined) form.append("is_active", String(payload.is_active));
  form.append("file", file);

  return apiFetch<MediaAssetRow>("/media/assets", {
    method: "POST",
    headers: { "x-company-id": companyId },
    body: form,
  });
}

export async function updateMediaAsset(
  companyId: string,
  assetId: string,
  payload: { name?: string; description?: string; tags?: string; centurion_id?: string; media_type?: string; is_active?: boolean },
  file?: File,
) {
  const form = new FormData();
  if (payload.name !== undefined) form.append("name", payload.name);
  if (payload.description !== undefined) form.append("description", payload.description);
  if (payload.tags !== undefined) form.append("tags", payload.tags);
  if (payload.centurion_id !== undefined) form.append("centurion_id", payload.centurion_id);
  if (payload.media_type !== undefined) form.append("media_type", payload.media_type);
  if (payload.is_active !== undefined) form.append("is_active", String(payload.is_active));
  if (file) form.append("file", file);

  return apiFetch<MediaAssetRow>(`/media/assets/${encodeURIComponent(assetId)}`, {
    method: "PUT",
    headers: { "x-company-id": companyId },
    body: form,
  });
}

export async function deleteMediaAsset(companyId: string, assetId: string) {
  return apiFetch<void>(`/media/assets/${encodeURIComponent(assetId)}`, { method: "DELETE", headers: { "x-company-id": companyId } });
}

export async function getMediaAssetSignedUrl(companyId: string, assetId: string) {
  return apiFetch<{ url: string }>(`/media/assets/${encodeURIComponent(assetId)}/signed-url`, { headers: { "x-company-id": companyId } });
}

