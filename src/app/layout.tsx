import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import GlobalPlayer from "@/components/GlobalPlayer";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "Tune Together",
  description: "Listen to music together",
  referrer: "no-referrer",

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
        <body className="font-sans antialiased bg-black overflow-hidden h-[100dvh] w-full flex flex-col">
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {children}
          </div>
          <GlobalPlayer />
        </body>
      </html>
    </ClerkProvider>
  );
}
