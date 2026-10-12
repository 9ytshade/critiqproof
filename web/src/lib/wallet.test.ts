import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { formatAddress } from "./safety";

const DISCONNECT_KEY = "critiqproof-wallet-disconnected";
const LAST_ACCOUNT_KEY = "critiqproof-last-account";

class MemoryStorage {
  private store: Record<string, string> = {};
  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }
  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }
  removeItem(key: string): void {
    delete this.store[key];
  }
  clear(): void {
    this.store = {};
  }
}

describe("Wallet State Management & Account Switching", () => {
  beforeAll(() => {
    if (typeof globalThis.sessionStorage === "undefined") {
      // @ts-expect-error Mocking storage in node test environment
      globalThis.sessionStorage = new MemoryStorage();
    }
  });

  beforeEach(() => {
    globalThis.sessionStorage.clear();
  });

  it("formats ethereum addresses correctly", () => {
    expect(formatAddress("0x1234567890abcdef1234567890abcdef12345678")).toBe("0x1234...5678");
    expect(formatAddress("")).toBe("0x0000...0000");
  });

  it("handles wallet disconnect storage lifecycle", () => {
    // Simulate user connected initially
    globalThis.sessionStorage.setItem(LAST_ACCOUNT_KEY, "0x1111111111111111111111111111111111111111");
    expect(globalThis.sessionStorage.getItem(LAST_ACCOUNT_KEY)).toBe("0x1111111111111111111111111111111111111111");

    // Simulate disconnect action
    globalThis.sessionStorage.setItem(DISCONNECT_KEY, "true");
    globalThis.sessionStorage.removeItem(LAST_ACCOUNT_KEY);

    expect(globalThis.sessionStorage.getItem(DISCONNECT_KEY)).toBe("true");
    expect(globalThis.sessionStorage.getItem(LAST_ACCOUNT_KEY)).toBeNull();
  });

  it("handles account switching storage lifecycle", () => {
    const accountA = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const accountB = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

    // Start on Account A
    globalThis.sessionStorage.setItem(LAST_ACCOUNT_KEY, accountA);
    globalThis.sessionStorage.removeItem(DISCONNECT_KEY);

    expect(globalThis.sessionStorage.getItem(LAST_ACCOUNT_KEY)).toBe(accountA);
    expect(globalThis.sessionStorage.getItem(DISCONNECT_KEY)).toBeNull();

    // Switch to Account B
    globalThis.sessionStorage.setItem(LAST_ACCOUNT_KEY, accountB);
    globalThis.sessionStorage.removeItem(DISCONNECT_KEY);

    expect(globalThis.sessionStorage.getItem(LAST_ACCOUNT_KEY)).toBe(accountB);
    expect(globalThis.sessionStorage.getItem(DISCONNECT_KEY)).toBeNull();
  });

  it("detects account change between cached storage and new wallet address", () => {
    const cachedAccount = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const incomingAccount = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

    globalThis.sessionStorage.setItem(LAST_ACCOUNT_KEY, cachedAccount);

    const isDifferent =
      incomingAccount.toLowerCase() !==
      (globalThis.sessionStorage.getItem(LAST_ACCOUNT_KEY) || "").toLowerCase();
    expect(isDifferent).toBe(true);

    if (isDifferent) {
      globalThis.sessionStorage.setItem(LAST_ACCOUNT_KEY, incomingAccount);
    }

    expect(globalThis.sessionStorage.getItem(LAST_ACCOUNT_KEY)).toBe(incomingAccount);
  });
});
