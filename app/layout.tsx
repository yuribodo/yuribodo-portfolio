import type { Metadata } from "next";
import { archivo, jetbrainsMono } from "@/lib/fonts";
import { SmoothScroll } from "@/components/providers/smooth-scroll";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yuri Bodo | Creative Frontend Developer",
  description:
    "Creative frontend developer crafting immersive web experiences with obsessive attention to animation and interaction.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${archivo.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
