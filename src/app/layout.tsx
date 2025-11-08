// src/app/layout.tsx

"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { useActivityTracker } from "@/hooks/useActivityTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Wrapper component to use the hook
function ActivityWrapper({ children }: { children: React.ReactNode }) {
  // Track user activity automatically
  useActivityTracker();
  
  return <>{children}</>;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ActivityWrapper>
            {children}
          </ActivityWrapper>
        </body>
      </html>
    </ClerkProvider>
  );
}