import { Injectable } from "@nestjs/common";

import { EvolutionApiService } from "../services/evolution-api.service";

function stripPrefix(value: string, prefix: string) {
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

@Injectable()
export class InstagramService {
  constructor(private readonly evolution: EvolutionApiService) {}

  async createInstance(instanceName: string): Promise<void> {
    await this.evolution.createInstance(instanceName);
  }

  async deleteInstance(instanceName: string): Promise<void> {
    await this.evolution.deleteInstance(instanceName);
  }

  async connect(instanceName: string): Promise<{ qrcode: string | null }> {
    return this.evolution.connect(instanceName);
  }

  async disconnect(instanceName: string): Promise<void> {
    await this.evolution.disconnect(instanceName);
  }

  async getStatus(instanceName: string): Promise<{ state: string; raw: Record<string, unknown> }> {
    return this.evolution.getStatus(instanceName);
  }

  async getQrCode(instanceName: string): Promise<{ qrcode: string | null; raw: Record<string, unknown> }> {
    return this.evolution.getQrCode(instanceName);
  }

  async sendText(instanceName: string, to: string, text: string): Promise<void> {
    const recipient = stripPrefix(to, "instagram:");
    await this.evolution.sendText(instanceName, recipient, text);
  }
}

