import type { Metadata } from "next";
import { Anton } from "next/font/google";
import "./globals.css";

const anton = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-anton",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SYSTEM.V1 - NUO TRADE",
  description: "Plataforma de análisis técnico y trading algorítmico",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={anton.variable}>
      <body className="antialiased bg-black text-white" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
