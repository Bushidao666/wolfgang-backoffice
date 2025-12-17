import { MessageReceivedEventSchema } from "../events/message-received";

describe("contracts/events", () => {
  it("validates message.received envelope", () => {
    const parsed = MessageReceivedEventSchema.parse({
      id: "evt_01J8Z0P3H1Y8K8Q0KQ9VJ8X7K1",
      type: "message.received",
      version: 1,
      occurred_at: new Date().toISOString(),
      company_id: "cmp_01J8Z0P1F7K4V6E9QW3M0N1B2C",
      source: "evolution-manager",
      correlation_id: "cor_01J8Z0P2T0Q1V9G7H6J5K4L3M2",
      causation_id: null,
      payload: {
        instance_id: "ins_1",
        lead_external_id: "wa:+5511999999999",
        from: "+5511999999999",
        body: "Olá",
        media: null,
        raw: {},
      },
    });

    expect(parsed.type).toBe("message.received");
  });
});

