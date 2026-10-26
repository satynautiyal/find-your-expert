'use client';

import React, { useState } from 'react';
import { ChevronRight, Camera, ExternalLink } from 'lucide-react';
import type { RooferProvider } from '@/data/mockRoofers';
import PhotoLightboxModal from './PhotoLightboxModal';

interface ProfileGalleryAndProjectsProps {
  provider: RooferProvider;
}

export default function ProfileGalleryAndProjects({
  provider,
}: ProfileGalleryAndProjectsProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const isRoofing = provider.services?.some((s) => /Roof/i.test(s)) ?? true;
  const borough = provider.borough && provider.borough !== 'All' ? provider.borough : 'Manhattan';

  // Photos for gallery
  const photos = [
    provider.imageUrl && !provider.imageUrl.includes('placeholder')
      ? provider.imageUrl
      : '/roofing-hero-house.jpg',
    '/contractor-hero-house.png',
    '/contractor-hero-brick-house.png',
    '/about-house.jpg',
    '/hero-kitchen.jpg',
  ];

  // 3 Recent Projects
  const roofingProjects = [
    {
      title: 'Full Roof Replacement',
      location: `${borough}, NY`,
      type: 'Residential',
      image: '/roofing-hero-clean.png',
    },
    {
      title: 'Metal Roofing Installation',
      location: 'Brooklyn, NY',
      type: 'Residential',
      image: '/contractor-hero-house.png',
    },
    {
      title: 'Storm Damage Repair',
      location: 'Queens, NY',
      type: 'Residential',
      image: '/about-house.jpg',
    },
  ];

  const cabinetProjects = [
    {
      title: 'Custom Kitchen Cabinetry',
      location: `${borough}, NY`,
      type: 'Residential',
      image: '/hero-kitchen.jpg',
    },
    {
      title: 'Modern Walk-In Wardrobe',
      location: 'Brooklyn, NY',
      type: 'Residential',
      image: '/contractor-hero-brick-house.png',
    },
    {
      title: 'Architectural Reception Millwork',
      location: 'Queens, NY',
      type: 'Commercial',
      image: '/about-house.jpg',
    },
  ];

  const projects = isRoofing ? roofingProjects : cabinetProjects;

  const openLightbox = (index: number) => {
    setActivePhotoIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
      <div id="projects" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================= */}
        {/* LEFT COLUMN: PHOTO GALLERY (col-span-12 lg:col-span-6) */}
        {/* ========================================================= */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-gray-200/90 p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight">
              Photo Gallery
            </h2>
            <button
              type="button"
              onClick={() => openLightbox(0)}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>View all photos</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Photo Gallery Grid: 1 Big Left + 4 Small Right (2x2) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            {/* Big Feature Left Photo (7 cols) */}
            <div
              onClick={() => openLightbox(0)}
              className="sm:col-span-7 h-48 sm:h-56 rounded-xl overflow-hidden border border-gray-200 relative group cursor-pointer"
            >
              <img
                src={photos[0]}
                alt={`${provider.name} project photo 1`}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
              </div>
            </div>

            {/* 2x2 Grid of 4 Photos on Right (5 cols) */}
            <div className="sm:col-span-5 grid grid-cols-2 gap-2 h-48 sm:h-56">
              {photos.slice(1, 5).map((photo, idx) => (
                <div
                  key={idx}
                  onClick={() => openLightbox(idx + 1)}
                  className="rounded-xl overflow-hidden border border-gray-200 relative group cursor-pointer bg-gray-50"
                >
                  <img
                    src={photo}
                    alt={`${provider.name} project photo ${idx + 2}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Camera className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: RECENT PROJECTS (col-span-12 lg:col-span-6) */}
        {/* ========================================================= */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-gray-200/90 p-5 sm:p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight">
              Recent Projects
            </h2>
            <button
              type="button"
              onClick={() => openLightbox(0)}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>View all projects</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 3 Project Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {projects.map((proj, idx) => (
              <div
                key={idx}
                onClick={() => openLightbox(idx)}
                className="rounded-xl border border-gray-200/90 overflow-hidden bg-slate-50/50 hover:bg-white hover:border-primary/40 hover:shadow-2xs transition-all cursor-pointer group flex flex-col justify-between"
              >
                <div className="h-28 overflow-hidden bg-gray-100 relative">
                  <img
                    src={proj.image}
                    alt={proj.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-2.5 space-y-1">
                  <h4 className="text-xs font-bold text-gray-900 group-hover:text-primary transition-colors line-clamp-1">
                    {proj.title}
                  </h4>
                  <p className="text-[11px] text-gray-500">{proj.location}</p>
                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700">
                    {proj.type}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <PhotoLightboxModal
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        photos={photos}
        initialIndex={activePhotoIndex}
        providerName={provider.name}
      />
    </>
  );
}
