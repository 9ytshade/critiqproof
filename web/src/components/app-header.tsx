"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldIcon, MenuIcon, CloseIcon } from "./icons";
import { WalletConnect } from "./wallet-connect";

export function AppHeader() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Marketplace" },
    { href: "/listings/create", label: "Register Listing" },
    { href: "/portfolio", label: "Portfolio" },
    { href: "/protocol", label: "Protocol" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[#1e1e1e] bg-[#0a0a0a]/95 backdrop-blur-md">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Logo */}
        <div className="flex-1 flex items-center justify-start">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="p-1.5 rounded-lg bg-[#141414] border border-[#1e1e1e] text-[#6798ff] group-hover:border-[#6798ff]/50 transition-colors">
              <ShieldIcon className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-[#ffffff] tracking-tight text-base">
                CritiqProof
              </span>
              <span className="tag-badge text-[10px] text-[#a7a7a7]">
                STUDIONET
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Desktop Navigation Bar */}
        <nav className="hidden md:flex flex-initial items-center justify-center gap-1">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-pill ${isActive ? "active" : ""}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right: Network Status & Wallet & Mobile Toggle */}
        <div className="flex-1 flex items-center justify-end gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#1e1e1e] bg-[#141414] text-[11px] font-mono text-[#a7a7a7]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6798ff] animate-pulse" />
            <span>Chain 61999</span>
          </div>

          <div className="hidden sm:block">
            <WalletConnect />
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            className="md:hidden p-2 rounded-lg bg-[#141414] border border-[#1e1e1e] text-[#a7a7a7] hover:text-[#ffffff] hover:border-[#454545] transition-colors"
          >
            {mobileMenuOpen ? (
              <CloseIcon className="w-5 h-5" />
            ) : (
              <MenuIcon className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Collapsible Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#1e1e1e] bg-[#0a0a0a] px-4 pt-3 pb-5 space-y-4 shadow-xl">
          <nav className="flex flex-col space-y-1">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#141414] text-[#ffffff] border border-[#1e1e1e]"
                      : "text-[#a7a7a7] hover:text-[#ffffff] hover:bg-[#141414]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-[#1e1e1e] flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-mono text-[#a7a7a7]">
              <span>Network:</span>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-[#1e1e1e] bg-[#141414]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6798ff] animate-pulse" />
                <span>GenLayer Studionet (61999)</span>
              </div>
            </div>

            <div className="w-full flex justify-center pt-1">
              <WalletConnect />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
