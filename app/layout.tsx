import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SITE_NAME, SERVICE_AREA } from "@/lib/site-config";

export const metadata: Metadata = {
  title: `${SITE_NAME} | Quality Used Cars in ${SERVICE_AREA}`,
  description:
    "Browse quality pre-owned cars, trucks, SUVs, and vans in Carrollton, TX. Message us and we'll text you right back.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-slate-50 text-slate-900 antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
