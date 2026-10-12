"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { STUDIONET_CHAIN_ID, STUDIONET_RPC } from "./genlayer";
import { formatAddress, formatGen } from "./safety";

const DISCONNECT_KEY = "critiqproof-wallet-disconnected";
const LAST_ACCOUNT_KEY = "critiqproof-last-account";

function isUserRejection(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: number; rpcCode?: number };
  return err.code === 4001 || err.rpcCode === 4001;
}

let isReloadingGlobal = false;
export function refreshPage(delayMs = 250) {
  if (typeof window === "undefined" || isReloadingGlobal) return;
  isReloadingGlobal = true;
  window.setTimeout(() => {
    window.location.reload();
  }, delayMs);
}

export interface WalletContextValue {
  account: string;
  balance: string;
  rawWei: string;
  isConnected: boolean;
  isConnecting: boolean;
  wrongNetwork: boolean;
  reloading: boolean;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  changeAccount: () => Promise<void>;
  switchNetwork: () => Promise<void>;
  refreshAccount: () => Promise<string>;
  getSignerClient: () => ReturnType<typeof createClient> | null;
  assertStudionet: () => Promise<boolean>;
  formatAddress: (addr: string) => string;
}

const defaultWalletState: WalletContextValue = {
  account: "",
  balance: "",
  rawWei: "",
  isConnected: false,
  isConnecting: false,
  wrongNetwork: false,
  reloading: false,
  connect: async () => false,
  disconnect: async () => {},
  changeAccount: async () => {},
  switchNetwork: async () => {},
  refreshAccount: async () => "",
  getSignerClient: () => null,
  assertStudionet: async () => false,
  formatAddress,
};

