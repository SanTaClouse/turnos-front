import type { Metadata, Viewport } from "next";
import { Inter_Tight, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const interTight = Inter_Tight({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter-tight",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains-mono",
});

// Sin un dominio real todavía, usamos VERCEL_URL como fallback automático.
// Cuando tengas tu propio dominio, configurá NEXT_PUBLIC_SITE_URL.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3001");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Reservá tu turno online",
    template: "%s",
  },
  description:
    "Reservá turnos online sin apps, sin esperas. Confirmación inmediata por email.",
  applicationName: "Turnos",
  authors: [{ name: "Turnos" }],
  openGraph: {
    type: "website",
    locale: "es_AR",
    title: "Reservá tu turno online",
    description:
      "Reservá turnos online sin apps, sin esperas. Confirmación inmediata por email.",
    siteName: "Turnos",
  },
  twitter: {
    card: "summary_large_image",
    title: "Reservá tu turno online",
    description:
      "Reservá turnos online sin apps, sin esperas. Confirmación inmediata por email.",
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#fafaf7",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${interTight.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}
    >
      <body className="bg-bg text-ink-1 antialiased">{children}</body>
    </html>
  );
}
