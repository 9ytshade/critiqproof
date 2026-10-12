"use client";

import React, { useState, useRef, useEffect } from "react";
import { useWallet } from "@/lib/use-wallet";
import { CopyIcon, CheckIcon } from "./icons";

export function WalletConnect() {
  const {
    account,
    balance,
    isConnected,
    isConnecting,
    wrongNetwork,
    reloading,
    connect,
    disconnect,
    changeAccount,
    switchNetwork,
    formatAddress,
  } = useWallet();

  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  if (wrongNetwork) {
    return (
      <button
        onClick={switchNetwork}
        disabled={reloading}
        className="px-3.5 py-1.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 font-mono text-xs hover:bg-rose-900/40 transition font-medium cursor-pointer disabled:opacity-50"
      >
        {reloading ? "Refreshing..." : "Switch to Studionet"}
      </button>
    );
  }

  if (isConnected && account) {
    return (
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          disabled={reloading}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#141414] border border-[#1e1e1e] hover:border-[#313131] text-[#ffffff] font-mono text-xs transition cursor-pointer disabled:opacity-60 disabled:cursor-wait"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              reloading ? "bg-amber-400 animate-ping" : "bg-emerald-400 animate-pulse"
            }`}
          />
          <span className="font-medium text-[#ffffff]">
            {reloading ? "Refreshing..." : formatAddress(account)}
          </span>
          {balance && !reloading && (
            <span className="hidden sm:inline border-l border-[#313131] pl-2 text-[#a7a7a7]">
              {balance} GEN
            </span>
          )}
          <span className="text-[10px] text-[#7c7c7c]">▼</span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-72 rounded-lg border border-[#313131] bg-[#141414] p-3.5 shadow-2xl z-50 text-xs backdrop-blur-md">
            {/* Header info */}
            <div className="pb-3 mb-2.5 border-b border-[#1e1e1e] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#a7a7a7]">
                  Connected Account
                </span>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-[#6798ff]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6798ff]" />
                  Studionet
                </span>
              </div>
              <p className="font-mono text-[11px] text-[#ffffff] break-all select-all bg-[#0a0a0a] p-2 rounded border border-[#1e1e1e]">
                {account}
              </p>
              {balance && (
                <div className="text-[11px] font-mono text-[#a7a7a7] pt-0.5">
                  Balance:{" "}
                  <span className="text-[#ffffff] font-medium">{balance} GEN</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="space-y-1 font-mono text-[12px]">
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(account);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-[#1e1e1e] text-[#a7a7a7] hover:text-[#ffffff] transition flex items-center justify-between cursor-pointer"
              >
                <span>{copied ? "Copied to Clipboard!" : "Copy Address"}</span>
                {copied ? (
                  <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <CopyIcon className="w-3.5 h-3.5 text-[#7c7c7c]" />
                )}
              </button>

              <button
                disabled={reloading}
                onClick={() => {
                  setMenuOpen(false);
                  void changeAccount();
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-[#1e1e1e] text-[#a7a7a7] hover:text-[#ffffff] transition flex items-center justify-between cursor-pointer disabled:opacity-50"
              >
                <span>Switch / Change Account</span>
                <span className="text-[11px] text-[#7c7c7c]">⇄</span>
              </button>

              <div className="my-1 border-t border-[#1e1e1e]" />

              <button
                disabled={reloading}
                onClick={() => {
                  setMenuOpen(false);
                  void disconnect();
                }}
                className="w-full text-left px-3 py-2 rounded hover:bg-rose-950/30 text-rose-400 transition flex items-center justify-between font-medium cursor-pointer disabled:opacity-50"
              >
                <span>Disconnect Wallet</span>
                <span className="text-[11px]">⏻</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => void connect()}
      disabled={isConnecting || reloading}
      className="btn-primary disabled:opacity-50 disabled:cursor-wait cursor-pointer"
    >
      {reloading
        ? "Refreshing..."
        : isConnecting
        ? "Connecting..."
        : "Connect Wallet"}
    </button>
  );
}
