'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Camera,
  Images,
  MapPin,
  Calendar,
  DollarSign,
  Layers,
} from 'lucide-react';
import type { RooferProvider, ProviderProjectItem } from '@/data/mockRoofers';
import PhotoLightboxModal from './PhotoLightboxModal';
import ProjectsModal from './ProjectsModal';

interface ProfileGalleryAndProjectsProps {
  provider: RooferProvider;
}

const INITIAL_VISIBLE_PROJECTS = 6;

export default function ProfileGalleryAndProjects({
  provider,
}: ProfileGalleryAndProjectsProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const [projectsModalOpen, setProjectsModalOpen] = useState(false);
  const [selectedProjectIndex, setSelectedProjectIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_PROJECTS);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_PROJECTS);
  }, [provider.slug]);

  // Authentic structured projects from DB — zero static fallbacks or invented titles
  const realProjects: ProviderProjectItem[] = useMemo(() => {
    return (provider.projects || []).filter(
      (proj) =>
        Boolean(proj?.title?.trim()) &&
        (Boolean(proj?.coverUrl) || (proj.photos && proj.photos.length > 0))
    );
  }, [provider.projects]);

  // Unified authentic work photo gallery (ListingPhotos + any additional project photos, deduplicated, excluding company logo)
  const galleryPhotos: string[] = useMemo(() => {
    const urls: string[] = [];
    const seen = new Set<string>();

    const pushUrl = (raw?: string) => {
      if (!raw || raw === provider.imageUrl) return;
      const baseKey = raw.split('?')[0];
      if (seen.has(baseKey)) return;
      seen.add(baseKey);
      urls.push(raw);
    };

    for (const item of provider.photos || []) {
      pushUrl(item?.url);
    }
    for (const proj of realProjects) {
      pushUrl(proj.coverUrl);
      for (const ph of proj.photos || []) {
        pushUrl(ph?.url);
      }
    }

    return urls;
  }, [provider.photos, provider.imageUrl, realProjects]);

  if (realProjects.length === 0 && galleryPhotos.length === 0) {
    return null;
  }

  const totalProjectPhotos = realProjects.reduce(
    (sum, p) => sum + (p.photoCount || p.photos?.length || 0),
    0
  );
  const visibleProjects = realProjects.slice(0, visibleCount);
  const remainingProjects = Math.max(0, realProjects.length - visibleProjects.length);

  const openLightbox = (index: number) => {
    setActivePhotoIndex(index);
    setLightboxOpen(true);
  };

  const openProjectAlbum = (projectIdx: number) => {
    setSelectedProjectIndex(projectIdx);
    setProjectsModalOpen(true);
  };

  return (
    <>
      <section id="projects" className="space-y-6">
        {/* ========================================================= */}
        {/* 1. AUTHENTIC STRUCTURED PROJECTS GRID (DB-DRIVEN)         */}
        {/* ========================================================= */}
        {realProjects.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-300/85 p-5 sm:p-6 space-y-5 shadow-[0_8px_28px_-4px_rgba(15,23,42,0.11),0_4px_10px_-2px_rgba(15,23,42,0.06)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight">
                    Projects
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-primary border border-orange-100">
                    <Layers className="w-3.5 h-3.5" />
                    {realProjects.length} {realProjects.length === 1 ? 'Album' : 'Albums'}
                    {totalProjectPhotos > 0 ? ` • ${totalProjectPhotos} Photos` : ''}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => openProjectAlbum(0)}
                className="text-xs sm:text-sm font-bold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>
                  {realProjects.length > 1
                    ? `View all ${realProjects.length} projects`
                    : 'Open project album'}
                </span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div
              className={`grid grid-cols-1 gap-5 items-stretch ${
                visibleProjects.length === 1
                  ? 'sm:grid-cols-2'
                  : visibleProjects.length === 2
                  ? 'sm:grid-cols-2'
                  : 'sm:grid-cols-2 lg:grid-cols-3'
              }`}
            >
              {visibleProjects.map((proj, idx) => {
                const coverSrc = proj.coverUrl || proj.photos?.[0]?.url;
                const count = proj.photoCount || proj.photos?.length || 0;
                const hasMeta = Boolean(
                  proj.location || proj.projectYear || proj.costRange || proj.serviceCategory
                );

                return (
                  <article
                    key={proj.id || proj.slug || idx}
                    onClick={() => openProjectAlbum(idx)}
                    className="group rounded-2xl border border-gray-300/90 overflow-hidden bg-white shadow-[0_6px_18px_-3px_rgba(15,23,42,0.10),0_2px_6px_-1px_rgba(15,23,42,0.06)] hover:shadow-[0_14px_30px_-4px_rgba(15,23,42,0.16),0_4px_12px_-2px_rgba(15,23,42,0.08)] hover:border-[#0B3B2C]/45 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col"
                  >
                    {/* Strict Fixed Height Image Frame (100% Uniform Across All Project Cards) */}
                    <div className="h-[210px] sm:h-[224px] w-full overflow-hidden bg-slate-100 relative shrink-0 border-b border-gray-200/80">
                      {coverSrc && (
                        <img
                          src={coverSrc}
                          alt={proj.title}
                          loading="lazy"
                          className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />

                      {count > 0 && (
                        <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-sm text-white text-[11px] font-bold shadow-sm">
                          <Images className="w-3.5 h-3.5" />
                          {count} {count === 1 ? 'Photo' : 'Photos'}
                        </span>
                      )}
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                      <div className="space-y-1.5">
                        <h3 className="text-sm sm:text-base font-bold text-gray-950 group-hover:text-primary transition-colors line-clamp-1">
                          {proj.title}
                        </h3>

                        {proj.description && (
                          <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                            {proj.description}
                          </p>
                        )}
                      </div>

                      {hasMeta ? (
                        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100">
                          {proj.location && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-gray-700 border border-gray-200/70">
                              <MapPin className="w-3 h-3 text-gray-500 shrink-0" />
                              <span className="truncate max-w-[160px]">{proj.location}</span>
                            </span>
                          )}
                          {proj.projectYear && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-gray-700 border border-gray-200/70">
                              <Calendar className="w-3 h-3 text-gray-500 shrink-0" />
                              {proj.projectYear}
                            </span>
                          )}
                          {proj.costRange && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                              <DollarSign className="w-3 h-3 text-emerald-600 shrink-0" />
                              {proj.costRange}
                            </span>
                          )}
                          {proj.serviceCategory && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-orange-50 text-primary border border-orange-200/70">
                              {proj.serviceCategory}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs font-bold text-[#0B3B2C] group-hover:text-primary transition-colors">
                          <span>View Project Album</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>

            {realProjects.length > INITIAL_VISIBLE_PROJECTS && (
              <div className="pt-1 flex flex-wrap items-center justify-center gap-3">
                {remainingProjects > 0 ? (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 12)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-slate-50 hover:border-gray-400 text-xs sm:text-sm font-bold text-gray-900 transition-all cursor-pointer shadow-sm"
                  >
                    <span>
                      Load Next {Math.min(12, remainingProjects)}{' '}
                      {Math.min(12, remainingProjects) === 1 ? 'Project' : 'Projects'}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-600" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setVisibleCount(INITIAL_VISIBLE_PROJECTS)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-slate-50 text-xs sm:text-sm font-semibold text-gray-600 hover:text-gray-900 transition-all cursor-pointer"
                  >
                    <span>Show Fewer Projects</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => openProjectAlbum(0)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-300 bg-slate-50 hover:bg-white hover:border-primary/50 text-xs sm:text-sm font-bold text-gray-900 hover:text-primary transition-all cursor-pointer shadow-sm"
                >
                  <Images className="w-4 h-4 text-primary" />
                  <span>Explore All {realProjects.length} Project Albums</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. ALL WORK PHOTOS BENTO GALLERY                          */}
        {/* ========================================================= */}
        {galleryPhotos.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-300/85 p-5 sm:p-6 space-y-4 shadow-[0_8px_28px_-4px_rgba(15,23,42,0.11),0_4px_10px_-2px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight">
                  Photo Gallery
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                  {galleryPhotos.length} {galleryPhotos.length === 1 ? 'Photo' : 'Photos'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => openLightbox(0)}
                className="text-xs sm:text-sm font-bold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>View all {galleryPhotos.length} photos</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {galleryPhotos.length === 1 ? (
              <div
                onClick={() => openLightbox(0)}
                className="h-64 sm:h-80 rounded-xl overflow-hidden border border-gray-200 relative group cursor-pointer bg-gray-50"
              >
                <img
                  src={galleryPhotos[0]}
                  alt={`${provider.name} work photo`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                {/* Feature Photo */}
                <div
                  onClick={() => openLightbox(0)}
                  className="sm:col-span-6 h-60 sm:h-72 lg:h-80 rounded-xl overflow-hidden border border-gray-200 relative group cursor-pointer bg-gray-50"
                >
                  <img
                    src={galleryPhotos[0]}
                    alt={`${provider.name} work photo 1`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                  </div>
                </div>

                {/* Right 2x2 Grid */}
                <div className="sm:col-span-6 grid grid-cols-2 gap-2.5 h-60 sm:h-72 lg:h-80">
                  {galleryPhotos.slice(1, 5).map((photo, idx) => {
                    const isLastTile = idx === 3 && galleryPhotos.length > 5;
                    const remaining = galleryPhotos.length - 5;
                    return (
                      <div
                        key={idx}
                        onClick={() => openLightbox(idx + 1)}
                        className="rounded-xl overflow-hidden border border-gray-200 relative group cursor-pointer bg-gray-50"
                      >
                        <img
                          src={photo}
                          alt={`${provider.name} work photo ${idx + 2}`}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        {isLastTile ? (
                          <div className="absolute inset-0 bg-black/55 hover:bg-black/65 transition-colors flex flex-col items-center justify-center text-white">
                            <span className="text-lg sm:text-xl font-black">+{remaining}</span>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-white/90">
                              More Photos
                            </span>
                          </div>
                        ) : (
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <Camera className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <ProjectsModal
        isOpen={projectsModalOpen}
        onClose={() => setProjectsModalOpen(false)}
        projects={realProjects}
        initialProjectIndex={selectedProjectIndex}
        providerName={provider.name}
      />

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
