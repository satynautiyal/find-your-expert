'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Star,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  Award,
  FileText,
  Phone,
  Heart,
  Share2,
  Globe,
  Camera,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import type { RooferProvider } from '@/data/mockRoofers';
import { GoogleLogo, YelpLogo, HouzzLogo } from './PlatformLogos';
import PhotoLightboxModal from './PhotoLightboxModal';

interface ProfileHeroProps {
  provider: RooferProvider;
  onOpenQuoteModal: () => void;
  onScrollToReviews?: () => void;
}

export default function ProfileHero({
  provider,
  onOpenQuoteModal,
  onScrollToReviews,
}: ProfileHeroProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Dynamic Location & Category parsing for dynamic breadcrumbs
  const trade =
    provider.services?.find((s) => /Roof/i.test(s)) ? 'Roofing' :
    provider.services?.find((s) => /Cabinet|Millwork/i.test(s)) ? 'Custom Cabinets' :
    provider.services?.[0] || 'Home Improvement';

  // Parse state & city from address or borough
  const boroughOrCity = provider.borough && provider.borough !== 'All' ? provider.borough : 'Manhattan';
  const stateName =
    provider.address?.includes(' AL ') ? 'Alabama' :
    provider.address?.includes(' NY ') ? 'New York' :
    provider.address?.includes(' CA ') ? 'California' :
    provider.address?.includes(' TX ') ? 'Texas' : 'New York';

  // Sample photos list for gallery
  const mainPhoto =
    provider.imageUrl && !provider.imageUrl.includes('placeholder')
      ? provider.imageUrl
      : '/roofing-hero-house.jpg';

  const galleryPhotos = [
    mainPhoto,
    '/contractor-hero-house.png',
    '/contractor-hero-brick-house.png',
    '/about-house.jpg',
    '/hero-kitchen.jpg',
  ];

  const photoCount = Math.max(provider.photoCount || 28, galleryPhotos.length);
  const extraPhotosCount = Math.max(photoCount - 4, 24);

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleSaveToggle = () => {
    setIsSaved(!isSaved);
  };

  const openLightbox = (index: number) => {
    setActivePhotoIndex(index);
    setLightboxOpen(true);
  };

  // Dynamic Trust Score (90 - 98 range based on rating & credentials)
  const trustScore = Math.min(
    99,
    Math.max(
      88,
      Math.round(
        (provider.compositeRating || 4.8) * 18 +
          (provider.isLicensed ? 3 : 0) +
          (provider.isInsured ? 3 : 0)
      )
    )
  );

  return (
    <>
      <div className="space-y-4">
        {/* Dynamic Breadcrumbs */}
        <nav
          aria-label="Breadcrumbs"
          className="flex items-center flex-wrap gap-1.5 text-xs text-gray-500 font-medium py-2"
        >
          <Link href="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />

          <Link
            href={`/contractors?category=${encodeURIComponent(trade)}`}
            className="hover:text-primary transition-colors"
          >
            {trade}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />

          <Link
            href={`/contractors?state=${encodeURIComponent(stateName)}`}
            className="hover:text-primary transition-colors"
          >
            {stateName}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />

          <Link
            href={`/contractors?borough=${encodeURIComponent(boroughOrCity)}`}
            className="hover:text-primary transition-colors"
          >
            {boroughOrCity}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />

          <span className="font-bold text-gray-900 truncate max-w-[200px] sm:max-w-none">
            {provider.name}
          </span>
        </nav>

        {/* 3-Column Hero Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ========================================================= */}
          {/* COLUMN 1: PHOTO GALLERY (col-span-12 lg:col-span-4) */}
          {/* ========================================================= */}
          <div className="lg:col-span-4 space-y-2.5">
            {/* Main Featured Photo */}
            <div className="relative aspect-4/3 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200 shadow-sm group">
              <img
                src={mainPhoto}
                alt={provider.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
              />

              {/* Badges: #1 Top Rated */}
              <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
                <span className="bg-[#0B3B2C] text-white font-black text-xs px-2 py-0.5 rounded shadow-sm self-start">
                  #1
                </span>
                <span className="bg-[#EA580C] text-white font-bold text-[11px] px-2 py-0.5 rounded shadow-sm self-start">
                  Top Rated
                </span>
              </div>

              {/* View All Photos Button Overlay */}
              <button
                type="button"
                onClick={() => openLightbox(0)}
                className="absolute bottom-3 left-3 bg-black/75 hover:bg-black text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 backdrop-blur-xs transition-colors cursor-pointer shadow-md"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>View All Photos ({photoCount})</span>
              </button>
            </div>

            {/* Thumbnail Strip (4 images + 1 counter block) */}
            <div className="grid grid-cols-5 gap-2">
              {galleryPhotos.slice(0, 4).map((photo, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => openLightbox(idx)}
                  className="aspect-square rounded-xl overflow-hidden border border-gray-200 hover:border-primary transition-all cursor-pointer bg-gray-50 group"
                >
                  <img
                    src={photo}
                    alt=""
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                </button>
              ))}

              {/* +24 Photos Block */}
              <button
                type="button"
                onClick={() => openLightbox(4)}
                className="aspect-square rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 flex flex-col items-center justify-center text-slate-700 font-bold transition-all cursor-pointer"
              >
                <span className="text-xs font-black">+{extraPhotosCount}</span>
                <span className="text-[10px] text-slate-500 font-semibold leading-none">Photos</span>
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* COLUMN 2: CONTRACTOR IDENTITY & ACTIONS (lg:col-span-5) */}
          {/* ========================================================= */}
          <div className="lg:col-span-5 space-y-4">
            {/* Header: Logo + Title */}
            <div className="space-y-2">
              {/* Stylized Twin-Roof / Contractor Mark */}
              <div className="w-12 h-8 flex items-center">
                <svg viewBox="0 0 32 24" fill="none" className="w-10 h-7">
                  <path
                    d="M2.5 20.5L10 4.5C10.5 3.5 11.9 3.5 12.4 4.5L18.5 17.5"
                    stroke="#EA580C"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M13.5 17.5L19.6 4.5C20.1 3.5 21.5 3.5 22 4.5L29.5 20.5"
                    stroke="#EA580C"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight leading-tight">
                {provider.name}
              </h1>

              {/* Verified Professional Pill */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200/80">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Verified Professional</span>
              </div>
            </div>

            {/* Stars & Reviews Strip */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="font-bold text-sm text-gray-900">
                {(provider.compositeRating || 4.8).toFixed(1)}
              </span>
              <button
                onClick={onScrollToReviews}
                className="text-xs font-semibold text-gray-500 hover:text-primary transition-colors cursor-pointer"
              >
                ({provider.totalReviews || 126} reviews)
              </button>
            </div>

            {/* Tagline / Summary */}
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              {provider.tagline ||
                provider.description?.slice(0, 160) ||
                `Quality ${trade.toLowerCase()} solutions for ${boroughOrCity} homes since ${provider.sinceYear || 2008}. Specializing in premium workmanship and reliable service.`}
            </p>

            {/* 4-item Credential Grid (2x2) */}
            <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs font-medium text-gray-700">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500 shrink-0" />
                <span>{provider.yearsInBusiness || 15}+ years in business</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Licensed & Insured</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Warranty Available</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Free Estimates</span>
              </div>
            </div>

            {/* Action Buttons Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onOpenQuoteModal}
                className="flex-1 bg-[#EA580C] hover:bg-[#D94F0A] text-white font-bold text-sm py-3 px-6 rounded-xl shadow-md transition-all active:scale-[0.99] cursor-pointer text-center"
              >
                Get a Quote
              </button>

              <a
                href={`tel:${provider.phone.replace(/\D/g, '')}`}
                className="flex-1 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 font-bold text-sm py-3 px-4 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4 text-gray-600" />
                <span>Call {provider.displayPhone || provider.phone}</span>
              </a>
            </div>

            {/* Secondary Action Row: Save | Share | Visit Website */}
            <div className="flex items-center gap-6 pt-1 text-xs font-semibold text-gray-600">
              <button
                type="button"
                onClick={handleSaveToggle}
                className="flex items-center gap-1.5 hover:text-gray-900 transition-colors cursor-pointer"
              >
                <Heart
                  className={`w-4 h-4 ${
                    isSaved ? 'fill-rose-500 text-rose-500' : 'text-gray-500'
                  }`}
                />
                <span>{isSaved ? 'Saved' : 'Save'}</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1.5 hover:text-gray-900 transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-gray-500" />
                <span>{copiedLink ? 'Copied Link!' : 'Share'}</span>
              </button>

              {provider.website && (
                <a
                  href={provider.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-primary transition-colors"
                >
                  <Globe className="w-4 h-4 text-gray-500" />
                  <span>Visit Website</span>
                </a>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* COLUMN 3: TRUST SCORE & CUSTOMER RATINGS (lg:col-span-3) */}
          {/* ========================================================= */}
          <div className="lg:col-span-3 space-y-3.5">
            {/* Trust Score Card */}
            <div className="bg-[#F8FAFC] border border-gray-200/90 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                    Trust Score
                  </span>
                  <div className="w-16 h-12 rounded-xl bg-teal-50 border border-teal-200/70 flex items-center justify-center mt-1">
                    <span className="text-2xl font-black text-[#0B3B2C] tracking-tight">
                      {trustScore}
                    </span>
                  </div>
                </div>

                {/* Checklist on the right */}
                <div className="space-y-1.5 text-xs font-semibold text-gray-700">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>License Verified</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Insurance Verified</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Business Verified</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Reviews Analyzed</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Ratings Card */}
            <div className="bg-white border border-gray-200/90 rounded-2xl p-4 space-y-3 shadow-xs">
              <h3 className="font-bold text-xs sm:text-sm text-gray-900">Customer Ratings</h3>

              <div className="space-y-2.5 text-xs">
                {/* Google */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <GoogleLogo className="w-4 h-4" />
                    <span className="font-medium text-gray-700">Google</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="font-bold text-gray-900">
                      {provider.reviews.google?.rating || 4.8}
                    </span>
                    <span className="text-gray-400">
                      ({provider.reviews.google?.count || 89})
                    </span>
                  </div>
                </div>

                {/* Yelp */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <YelpLogo className="w-4 h-4" />
                    <span className="font-medium text-gray-700">Yelp</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="font-bold text-gray-900">
                      {provider.reviews.yelp?.rating || 4.6}
                    </span>
                    <span className="text-gray-400">
                      ({provider.reviews.yelp?.count || 24})
                    </span>
                  </div>
                </div>

                {/* Houzz */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HouzzLogo className="w-4 h-4" />
                    <span className="font-medium text-gray-700">Houzz</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <span className="font-bold text-gray-900">
                      {provider.reviews.houzz?.rating || provider.reviews.facebook?.rating || 4.7}
                    </span>
                    <span className="text-gray-400">
                      ({provider.reviews.houzz?.count || provider.reviews.facebook?.count || 13})
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer link to jump to reviews section */}
              <div className="pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onScrollToReviews}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>See all reviews</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      <PhotoLightboxModal
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        photos={galleryPhotos}
        initialIndex={activePhotoIndex}
        providerName={provider.name}
      />
    </>
  );
}
