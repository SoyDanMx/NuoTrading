import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter"
});

export const metadata: Metadata = {
  title: "NUO TRADE - Análisis Técnico de Acciones",
  description: "Plataforma de análisis técnico y trading algorítmico",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased bg-gray-900" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
