import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar/NavBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TaskFlow",
  description: "TaskFlow is a task management application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning prevents errors caused by browser extensions
    // (e.g. Grammarly, LastPass) that inject attributes into <html> or <body>
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        {/* NavBar is fixed on the left side (255px wide) */}
        <NavBar />
        {/* Main content area is offset to the right of the NavBar */}
        <main
          style={{
            marginLeft: "255px",
            padding: "2rem",
            paddingTop: "1.5rem",
          }}
        >
          {children}
        </main>
      </body>
    </html>
  );
}
