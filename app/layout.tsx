import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "ALPINIA® — Call Intelligence",
  description: "Outil interne d'analyse IA de cold calls — Alpinia Web Craft, Valais.",
};

export const viewport: Viewport = {
  themeColor: "#FBFBF9",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="font-sans antialiased">
        <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 pb-24 pt-6 md:px-10 md:pt-10">
          <SiteHeader />
          <SiteNav />
          <main className="flex-1 pt-8 md:pt-10">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
