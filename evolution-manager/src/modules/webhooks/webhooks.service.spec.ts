import { WebhooksService } from "./services/webhooks.service";

describe("WebhooksService", () => {
  it("publishes message.received for messages.upsert", async () => {
    const instances = {
      getByName: jest.fn(async (name: string) => {
        if (name !== "inst1") return null;
        return {
          id: "instance-uuid",
          company_id: "company-uuid",
          channel_type: "whatsapp",
          instance_name: "inst1",
          state: "connected",
        };
      }),
      cacheQrCode: jest.fn(),
      connect: jest.fn(),
    };

    const publisher = {
      publishMessageReceived: jest.fn(),
      publishInstanceStatus: jest.fn(),
    };

    const svc = new WebhooksService(instances as any, publisher as any);

    await svc.handle({
      event: "messages.upsert",
      instance: "inst1",
      data: {
        key: {
          remoteJid: "5511999999999@s.whatsapp.net",
          fromMe: false,
          id: "msg-1",
        },
        message: {
          conversation: "Olá!",
        },
      },
    });

    expect(publisher.publishMessageReceived).toHaveBeenCalledWith(
      "company-uuid",
      expect.objectContaining({
        instance_id: "instance-uuid",
        from: "5511999999999",
        body: "Olá!",
      }),
      "msg-1",
    );
  });
});

