import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from "@nestjs/common";

import { RedisService } from "../../../infrastructure/redis/redis.service";
import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";
import { decryptV1, encryptV1 } from "@wolfgang/crypto";
import { ChannelType, CreateInstanceDto } from "../dto/create-instance.dto";
import type { ChannelInstanceState } from "../dto/instance-response.dto";
import type { InstanceResponseDto } from "../dto/instance-response.dto";
import { InstagramService } from "../channels/instagram.service";
import { TelegramService } from "../channels/telegram.service";
import { EvolutionApiService } from "./evolution-api.service";

type DbChannelInstanceRow = {
  id: string;
  company_id: string;
  channel_type: ChannelType;
  instance_name: string;
  state: ChannelInstanceState;
  phone_number: string | null;
  profile_name: string | null;
  last_connected_at: string | null;
  last_disconnected_at: string | null;
  error_message: string | null;
  telegram_bot_token: string | null;
  telegram_bot_token_enc: string | null;
  instagram_account_id?: string | null;
};

type DbChannelInstanceWithSecrets = DbChannelInstanceRow & { telegram_bot_token_resolved: string | null };

function mapState(state: string): ChannelInstanceState {
  const normalized = state.toLowerCase();
  if (["open", "connected", "online"].includes(normalized)) return "connected";
  if (["close", "closed", "disconnected", "offline"].includes(normalized)) return "disconnected";
  if (["qr", "qrcode", "connecting", "qr_ready"].includes(normalized)) return "qr_ready";
  if (["error", "failed"].includes(normalized)) return "error";
  return "disconnected";
}

