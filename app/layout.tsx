import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthContext";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "VERIPRICE | National Supply Chain & Tax Ledger",
  description: "Official National Directorate for Supply Chain Provenance, Digital Product Passport (DPP), Fiscal Tax & Price Compliance Engine.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#f8f7f4] text-[#1c1f1d] min-h-screen flex flex-col antialiased">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
          <footer className="border-t border-[#e5e2da] bg-[#ffffff] py-8 text-xs text-[#65736a]">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#1b4332]"></span>
                <span className="font-semibold text-[#1c1f1d]">
                  VERIPRICE &bull; National Directorate for Price Compliance & Fiscal Provenance
                </span>
              </div>
              <p className="text-[#65736a]">
                Server-Enforced Authorization &bull; 13% Statutory VAT Engine &bull; Cryptographic DPP Registry
              </p>
              <div className="flex items-center gap-2 text-[#4c5850] font-mono text-[11px]">
                <span className="bg-[#f3f1ec] px-2 py-0.5 rounded border border-[#e5e2da]">
                  Official Registry v2.6
                </span>
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
