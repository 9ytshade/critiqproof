import type { Metadata } from "next";
import "./globals.css";
import { AppHeader } from "@/components/app-header";
import { WalletProvider } from "@/lib/use-wallet";

export const metadata: Metadata = {
  title: "CritiqProof | Staked Consumer Critiques & Purchase Verification Oracle",
  description:
    "AI-native consumer critique and purchase verification oracle on GenLayer. Staked skin-in-the-game reviews audited by validator magistrates under the Equivalence Principle.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0a0a0a] text-[#ffffff] antialiased min-h-screen flex flex-col selection:bg-[#6798ff]/30 selection:text-white">
        <WalletProvider>
          <AppHeader />
          <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 py-8">
            {children}
          </main>
          <footer className="border-t border-[#1e1e1e] py-7 px-4 bg-[#0a0a0a] text-xs text-[#a7a7a7] transition-colors">
            <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px]">
              <div className="flex items-center gap-2 text-[#ffffff]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6798ff] animate-pulse" />
                <span className="font-medium text-[#ffffff]">CritiqProof v1.2.0</span>
                <span className="text-[#313131]">/</span>
                <span className="text-[#a7a7a7]">GenLayer Studionet (61999)</span>
              </div>
              <div className="flex items-center gap-3 text-[#7c7c7c]">
                <span>Staked Consumer Oracle - Equivalence Principle Consensus</span>
              </div>
              <div className="font-medium text-[#ffffff] tracking-wider">
                &copy; 2026 CRITIQPROOF &middot; BUILT BY{" "}
                <span className="text-[#6798ff] font-semibold underline underline-offset-2">
                  9YTSHADE
                </span>
              </div>
            </div>
          </footer>
        </WalletProvider>
      </body>
    </html>
  );
}
