import { Injectable } from "@nestjs/common";

import { EvolutionApiService } from "../services/evolution-api.service";

function stripPrefix(value: string, prefix: string) {
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

@Injectable()
export class InstagramService {
  constructor(private readonly evolution: EvolutionApiService) {}

  async createInstance(companyId: string, instanceName: string): Promise<void> {
    await this.evolution.createInstance(companyId, instanceName);
  }

  async deleteInstance(companyId: string, instanceName: string): Promise<void> {
    await this.evolution.deleteInstance(companyId, instanceName);
  }

  async connect(companyId: string, instanceName: string): Promise<{ qrcode: string | null }> {
    return this.evolution.connect(companyId, instanceName);
  }

  async disconnect(companyId: string, instanceName: string): Promise<void> {
    await this.evolution.disconnect(companyId, instanceName);
  }

  async getStatus(companyId: string, instanceName: string): Promise<{ state: string; raw: Record<string, unknown> }> {
    return this.evolution.getStatus(companyId, instanceName);
  }

  async getQrCode(companyId: string, instanceName: string): Promise<{ qrcode: string | null; raw: Record<string, unknown> }> {
    return this.evolution.getQrCode(companyId, instanceName);
  }

  async sendText(companyId: string, instanceName: string, to: string, text: string): Promise<void> {
    const recipient = stripPrefix(to, "instagram:");
    await this.evolution.sendText(companyId, instanceName, recipient, text);
  }
}
