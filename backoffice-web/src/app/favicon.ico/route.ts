const faviconBase64 =
  "AAABAAEAAQEAAAEAIABEAAAAFgAAAIlQTkcNChoKAAAADUlIRFIAAAABAAAAAQgEAAAAtRwMAgAAAAtJREFUeNpj/P8fAAMDAgDtqfVkAAAAAElFTkSuQmCC";

export function GET() {
  const body = Buffer.from(faviconBase64, "base64");
  return new Response(body, {
    headers: {
      "Content-Type": "image/x-icon",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

