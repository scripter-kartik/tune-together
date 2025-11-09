import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Tune Together",
  description: "Listen to music together",

  icons: {
    icon: "/icon2.png", 
  },

  openGraph: {
    title: "Tune Together",
    description: "Listen to music together",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Tune Together Preview",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="font-sans antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
