import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
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
      <body className={`${inter.variable} ${instrumentSerif.variable} antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
