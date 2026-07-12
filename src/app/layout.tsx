import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OraProjekt — Menaxhim i Orëve të Punëtorëve",
  description:
    "Sistem multi-tenant për menaxhimin e orëve të punëtorëve nëpër projekte. Përshtatur për ekipet që punojnë në disa projekte njëkohësisht.",
  keywords: [
    "OraProjekt",
    "timesheet",
    "menaxhim orësh",
    "projekte",
    "multi-tenant",
    "Kosovë",
  ],
  authors: [{ name: "OraProjekt" }],
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "OraProjekt",
  },
  openGraph: {
    title: "OraProjekt",
    description: "Menaxhim i Orëve të Punëtorëve nëpër Projekte",
    siteName: "OraProjekt",
    type: "website",
    images: [{ url: "/logo.png", width: 1254, height: 1254, alt: "OraProjekt" }],
  },
  twitter: {
    card: "summary",
    title: "OraProjekt",
    description: "Menaxhim i Orëve të Punëtorëve nëpër Projekte",
    images: ["/logo.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#10b981",
  width: "device-width",
  initialScale: 1,
  // Allow zoom for accessibility (WCAG 1.4.4)
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sq" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <SonnerToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
