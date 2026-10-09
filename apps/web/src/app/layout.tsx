import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  // Resolves relative image URLs (e.g. /api/storage/file?key=...) into absolute URLs for OG/Twitter tags
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://findyourexperts.com'),
  title: 'Top Roofing Contractors in New York, NY | FindYourExperts',
  description:
    'Compare the best residential and commercial roofing contractors based on authentic customer reviews, verified NYC DOB credentials, project quality, and transparent pricing.',
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
    <html lang="en">
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
      <body className="antialiased min-h-screen bg-[#F9FAFB] text-gray-950 selection:bg-primary selection:text-white">
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
