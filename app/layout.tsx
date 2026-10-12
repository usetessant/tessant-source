import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const chivo = localFont({ src: "../public/fonts/chivo.ttf", variable: "--font-chivo", display: "swap" });
const azeret = localFont({ src: "../public/fonts/azeret-mono.ttf", variable: "--font-azeret", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Tessant | Staked-BNB credit", template: "%s | Tessant" },
  description: "Open and manage slisBNB-backed lisUSD credit on BNB Mainnet with wallet-confirmed transactions.",
  metadataBase: new URL("https://usetessant.xyz"),
  openGraph: {
    title: "Tessant | Staked-BNB credit",
    description: "Open and manage slisBNB-backed lisUSD credit on BNB Mainnet with wallet-confirmed transactions.",
    url: "https://usetessant.xyz",
    siteName: "Tessant",
    type: "website",
    images: [{ url: "/tessant-bnb-credit-social-v1.png", width: 1200, height: 630, alt: "Tessant staked-BNB credit" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tessant | Staked-BNB credit",
    description: "Open and manage slisBNB-backed lisUSD credit on BNB Mainnet with wallet-confirmed transactions.",
    creator: "@use_tessant",
    site: "@use_tessant",
    images: ["/tessant-bnb-credit-social-v1.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={`${chivo.variable} ${azeret.variable}`}><body><Navbar /><main>{children}</main><Footer /></body></html>;
}
