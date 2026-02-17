import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Autoapply - AI-Powered Job Application Platform",
  description: "Autonomous job search, CV generation, and interview preparation powered by AI",
};

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
