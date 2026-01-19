// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Local Pulse Dashboard",
  description: "Simple café analytics dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full bg-[#F3F6F9]">
      <body
        className={`
          min-h-screen w-full bg-[#F3F6F9] text-[#0B1220] antialiased
          ${geistSans.variable} ${geistMono.variable}
        `}
      >
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
