import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Atmosphere from "@/components/Atmosphere";
import ActiveAnalysesBar from "@/components/ActiveAnalysesBar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Lurelit — Agentic Phishing & Smishing Analyzer",
  description: "An agentic screenshot analyzer that lights up phishing and smishing lures.",
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen flex flex-col">
        <Atmosphere mode="combo" />
        {children}
        <ActiveAnalysesBar />
      </body>
    </html>
  );
}
