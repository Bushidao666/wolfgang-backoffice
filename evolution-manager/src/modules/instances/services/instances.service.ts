import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { RedisService } from "../../../infrastructure/redis/redis.service";
import { SupabaseService } from "../../../infrastructure/supabase/supabase.service";
import { ChannelType, CreateInstanceDto } from "../dto/create-instance.dto";
import type { ChannelInstanceState } from "../dto/instance-response.dto";
import { InstagramService } from "../channels/instagram.service";
import { TelegramService } from "../channels/telegram.service";
import { EvolutionApiService } from "./evolution-api.service";

type DbChannelInstance = {
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
  telegram_bot_token?: string | null;
  instagram_account_id?: string | null;
};

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

  async list(companyId: string): Promise<DbChannelInstance[]> {
    const { data, error } = await this.admin
      .schema("core")
      .from("channel_instances")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return (data ?? []) as DbChannelInstance[];
  }

  async getById(instanceId: string): Promise<DbChannelInstance> {
    const { data, error } = await this.admin
      .schema("core")
      .from("channel_instances")
      .select("*")
      .eq("id", instanceId)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException("Instance not found");
    return data as DbChannelInstance;
  }

  async getByName(instanceName: string): Promise<DbChannelInstance | null> {
    const { data, error } = await this.admin
      .schema("core")
      .from("channel_instances")
      .select("*")
      .eq("instance_name", instanceName)
      .maybeSingle();
    if (error) throw new BadRequestException(error.message);
    return (data ?? null) as DbChannelInstance | null;
  }

  async create(dto: CreateInstanceDto): Promise<DbChannelInstance> {
    if (dto.channel_type === ChannelType.Telegram && !dto.telegram_bot_token) {
      throw new BadRequestException("telegram_bot_token is required for Telegram instances");
    }

    if (dto.channel_type === ChannelType.Whatsapp) {
      await this.evolution.createInstance(dto.instance_name);
    } else if (dto.channel_type === ChannelType.Instagram) {
      await this.instagram.createInstance(dto.instance_name);
    }

    const payload: Record<string, unknown> = {
      company_id: dto.company_id,
      channel_type: dto.channel_type,
      instance_name: dto.instance_name,
      state: "disconnected",
      telegram_bot_token: dto.telegram_bot_token ?? null,
      instagram_account_id: dto.instagram_account_id ?? null,
    };

    const { data, error } = await this.admin
      .schema("core")
      .from("channel_instances")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw new BadRequestException(error.message);
    return data as DbChannelInstance;
  }

  async delete(instanceId: string): Promise<void> {
    const instance = await this.getById(instanceId);
    if (instance.channel_type === ChannelType.Whatsapp) {
      await this.evolution.deleteInstance(instance.instance_name);
    } else if (instance.channel_type === ChannelType.Instagram) {
      await this.instagram.deleteInstance(instance.instance_name);
    } else if (instance.channel_type === ChannelType.Telegram && instance.telegram_bot_token) {
      await this.telegram.deleteWebhook(instance.telegram_bot_token);
    }

    const { error } = await this.admin.schema("core").from("channel_instances").delete().eq("id", instanceId);
    if (error) throw new BadRequestException(error.message);
    await this.redis.del(this.qrKey(instanceId));
  }

  async connect(instanceId: string): Promise<{ qrcode: string | null }> {
    const instance = await this.getById(instanceId);
    if (instance.channel_type === ChannelType.Telegram) {
      if (!instance.telegram_bot_token) throw new BadRequestException("telegram_bot_token is missing for instance");
      await this.telegram.setWebhook(instance.telegram_bot_token, instance.id);
      await this.updateState(instanceId, "connected", { provider: "telegram", webhook_configured: true });
      return { qrcode: null };
    }

    const { qrcode } =
      instance.channel_type === ChannelType.Instagram
        ? await this.instagram.connect(instance.instance_name)
        : await this.evolution.connect(instance.instance_name);
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
    const instance = await this.getById(instanceId);
    if (instance.channel_type === ChannelType.Telegram) {
      if (!instance.telegram_bot_token) throw new BadRequestException("telegram_bot_token is missing for instance");
      await this.telegram.deleteWebhook(instance.telegram_bot_token);
      await this.updateState(instanceId, "disconnected", { provider: "telegram", webhook_configured: false });
      return;
    }

    if (instance.channel_type === ChannelType.Instagram) {
      await this.instagram.disconnect(instance.instance_name);
    } else {
      await this.evolution.disconnect(instance.instance_name);
    }
    await this.updateState(instanceId, "disconnected");
  }

  async getQrCode(instanceId: string): Promise<string | null> {
    const cached = await this.redis.get(this.qrKey(instanceId));
    if (cached) return cached;

    const instance = await this.getById(instanceId);
    if (![ChannelType.Whatsapp, ChannelType.Instagram].includes(instance.channel_type)) return null;

    const { qrcode } =
      instance.channel_type === ChannelType.Instagram
        ? await this.instagram.getQrCode(instance.instance_name)
        : await this.evolution.getQrCode(instance.instance_name);
    if (qrcode) {
      await this.cacheQrCode(instanceId, qrcode);
      await this.updateState(instanceId, "qr_ready", { qrcode_present: true });
    }
    return qrcode;
  }

  async refreshStatus(instanceId: string): Promise<DbChannelInstance> {
    const instance = await this.getById(instanceId);
    if (instance.channel_type === ChannelType.Telegram) {
      if (!instance.telegram_bot_token) return instance;
      const info = await this.telegram.getWebhookInfo(instance.telegram_bot_token);
      const state = info.url ? "connected" : "disconnected";
      await this.updateState(instanceId, state, { provider: "telegram", webhook_url: info.url, pending_update_count: info.pending_update_count });
      return this.getById(instanceId);
    }

    if (instance.channel_type !== ChannelType.Whatsapp && instance.channel_type !== ChannelType.Instagram) return instance;

    const status =
      instance.channel_type === ChannelType.Instagram
        ? await this.instagram.getStatus(instance.instance_name)
        : await this.evolution.getStatus(instance.instance_name);
    const mapped = mapState(status.state);

    await this.updateState(instanceId, mapped, { provider_state: status.state, provider: status.raw });
    return this.getById(instanceId);
  }

  async sendTestMessage(instanceId: string, to: string, text: string): Promise<void> {
    const instance = await this.getById(instanceId);

    if (instance.channel_type === ChannelType.Whatsapp) {
      await this.evolution.sendText(instance.instance_name, to, text);
      return;
    }

    if (instance.channel_type === ChannelType.Telegram) {
      if (!instance.telegram_bot_token) throw new BadRequestException("telegram_bot_token is missing for instance");
      await this.telegram.sendText(instance.telegram_bot_token, to, text);
      return;
    }

    if (instance.channel_type === ChannelType.Instagram) {
      await this.instagram.sendText(instance.instance_name, to, text);
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
  ): Promise<DbChannelInstance> {
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
}
