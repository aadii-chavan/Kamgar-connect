import type { Metadata, Viewport } from "next";
import { Inter_Tight, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";


const body = Inter_Tight({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const deva = Noto_Sans_Devanagari({ subsets: ["devanagari"], variable: "--font-deva", display: "swap" });

export const metadata: Metadata = {
  title: "Kamgar — Contractor Dashboard",
  description: "Post daily-wage jobs, review applicants, track attendance and record payments.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${deva.variable}`}>
      <body><Providers>{children}</Providers></body>
    </html>
  );
}
