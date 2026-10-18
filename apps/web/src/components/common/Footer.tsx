'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import BrandLogo from './BrandLogo';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribed(true);
    setTimeout(() => {
      setEmail('');
      setSubscribed(false);
    }, 4000);
  };

  return (
    <footer className="bg-[#0B3B2C] text-gray-300 text-xs pt-16 pb-10 border-t border-[#0F4C39]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Top 6-column Grid matching screenshot */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-6">
          {/* Column 1: Brand Info & Socials */}
          <div className="lg:col-span-3 space-y-4">
            <BrandLogo variant="dark" size="md" />
            <p className="text-xs text-emerald-100/70 max-w-sm leading-relaxed">
              Your guide to trusted home improvement professionals.
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-2.5 pt-2">
              {/* Facebook */}
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <svg className="w-3.5 h-3.5 fill-currentColor" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                </svg>
              </a>
              {/* Instagram */}
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <svg className="w-3.5 h-3.5 fill-currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              {/* YouTube */}
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                aria-label="YouTube"
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <svg className="w-3.5 h-3.5 fill-currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
              {/* LinkedIn */}
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <svg className="w-3.5 h-3.5 fill-currentColor" viewBox="0 0 24 24">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
              {/* Pinterest */}
              <a
                href="https://pinterest.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Pinterest"
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <svg className="w-3.5 h-3.5 fill-currentColor" viewBox="0 0 24 24">
                  <path d="M12 0a12 12 0 0 0-4.37 23.18c-.07-.94-.13-2.38.03-3.41.14-.94.94-3.99.94-3.99s-.24-.48-.24-1.19c0-1.12.65-1.95 1.46-1.95.69 0 1.02.52 1.02 1.14 0 .69-.44 1.73-.67 2.69-.19.8.4 1.46 1.19 1.46 1.43 0 2.53-1.51 2.53-3.69 0-1.93-1.39-3.28-3.37-3.28-2.46 0-3.91 1.85-3.91 3.75 0 .74.29 1.54.64 1.98.07.09.08.16.06.25-.07.28-.22.89-.25 1.01-.04.16-.13.2-.3.12-1.12-.52-1.82-2.15-1.82-3.46 0-2.82 2.05-5.41 5.91-5.41 3.1 0 5.51 2.21 5.51 5.16 0 3.08-1.94 5.56-4.64 5.56-.91 0-1.76-.47-2.05-1.03l-.56 2.13c-.2.78-.75 1.75-1.12 2.34A12 12 0 1 0 12 0z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Column 2: Popular Services */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">
              Popular Services
            </h4>
            <ul className="space-y-2 text-xs text-emerald-100/70">
              <li>
                <Link href="/contractors?service=Countertops" className="hover:text-white transition-colors">
                  Countertops
                </Link>
              </li>
              <li>
                <Link href="/contractors?service=Kitchen+Remodeling" className="hover:text-white transition-colors">
                  Kitchen Remodeling
                </Link>
              </li>
              <li>
                <Link href="/contractors?service=Bathroom+Remodeling" className="hover:text-white transition-colors">
                  Bathroom Remodeling
                </Link>
              </li>
              <li>
                <Link href="/contractors?service=Roofing" className="hover:text-white transition-colors">
                  Roofing
                </Link>
              </li>
              <li>
                <Link href="/contractors?service=HVAC" className="hover:text-white transition-colors">
                  HVAC
                </Link>
              </li>
              <li>
                <Link href="/contractors?service=Flooring" className="hover:text-white transition-colors">
                  Flooring
                </Link>
              </li>
              <li>
                <Link href="/contractors" className="hover:text-emerald-400 font-semibold transition-colors">
                  View all services &rarr;
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Browse by State */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">
              Browse by State
            </h4>
            <ul className="space-y-2 text-xs text-emerald-100/70">
              <li>
                <Link href="/contractors?state=Texas" className="hover:text-white transition-colors">
                  Texas
                </Link>
              </li>
              <li>
                <Link href="/contractors?state=California" className="hover:text-white transition-colors">
                  California
                </Link>
              </li>
              <li>
                <Link href="/contractors?state=Florida" className="hover:text-white transition-colors">
                  Florida
                </Link>
              </li>
              <li>
                <Link href="/contractors?state=New+York" className="hover:text-white transition-colors">
                  New York
                </Link>
              </li>
              <li>
                <Link href="/contractors?state=Illinois" className="hover:text-white transition-colors">
                  Illinois
                </Link>
              </li>
              <li>
                <Link href="/contractors?state=Ohio" className="hover:text-white transition-colors">
                  Ohio
                </Link>
              </li>
              <li>
                <a href="/#states" className="hover:text-emerald-400 font-semibold transition-colors">
                  View all states &rarr;
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: About */}
          <div className="lg:col-span-1 space-y-3">
            <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">
              About
            </h4>
            <ul className="space-y-2 text-xs text-emerald-100/70">
              <li>
                <a href="/#about" className="hover:text-white transition-colors">
                  About Us
                </a>
              </li>
              <li>
                <a href="/#how-it-works" className="hover:text-white transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <Link href="/blog" className="hover:text-white transition-colors">
                  Methodologies
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-white transition-colors">
                  Editorial Policy
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-white transition-colors">
                  Our Data Sources
                </Link>
              </li>
              <li>
                <a href="/#contractors" className="hover:text-white transition-colors">
                  Careers
                </a>
              </li>
              <li>
                <a href="/#faq" className="hover:text-white transition-colors">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>

          {/* Column 5: For Contractors */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">
              For Contractors
            </h4>
            <ul className="space-y-2 text-xs text-emerald-100/70">
              <li>
                <a href="/#contractors" className="hover:text-white transition-colors">
                  Join Our Network
                </a>
              </li>
              <li>
                <a href="/#contractors" className="hover:text-white transition-colors">
                  Claim Your Profile
                </a>
              </li>
              <li>
                <Link href="/blog" className="hover:text-white transition-colors">
                  Success Stories
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-white transition-colors">
                  Contractor Resources
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 6: Stay Updated */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">
              Stay Updated
            </h4>
            <p className="text-xs text-emerald-100/70 leading-relaxed">
              Get tips, guides and home improvement insights.
            </p>
            <form onSubmit={handleSubscribe} className="relative mt-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full bg-white text-gray-900 placeholder-gray-400 text-xs px-3.5 py-2.5 rounded-lg pr-10 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <button
                type="submit"
                aria-label="Subscribe to newsletter"
                className="absolute right-1.5 top-1.5 bottom-1.5 w-7 bg-[#DA5F2F] hover:bg-[#C44D29] text-white rounded-md flex items-center justify-center transition-colors cursor-pointer"
              >
                {subscribed ? <Check className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
              </button>
            </form>
            {subscribed && (
              <p className="text-[11px] text-emerald-400 animate-in fade-in">
                Thank you for subscribing!
              </p>
            )}
          </div>
        </div>

        {/* Bottom Sub-footer */}
        <div className="pt-8 border-t border-[#0F4C39] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-emerald-100/60">
          <p>&copy; 2026 Click Sailors. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <a href="#" className="hover:text-white transition-colors">
              Terms of Use
            </a>
            <span>|</span>
            <a href="#" className="hover:text-white transition-colors">
              Privacy Policy
            </a>
            <span>|</span>
            <a href="#" className="hover:text-white transition-colors">
              Cookie Policy
            </a>
            <span>|</span>
            <a href="#" className="hover:text-white transition-colors">
              Sitemap
            </a>
            <span className="hidden md:inline">|</span>
            <span className="text-emerald-100/40">Last updated: Sep 23, 2025</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
