import "./globals.css";
import React from "react";
import type { Metadata } from "next";
import Header from "@/components/Header";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "AI Email Sorter",
  description:
    "Connect Gmail accounts, create categories, and let AI summarize & sort your emails.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <Header />

        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>

        <footer className="border-t bg-white">
          <div className="max-w-6xl mx-auto px-4 py-4 text-sm text-slate-600 text-center">
            <span>© {new Date().getFullYear()} AI Email Sorter</span>
            <span className="mx-2">·</span>
            <a href="/privacy" className="hover:underline">
              Privacy
            </a>
            <span className="mx-2">·</span>
            <a href="/terms" className="hover:underline">
              Terms
            </a>
          </div>
        </footer>
        <Toaster />
      </body>
    </html>
  );
}
