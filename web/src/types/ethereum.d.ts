interface Window {
  ethereum?: {
    isMetaMask?: boolean;
    request: (request: { method: string; params?: Array<unknown> | Record<string, unknown> }) => Promise<unknown>;
    on?: (eventName: string, handler: (...args: unknown[]) => void) => void;
    removeListener?: (eventName: string, handler: (...args: unknown[]) => void) => void;
    selectedAddress?: string | null;
  };
}
