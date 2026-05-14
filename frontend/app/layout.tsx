import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NUO TRADE | Smart Finance",
  description: "Advanced Algorithmic Trading & Analysis",
};

import ClientDiagnostics from "@/components/ClientDiagnostics";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${playfair.variable}`}>
      <body className="antialiased bg-black text-white selection:bg-blue-500/30" suppressHydrationWarning>
        <ClientDiagnostics />
        {children}
      </body>
    </html>
  );
}
