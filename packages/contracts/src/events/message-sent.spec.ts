import { OutboundMessageSchema } from "./message-sent";

describe("OutboundMessageSchema", () => {
  it("accepts text message", () => {
    const result = OutboundMessageSchema.safeParse({ type: "text", text: "oi" });
    expect(result.success).toBe(true);
  });

  it("requires asset_id or url for media messages", () => {
    const result = OutboundMessageSchema.safeParse({ type: "image" });
    expect(result.success).toBe(false);
  });

  it("requires mime_type when using url without asset_id", () => {
    const result = OutboundMessageSchema.safeParse({
      type: "image",
      url: "https://example.com/file.png",
    });
    expect(result.success).toBe(false);
  });
});