@Injectable()
export class InstancesService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly evolution: EvolutionApiService,
    private readonly telegram: TelegramService,
    private readonly instagram: InstagramService,
    private readonly redis: RedisService,
  ) {}

  private get admin() {
    return this.supabase.getAdminClient();
  }

  async list(companyId: string): Promise<InstanceResponseDto[]> {
    const { data, error } = await this.admin
      .schema("core")
      .from("channel_instances")
      .select("id, company_id, channel_type, instance_name, state, phone_number, profile_name, last_connected_at, last_disconnected_at, error_message")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return ((data ?? []) as unknown as DbChannelInstanceRow[]).map((row) => this.toResponse(row));
  }

  async getById(instanceId: string): Promise<InstanceResponseDto> {
    const { data, error } = await this.admin
      .schema("core")
      .from("channel_instances")
      .select("id, company_id, channel_type, instance_name, state, phone_number, profile_name, last_connected_at, last_disconnected_at, error_message")
      .eq("id", instanceId)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException("Instance not found");
    return this.toResponse(data as unknown as DbChannelInstanceRow);
  }

  async getByName(instanceName: string): Promise<Pick<DbChannelInstanceRow, "id" | "company_id" | "channel_type" | "instance_name"> | null> {
    const { data, error } = await this.admin
      .schema("core")
      .from("channel_instances")
      .select("id, company_id, channel_type, instance_name")
      .eq("instance_name", instanceName)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    return (data ?? null) as Pick<DbChannelInstanceRow, "id" | "company_id" | "channel_type" | "instance_name"> | null;
  }

  async getByIdWithSecrets(instanceId: string): Promise<DbChannelInstanceWithSecrets> {
    const { data, error } = await this.admin
      .schema("core")
      .from("channel_instances")
      .select("id, company_id, channel_type, instance_name, state, phone_number, profile_name, last_connected_at, last_disconnected_at, error_message, telegram_bot_token, telegram_bot_token_enc, instagram_account_id")
      .eq("id", instanceId)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException("Instance not found");

    const row = data as unknown as DbChannelInstanceRow;
    return { ...row, telegram_bot_token_resolved: this.resolveTelegramToken(row) };
  }

  async create(dto: CreateInstanceDto): Promise<InstanceResponseDto> {
    if (dto.channel_type === ChannelType.Telegram && !dto.telegram_bot_token) {
      throw new BadRequestException("telegram_bot_token is required for Telegram instances");
    }

    if (dto.channel_type === ChannelType.Whatsapp) {
      await this.evolution.createInstance(dto.company_id, dto.instance_name);
    } else if (dto.channel_type === ChannelType.Instagram) {
      await this.instagram.createInstance(dto.company_id, dto.instance_name);
    }

    const telegramBotTokenEnc =
      dto.channel_type === ChannelType.Telegram && dto.telegram_bot_token
        ? this.encryptTelegramToken(dto.telegram_bot_token)
        : null;

    const payload: Record<string, unknown> = {
      company_id: dto.company_id,
      channel_type: dto.channel_type,
      instance_name: dto.instance_name,
      state: "disconnected",
      telegram_bot_token: null,
      telegram_bot_token_enc: telegramBotTokenEnc,
      instagram_account_id: dto.instagram_account_id ?? null,
    };

    const { data, error } = await this.admin
      .schema("core")
      .from("channel_instances")
      .insert(payload)
      .select("id, company_id, channel_type, instance_name, state, phone_number, profile_name, last_connected_at, last_disconnected_at, error_message")
      .single();
    if (error) throw new BadRequestException(error.message);
    return this.toResponse(data as unknown as DbChannelInstanceRow);
  }

  async delete(instanceId: string): Promise<void> {
    const instance = await this.getByIdWithSecrets(instanceId);
    if (instance.channel_type === ChannelType.Whatsapp) {
      await this.evolution.deleteInstance(instance.company_id, instance.instance_name);
    } else if (instance.channel_type === ChannelType.Instagram) {
      await this.instagram.deleteInstance(instance.company_id, instance.instance_name);
    } else if (instance.channel_type === ChannelType.Telegram && instance.telegram_bot_token_resolved) {
      await this.telegram.deleteWebhook(instance.telegram_bot_token_resolved);
    }

    const { error } = await this.admin.schema("core").from("channel_instances").delete().eq("id", instanceId);
    if (error) throw new BadRequestException(error.message);
    await this.redis.del(this.qrKey(instanceId));
  }

  async connect(instanceId: string): Promise<{ qrcode: string | null }> {
    const instance = await this.getByIdWithSecrets(instanceId);
    if (instance.channel_type === ChannelType.Telegram) {
      if (!instance.telegram_bot_token_resolved) throw new BadRequestException("telegram_bot_token is missing for instance");
      await this.telegram.setWebhook(instance.telegram_bot_token_resolved, instance.id);
      await this.updateState(instanceId, "connected", { provider: "telegram", webhook_configured: true });
      return { qrcode: null };
    }

    const { qrcode } =
      instance.channel_type === ChannelType.Instagram
        ? await this.instagram.connect(instance.company_id, instance.instance_name)
        : await this.evolution.connect(instance.company_id, instance.instance_name);
    if (qrcode) {
      await this.cacheQrCode(instanceId, qrcode);
    }

    await this.updateState(instanceId, qrcode ? "qr_ready" : "connected", {
      qrcode_present: !!qrcode,
      provider: instance.channel_type === ChannelType.Instagram ? "instagram" : "whatsapp",
    });
    return { qrcode };
  }

  async disconnect(instanceId: string): Promise<void> {
    const instance = await this.getByIdWithSecrets(instanceId);
    if (instance.channel_type === ChannelType.Telegram) {
      if (!instance.telegram_bot_token_resolved) throw new BadRequestException("telegram_bot_token is missing for instance");
      await this.telegram.deleteWebhook(instance.telegram_bot_token_resolved);
      await this.updateState(instanceId, "disconnected", { provider: "telegram", webhook_configured: false });
      return;
    }

    if (instance.channel_type === ChannelType.Instagram) {
      await this.instagram.disconnect(instance.company_id, instance.instance_name);
    } else {
      await this.evolution.disconnect(instance.company_id, instance.instance_name);
    }
    await this.updateState(instanceId, "disconnected");
  }

  async getQrCode(instanceId: string): Promise<string | null> {
    const cached = await this.redis.get(this.qrKey(instanceId));
    if (cached) return cached;

    const instance = await this.getByIdWithSecrets(instanceId);
    if (![ChannelType.Whatsapp, ChannelType.Instagram].includes(instance.channel_type)) return null;

    const { qrcode } =
      instance.channel_type === ChannelType.Instagram
        ? await this.instagram.getQrCode(instance.company_id, instance.instance_name)
        : await this.evolution.getQrCode(instance.company_id, instance.instance_name);
    if (qrcode) {
      await this.cacheQrCode(instanceId, qrcode);
      await this.updateState(instanceId, "qr_ready", { qrcode_present: true });
    }
    return qrcode;
  }

  async refreshStatus(instanceId: string): Promise<InstanceResponseDto> {
    const instance = await this.getByIdWithSecrets(instanceId);
    if (instance.channel_type === ChannelType.Telegram) {
      if (!instance.telegram_bot_token_resolved) return this.getById(instanceId);
      const info = await this.telegram.getWebhookInfo(instance.telegram_bot_token_resolved);
      const state = info.url ? "connected" : "disconnected";
      await this.updateState(instanceId, state, { provider: "telegram", webhook_url: info.url, pending_update_count: info.pending_update_count });
      return this.getById(instanceId);
    }

    const status =
      instance.channel_type === ChannelType.Instagram
        ? await this.instagram.getStatus(instance.company_id, instance.instance_name)
        : await this.evolution.getStatus(instance.company_id, instance.instance_name);
    const mapped = mapState(status.state);

    await this.updateState(instanceId, mapped, { provider_state: status.state, provider: status.raw });
    return this.getById(instanceId);
  }

  async sendTestMessage(instanceId: string, to: string, text: string): Promise<void> {
    const instance = await this.getByIdWithSecrets(instanceId);

    if (instance.channel_type === ChannelType.Whatsapp) {
      await this.evolution.sendText(instance.company_id, instance.instance_name, to, text);
      return;
    }

    if (instance.channel_type === ChannelType.Telegram) {
      if (!instance.telegram_bot_token_resolved) throw new BadRequestException("telegram_bot_token is missing for instance");
      await this.telegram.sendText(instance.telegram_bot_token_resolved, to, text);
      return;
    }

    if (instance.channel_type === ChannelType.Instagram) {
      await this.instagram.sendText(instance.company_id, instance.instance_name, to, text);
    }
  }

  private qrKey(instanceId: string) {
    return `channel:${instanceId}:qrcode`;
  }

  async cacheQrCode(instanceId: string, qrcode: string): Promise<void> {
    await this.redis.set(this.qrKey(instanceId), qrcode, 300);
  }

  async applyConnectionUpdate(
    instanceId: string,
    providerState: string,
    details: Record<string, unknown>,
    qrcode?: string,
  ): Promise<InstanceResponseDto> {
    const mapped = qrcode ? "qr_ready" : mapState(providerState);
    if (qrcode) await this.cacheQrCode(instanceId, qrcode);
    await this.updateState(instanceId, mapped, { provider_state: providerState, provider: details, qrcode_present: !!qrcode });
    return this.getById(instanceId);
  }

  private async updateState(instanceId: string, state: ChannelInstanceState, metadata?: Record<string, unknown>) {
    const patch: Record<string, unknown> = { state };
    if (state === "connected") patch.last_connected_at = new Date().toISOString();
    if (state === "disconnected") patch.last_disconnected_at = new Date().toISOString();
    if (metadata) patch.metadata = metadata;

    const { error } = await this.admin.schema("core").from("channel_instances").update(patch).eq("id", instanceId);
    if (error) throw new BadRequestException(error.message);
  }

  private toResponse(row: DbChannelInstanceRow): InstanceResponseDto {
    return {
      id: row.id,
      company_id: row.company_id,
      channel_type: row.channel_type,
      instance_name: row.instance_name,
      state: row.state,
      phone_number: row.phone_number ?? null,
      profile_name: row.profile_name ?? null,
      last_connected_at: row.last_connected_at ?? null,
      last_disconnected_at: row.last_disconnected_at ?? null,
      error_message: row.error_message ?? null,
    };
  }

  private resolveTelegramToken(instance: Pick<DbChannelInstanceRow, "telegram_bot_token" | "telegram_bot_token_enc">): string | null {
    const raw = (instance.telegram_bot_token_enc ?? instance.telegram_bot_token ?? "").trim();
    if (!raw) return null;
    try {
      const token = decryptV1(raw).trim();
      return token ? token : null;
    } catch (err) {
      throw new ServiceUnavailableException("APP_ENCRYPTION_KEY_CURRENT (or APP_ENCRYPTION_KEY) is required to decrypt Telegram tokens");
    }
  }

  private encryptTelegramToken(token: string): string {
    try {
      return encryptV1(token.trim());
    } catch {
      throw new ServiceUnavailableException("APP_ENCRYPTION_KEY_CURRENT (or APP_ENCRYPTION_KEY) is required to store Telegram tokens securely");
    }
  }
}
