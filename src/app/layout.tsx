import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar/NavBar";

// Load Google Fonts and assign them to CSS variables so they can be used throughout the app
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Page metadata used by Next.js for SEO (title tag, meta description, etc.)
export const metadata: Metadata = {
  title: "TaskFlow",
  description: "TaskFlow is a task management application",
};

// RootLayout wraps every page in the app.
// It provides the HTML shell, global styles, fonts, and the persistent NavBar sidebar.
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
