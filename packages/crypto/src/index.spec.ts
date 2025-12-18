import { decryptJson, decryptV1, encryptJson, encryptV1, loadKeyringFromEnv } from "./index";

describe("@wolfgang/crypto", () => {
  it("encryptV1/decryptV1 round-trip", () => {
    const env = { APP_ENCRYPTION_KEY_CURRENT: "k1" } as any;
    const keyring = loadKeyringFromEnv(env);
    const enc = encryptV1("hello", keyring);
    expect(enc.startsWith("v1:")).toBe(true);
    expect(decryptV1(enc, keyring)).toBe("hello");
  });

  it("decryptV1 uses previous key when rotated", () => {
    const prev = { APP_ENCRYPTION_KEY_CURRENT: "old" } as any;
    const enc = encryptV1("secret", loadKeyringFromEnv(prev));

    const rotated = { APP_ENCRYPTION_KEY_CURRENT: "new", APP_ENCRYPTION_KEY_PREVIOUS: "old" } as any;
    expect(decryptV1(enc, loadKeyringFromEnv(rotated))).toBe("secret");
  });

  it("decryptV1 returns plaintext for legacy values", () => {
    expect(decryptV1("plain")).toBe("plain");
  });

  it("encryptJson/decryptJson round-trip", () => {
    const env = { APP_ENCRYPTION_KEY_CURRENT: "k1" } as any;
    const keyring = loadKeyringFromEnv(env);
    const enc = encryptJson({ a: 1, b: "x" }, keyring);
    expect(decryptJson(enc, keyring)).toEqual({ a: 1, b: "x" });
  });
});
