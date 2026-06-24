import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
});

export const metadata: Metadata = {
  title: "Simulateur Crypto | S'investir",
  description: "Simulez vos gains...",
};

export default function RootLayout({ children }:
  Readonly<{ children: React.ReactNode;}>) {
  return (
    <html
      lang="fr"
      className={`${lexend.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-border">
          <div className="mx-auto max-w-5xl px-4 py-3">
            <img src="/logo.svg" alt="S'investir" className="h-8 w-auto" />
          </div>
        </header>
        {children}
        <footer className="border-t border-border mt-auto">
          <div className="mx-auto max-w-5xl px-4 py-6 text-center text-sm text-text-muted">
            &copy; {new Date().getFullYear()} S&apos;investir — Simulateur à but pédagogique
          </div>
        </footer>
      </body>
    </html>
  );
}
