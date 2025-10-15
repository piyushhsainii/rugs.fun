import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppProvider from "./AppProvider";
import Navbar from "./components/navbar";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
require("@solana/wallet-adapter-react-ui/styles.css");

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rugs.fun – On-chain Trading Game for Degens",
  description:
    "Trade, risk, and cash out before it rugs. rugs.fun is an on-chain crash game for degens who love the thrill of timing the perfect exit.",
  keywords: [
    "rugs.fun",
    "rugs",
    "crash game",
    "crypto trading",
    "on-chain game",
    "Solana",
    "Web3 gaming",
    "degen trading",
    "blockchain casino",
    "timing game",
  ],
  authors: [{ name: "rugs.fun", url: "" }],
  creator: "rugs.fun",
  openGraph: {
    title: "rugs.fun – On-chain Trading Game for Degens",
    description:
      "Play rugs.fun, the ultimate on-chain trading crash game. Multiply your gains, set auto-sell, and cash out before it rugs.",
    url: "",
    siteName: "rugs.fun",
    type: "website",
    images: [
      {
        url: "https://apneajyhbpncbciasirk.supabase.co/storage/v1/object/public/nft-storage/rugs-fun/metadataImg.png",
        width: 1200,
        height: 630,
        alt: "rugs.fun Game Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "rugs.fun – On-chain Trading Game for Degens",
    description:
      "Trade and cash out before it rugs. The on-chain crash game that rewards perfect timing. Built for degens, by degens.",
    images: [
      "https://apneajyhbpncbciasirk.supabase.co/storage/v1/object/public/nft-storage/rugs-fun/metadataImg.png",
    ],
    creator: "@piyushhsainii",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased text-white`}
      >
        <AppProvider>
          <Navbar />
          {children}
          <Toaster />
          <Analytics />
        </AppProvider>
      </body>
    </html>
  );
}