const WalletContext = createContext<WalletContextValue>(defaultWalletState);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [account, setAccount] = useState<string>("");
  const [balance, setBalance] = useState<string>("");
  const [rawWei, setRawWei] = useState<string>("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [wrongNetwork, setWrongNetwork] = useState(false);
  const [locallyDisconnected, setLocallyDisconnected] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(DISCONNECT_KEY) === "true";
  });

  const checkNetworkAndBalance = useCallback(async (addr: string) => {
    if (!window.ethereum || !addr) return;
    try {
      const chainIdHex = (await window.ethereum.request({ method: "eth_chainId" })) as string;
      const currentChainId = parseInt(chainIdHex, 16);
      const isWrong = currentChainId !== STUDIONET_CHAIN_ID;
      setWrongNetwork(isWrong);

      if (!isWrong) {
        const balHex = (await window.ethereum.request({
          method: "eth_getBalance",
          params: [addr, "latest"],
        })) as string;
        if (balHex) {
          setRawWei(balHex);
          setBalance(formatGen(BigInt(balHex)));
        }
      }
    } catch {
      // Ignored
    }
  }, []);

  const refreshAccount = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setAccount("");
      return "";
    }
    if (locallyDisconnected) {
      setAccount("");
      return "";
    }
    try {
      const accs = (await window.ethereum.request({ method: "eth_accounts" })) as string[];
      const first = Array.isArray(accs) && accs[0] ? accs[0].toLowerCase().trim() : "";
      setAccount(first);
      if (first) {
        window.sessionStorage.setItem(LAST_ACCOUNT_KEY, first);
        void checkNetworkAndBalance(first);
      } else {
        window.sessionStorage.removeItem(LAST_ACCOUNT_KEY);
      }
      return first;
    } catch {
      setAccount("");
      return "";
    }
  }, [locallyDisconnected, checkNetworkAndBalance]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshAccount();
    }, 0);
    if (typeof window === "undefined" || !window.ethereum) return;

    const onAccountsChanged = (accounts: unknown) => {
      const list = Array.isArray(accounts) ? accounts : [];
      const next = list.length > 0 && typeof list[0] === "string" ? list[0].toLowerCase().trim() : "";
      const current = window.sessionStorage.getItem(LAST_ACCOUNT_KEY) || "";

      if (list.length === 0 || !next) {
        // Disconnected in wallet provider
        window.sessionStorage.setItem(DISCONNECT_KEY, "true");
        window.sessionStorage.removeItem(LAST_ACCOUNT_KEY);
        setLocallyDisconnected(true);
        setAccount("");
        setBalance("");
        setRawWei("");
        setReloading(true);
        refreshPage(250);
      } else if (next !== current) {
        // Switched account in wallet provider
        window.sessionStorage.removeItem(DISCONNECT_KEY);
        window.sessionStorage.setItem(LAST_ACCOUNT_KEY, next);
        setLocallyDisconnected(false);
        setAccount(next);
        setReloading(true);
        refreshPage(250);
      }
    };

    const onChainChanged = () => {
      setReloading(true);
      refreshPage(250);
    };

    window.ethereum.on?.("accountsChanged", onAccountsChanged);
    window.ethereum.on?.("chainChanged", onChainChanged);

    return () => {
      window.clearTimeout(timer);
      window.ethereum?.removeListener?.("accountsChanged", onAccountsChanged);
      window.ethereum?.removeListener?.("chainChanged", onChainChanged);
    };
  }, [refreshAccount]);

  const connect = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined" || !window.ethereum) {
      alert("MetaMask or a Web3 compatible browser extension is required. Please install MetaMask to continue.");
      return false;
    }
    setIsConnecting(true);
    try {
      const accs = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      const first = Array.isArray(accs) && accs[0] ? accs[0].toLowerCase().trim() : "";
      if (!first) throw new Error("No account selected");

      window.sessionStorage.removeItem(DISCONNECT_KEY);
      window.sessionStorage.setItem(LAST_ACCOUNT_KEY, first);
      setLocallyDisconnected(false);
      setAccount(first);
      await checkNetworkAndBalance(first);
      setReloading(true);
      refreshPage(250);
      return true;
    } catch (err: unknown) {
      if (!isUserRejection(err)) {
        console.error("Wallet connection error:", err);
      }
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [checkNetworkAndBalance]);

  const disconnect = useCallback(async () => {
    setReloading(true);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(DISCONNECT_KEY, "true");
      window.sessionStorage.removeItem(LAST_ACCOUNT_KEY);
    }
    setLocallyDisconnected(true);
    setAccount("");
    setBalance("");
    setRawWei("");

    if (window.ethereum) {
      try {
        await window.ethereum.request({
          method: "wallet_revokePermissions",
          params: [{ eth_accounts: {} }],
        });
      } catch {
        // Ignored
      }
    }
    refreshPage(250);
  }, []);

  const changeAccount = useCallback(async () => {
    if (!window.ethereum) return;
    setReloading(true);
    try {
      await window.ethereum.request({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
      });
    } catch {
      // Ignored
    }

    try {
      const accs = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[];
      const first = Array.isArray(accs) && accs[0] ? accs[0].toLowerCase().trim() : "";
      if (first) {
        window.sessionStorage.removeItem(DISCONNECT_KEY);
        window.sessionStorage.setItem(LAST_ACCOUNT_KEY, first);
        setLocallyDisconnected(false);
        setAccount(first);
        refreshPage(250);
        return;
      }
    } catch (err: unknown) {
      if (!isUserRejection(err)) {
        console.error("Change account error:", err);
      }
    }
    setReloading(false);
  }, []);

  const switchNetwork = useCallback(async () => {
    if (!window.ethereum) return;
    const targetChainHex = `0x${STUDIONET_CHAIN_ID.toString(16)}`;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: targetChainHex }],
      });
      setWrongNetwork(false);
      setReloading(true);
      refreshPage(250);
    } catch (switchError: unknown) {
      const err = switchError as { code?: number };
      if (err.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: targetChainHex,
                chainName: "GenLayer Studionet",
                nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
                rpcUrls: [STUDIONET_RPC],
                blockExplorerUrls: ["https://explorer-studio.genlayer.com"],
              },
            ],
          });
          setWrongNetwork(false);
          setReloading(true);
          refreshPage(250);
        } catch (addError) {
          console.error("Error adding Studionet network:", addError);
        }
      }
    }
  }, []);

  const assertStudionet = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined" || !window.ethereum) return false;
    try {
      const chainIdHex = (await window.ethereum.request({ method: "eth_chainId" })) as string;
      const currentChainId = parseInt(chainIdHex, 16);
      if (currentChainId !== STUDIONET_CHAIN_ID) {
        await switchNetwork();
      }
      return true;
    } catch (err) {
      console.error("Failed ensuring Studionet network:", err);
      setWrongNetwork(true);
      return false;
    }
  }, [switchNetwork]);

  const getSignerClient = useCallback(() => {
    if (typeof window !== "undefined" && window.ethereum && account) {
      return createClient({
        chain: studionet,
        endpoint: STUDIONET_RPC,
        account: account as `0x${string}`,
      });
    }
    return null;
  }, [account]);

  const value = useMemo(
    () => ({
      account,
      balance,
      rawWei,
      isConnected: Boolean(account),
      isConnecting,
      wrongNetwork,
      reloading,
      connect,
      disconnect,
      changeAccount,
      switchNetwork,
      refreshAccount,
      getSignerClient,
      assertStudionet,
      formatAddress,
    }),
    [
      account,
      balance,
      rawWei,
      isConnecting,
      wrongNetwork,
      reloading,
      connect,
      disconnect,
      changeAccount,
      switchNetwork,
      refreshAccount,
      getSignerClient,
      assertStudionet,
    ]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  return context || defaultWalletState;
}
