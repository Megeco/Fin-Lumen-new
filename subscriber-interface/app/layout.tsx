import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fin-Lumen Subscriber Dashboard",
  description: "A structured financial-astrology view of market conditions and company-specific cycles.",
  metadataBase: new URL("https://fin-lumen-subscriber.twoopod.chatgpt.site"),
  openGraph: {
    title: "Fin-Lumen Subscriber Dashboard",
    description: "Financial astrology, clearly mapped.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Fin-Lumen subscriber dashboard" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Fin-Lumen Subscriber Dashboard",
    description: "Financial astrology, clearly mapped.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
