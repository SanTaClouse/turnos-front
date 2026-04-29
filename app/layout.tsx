import type { Metadata, Viewport } from "next";
import { Inter_Tight, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { PWAInstallPrompt } from "@/components/ui/pwa-install-prompt";

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

// URL del sitio: usa NEXT_PUBLIC_FRONT_SHORT (ej: turno1min.app), VERCEL_URL, o localhost
const siteUrl =
  process.env.NEXT_PUBLIC_FRONT_SHORT
    ? `https://${process.env.NEXT_PUBLIC_FRONT_SHORT}`
    : process.env.NEXT_PUBLIC_SITE_URL
      ? process.env.NEXT_PUBLIC_SITE_URL
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3001";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Turno1Min - Reservá tu turno online",
    template: "%s",
  },
  description:
    "Reservá turnos online sin apps, sin esperas. Confirmación inmediata por email y WhatsApp.",
  applicationName: "Turno1Min",
  authors: [{ name: "Turno1Min" }],
  openGraph: {
    type: "website",
    locale: "es_AR",
    title: "Reservá tu turno online",
    description:
      "Reservá turnos online sin apps, sin esperas. Confirmación inmediata por email y WhatsApp.",
    siteName: "Turno1Min",
  },
  twitter: {
    card: "summary_large_image",
    title: "Reservá tu turno online",
    description:
      "Reservá turnos online sin apps, sin esperas. Confirmación inmediata por email y WhatsApp.",
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
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Turno1Min" />
      </head>
      <body className="bg-bg text-ink-1 antialiased">
        {children}
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
