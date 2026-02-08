import type { Metadata } from "next";
import { GeistPixelSquare } from "geist/font/pixel";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yuri Bodo | Coming Soon",
  description: "Building something awesome. Stay tuned.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${GeistPixelSquare.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
