import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { InstallPromptListener } from "@/components/install/install-prompt-listener";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "AquaClass Connect", template: "%s · AquaClass Connect" },
  description: "Calendario, presenze e focus delle lezioni di nuoto per le scuole",
  applicationName: "AquaClass Connect",
  icons: {
    icon: [
      { url: "/brand/aquaclass-mark.svg", type: "image/svg+xml" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, title: "AquaClass", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#0052CC" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="it"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <InstallPromptListener />
        {children}
      </body>
    </html>
  );
}
