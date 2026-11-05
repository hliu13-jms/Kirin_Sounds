import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Henglin Liu — KirinSounds麟",
  description: "Electronic music, modular synthesis, and photography by Henglin Liu.",
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
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
