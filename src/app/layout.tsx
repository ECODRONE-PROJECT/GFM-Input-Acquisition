import type { Metadata } from 'next';
import { Outfit } from 'next/font/google';
import './globals.css';

// Outfit is a geometric sans-serif that closely mimics the structured technical elegance of Sophisto 
const outfit = Outfit({ 
  subsets: ['latin'], 
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap' 
});

export const metadata: Metadata = {
  title: 'Grow For Me - Input Acquisition',
  description: 'Order seeds, fertilizers, and other inputs with aggregated demand.',
  icons: {
    icon: '/gfm_logo_small_transparent.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={outfit.className}>
      <body>
        {children}
      </body>
    </html>
  );
}
