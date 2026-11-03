import type { Metadata } from 'next';
import Script from 'next/script';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  // Resolves relative image URLs (e.g. /api/storage/file?key=...) into absolute URLs for OG/Twitter tags
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://prosvetted.com'),
  title: 'ProsVetted - Find the Best Home Improvement & Roofing Contractors',
  description:
    'Your guide to trusted home improvement professionals. Compare verified contractors, real customer reviews, and pricing insights across the USA.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/android-chrome-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'ProsVetted - We vet. You pick.',
    description:
      'Your guide to trusted home improvement professionals. Compare verified contractors, real customer reviews, and pricing insights across the USA.',
    images: [
      {
        url: '/website-share-image-1200x630.png',
        width: 1200,
        height: 630,
        alt: 'ProsVetted - We vet. You pick.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ProsVetted - We vet. You pick.',
    description:
      'Your guide to trusted home improvement professionals. Compare verified contractors, real customer reviews, and pricing insights across the USA.',
    images: ['/website-share-image-1200x630.png'],
  },
  verification: {
    google: 'yqQ1qJ8-abqYTo5SDXR8RbAf3pjJO7bmiZszTRRohkU',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={plusJakarta.variable}>
      <head>
        {/* Google Tag Manager */}
        <Script
          id="google-tag-manager"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-K8SG3ZR3');`,
          }}
        />
      </head>
      <body className={`${plusJakarta.className} antialiased min-h-screen bg-[#F9FAFB] text-gray-950 selection:bg-primary selection:text-white`}>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-K8SG3ZR3"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        {children}
      </body>
    </html>
  );
}
