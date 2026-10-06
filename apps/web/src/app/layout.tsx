import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  // Resolves relative image URLs (e.g. /api/storage/file?key=...) into absolute URLs for OG/Twitter tags
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://findyourexperts.com'),
  title: 'Top Roofing Contractors in New York, NY | FindYourExperts',
  description:
    'Compare the best residential and commercial roofing contractors based on authentic customer reviews, verified NYC DOB credentials, project quality, and transparent pricing.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[#F9FAFB] text-gray-950 selection:bg-primary selection:text-white">
        {children}
      </body>
    </html>
  );
}
