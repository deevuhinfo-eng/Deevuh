import type { Metadata } from "next";
import { Noto_Serif, Inter } from "next/font/google";
import "./globals.css";

const notoSerif = Noto_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DEEVUH — Where Divine Meets Contemporary",
  description:
    "Discover curated luxury fashion that bridges tradition and modernity. Premium Indian fashion with editorial aesthetics and artisanal craftsmanship.",
  keywords: ["fashion", "luxury", "Indian fashion", "contemporary", "ethnic wear", "designer"],
};

import { GoogleOAuthProvider } from '@react-oauth/google';
import { CartProvider } from '@/context/CartContext';
import CartDrawer from '@/components/cart/CartDrawer';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${notoSerif.variable} ${inter.variable}`}>
      <body>
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}>
          <CartProvider>
            {children}
            <CartDrawer />
          </CartProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
