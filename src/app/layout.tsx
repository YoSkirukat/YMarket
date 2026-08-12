import type { Metadata } from "next";
import { Golos_Text } from "next/font/google";
import { NavigationProgress } from "@/components/NavigationProgress";
import "./globals.css";

const golos = Golos_Text({
  variable: "--font-golos",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Digital Seller — Яндекс Маркет",
  description: "MVP для продажи электронных товаров на Яндекс Маркете",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className={`${golos.variable} antialiased`}>
        <NavigationProgress />
        {children}
      </body>
    </html>
  );
}
