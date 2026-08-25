import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthContext";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "SkillHunt ApexTrace | National Supply Chain & Tax Ledger",
  description: "End-to-End Supply Chain Provenance, Digital Product Passport (DPP), Fiscal Tax & Price Engine, and Fraud Risk Detection System.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased selection:bg-cyan-500 selection:text-black">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
          <footer className="border-t border-slate-800/80 bg-slate-950 py-8 text-center text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>SkillHunt ApexTrace &bull; Enterprise & National Provenance Network</span>
              </div>
              <p>
                Strict Server Authorization &bull; Anti-IDOR Tenant Guard &bull; Cryptographic DPP Stamping
              </p>
              <div className="flex items-center gap-3 text-slate-400">
                <span className="font-mono text-[11px] bg-slate-900 px-2 py-1 rounded border border-slate-800">
                  v2.6-FISCAL
                </span>
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
