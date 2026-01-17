import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { RootProviders } from "@/components/root-providers";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "ListenLayer — Turn your blog into audio",
  description: "Paste a URL, get an audio version. Embed the player, track what people listen to.",
  openGraph: {
    title: "ListenLayer — Turn your blog into audio",
    description: "Paste a URL, get an audio version. Embed the player, track what people listen to.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${newsreader.variable} antialiased`}>
        <RootProviders>{children}</RootProviders>
        <Analytics />
      </body>
    </html>
  );
}
