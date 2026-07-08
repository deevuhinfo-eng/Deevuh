import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "DEEVUH — Where Divine Meets Contemporary",
  description:
    "Discover curated luxury fashion that bridges tradition and modernity. Premium Indian fashion with editorial aesthetics and artisanal craftsmanship.",
  keywords: ["fashion", "luxury", "Indian fashion", "contemporary", "ethnic wear", "designer"],
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  other: {
    "theme-color": "#98111E",
    "msapplication-TileColor": "#98111E",
  },
};

import { GoogleOAuthProvider } from '@react-oauth/google';
import { CartProvider } from '@/context/CartContext';
import CartDrawer from '@/components/cart/CartDrawer';
import Diagnostics from '@/components/Diagnostics';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}>
          <CartProvider>
            {children}
            <CartDrawer />
            <Diagnostics />
            <Analytics />
          </CartProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
