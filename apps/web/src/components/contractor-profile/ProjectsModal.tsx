'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Images,
  LayoutGrid,
  MapPin,
  Calendar,
  DollarSign,
  Layers,
} from 'lucide-react';
import type { ProviderProjectItem } from '@/data/mockRoofers';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: ProviderProjectItem[];
  initialProjectIndex?: number;
  initialPhotoIndex?: number;
  providerName: string;
}

export default function ProjectsModal({
  isOpen,
  onClose,
  projects,
  initialProjectIndex = 0,
  initialPhotoIndex = 0,
  providerName,
}: ProjectsModalProps) {
  const [selectedProjectIdx, setSelectedProjectIdx] = useState(initialProjectIndex);
  const [currentPhotoIdx, setCurrentPhotoIdx] = useState(initialPhotoIndex);
  const [viewMode, setViewMode] = useState<'SLIDESHOW' | 'GRID'>('SLIDESHOW');
  const [descExpanded, setDescExpanded] = useState(false);

  const safeProjectIdx = Math.min(
    Math.max(0, selectedProjectIdx),
    Math.max(0, projects.length - 1)
  );
  const activeProject = projects[safeProjectIdx];

  const activePhotos = useMemo(() => {
    if (!activeProject) return [];
    if (activeProject.photos && activeProject.photos.length > 0) {
      return activeProject.photos.filter((p) => Boolean(p?.url));
    }
    if (activeProject.coverUrl) {
      return [{ id: `${activeProject.id}-cover`, url: activeProject.coverUrl }];
    }
    return [];
  }, [activeProject]);

  const hasMultiplePhotos = activePhotos.length > 1;

  const [emblaMainRef, emblaMainApi] = useEmblaCarousel({
    loop: hasMultiplePhotos,
    align: 'center',
  });

  const [emblaThumbsRef, emblaThumbsApi] = useEmblaCarousel({
    containScroll: 'keepSnaps',
    dragFree: true,
    align: 'center',
  });

  const onSelectSlide = useCallback(() => {
    if (!emblaMainApi) return;
    const idx = emblaMainApi.selectedScrollSnap();
    setCurrentPhotoIdx(idx);
    emblaThumbsApi?.scrollTo(idx);
  }, [emblaMainApi, emblaThumbsApi]);

  useEffect(() => {
    if (!isOpen) return;
    const clampedProjIdx = Math.min(
      Math.max(0, initialProjectIndex),
      Math.max(0, projects.length - 1)
    );
    setSelectedProjectIdx(clampedProjIdx);
    setCurrentPhotoIdx(initialPhotoIndex || 0);
    setViewMode('SLIDESHOW');
    setDescExpanded(false);
  }, [isOpen, initialProjectIndex, initialPhotoIndex, projects.length]);

  useEffect(() => {
    if (!emblaMainApi || !isOpen || viewMode !== 'SLIDESHOW') return;
    emblaMainApi.reInit();
    const targetIdx = Math.min(
      Math.max(0, currentPhotoIdx),
      Math.max(0, activePhotos.length - 1)
    );
    emblaMainApi.scrollTo(targetIdx, true);
    emblaThumbsApi?.reInit();
    emblaThumbsApi?.scrollTo(targetIdx, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emblaMainApi, emblaThumbsApi, safeProjectIdx, isOpen, viewMode]);

  useEffect(() => {
    if (!emblaMainApi) return;
    onSelectSlide();
    emblaMainApi.on('select', onSelectSlide);
    emblaMainApi.on('reInit', onSelectSlide);
    return () => {
      emblaMainApi.off('select', onSelectSlide);
      emblaMainApi.off('reInit', onSelectSlide);
    };
  }, [emblaMainApi, onSelectSlide]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (viewMode === 'SLIDESHOW') {
        if (e.key === 'ArrowLeft') emblaMainApi?.scrollPrev();
        if (e.key === 'ArrowRight') emblaMainApi?.scrollNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, emblaMainApi, viewMode]);

  if (!isOpen || projects.length === 0 || !activeProject) return null;

  const handleSelectProject = (idx: number) => {
    setSelectedProjectIdx(idx);
    setCurrentPhotoIdx(0);
    setDescExpanded(false);
    if (emblaMainApi) {
      emblaMainApi.scrollTo(0, true);
    }
  };

  const currentPhoto = activePhotos[currentPhotoIdx];
  const hasMetadata = Boolean(
    activeProject.location ||
      activeProject.projectYear ||
      activeProject.costRange ||
      activeProject.serviceCategory
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${providerName} projects`}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end lg:items-center justify-center lg:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full h-[93dvh] lg:h-[88vh] lg:max-w-6xl rounded-t-2xl lg:rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
      >
        {/* Top Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-gray-200 flex items-center justify-between gap-3 bg-white shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-primary border border-orange-100 shrink-0">
                <Layers className="w-3 h-3" />
                {projects.length} {projects.length === 1 ? 'Project' : 'Projects'}
              </span>
              <h3 className="text-sm sm:text-base font-black text-gray-950 truncate">
                {providerName}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activePhotos.length > 1 && (
              <div className="inline-flex items-center rounded-lg border border-gray-200 p-0.5 bg-gray-50">
                <button
                  type="button"
                  onClick={() => setViewMode('SLIDESHOW')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'SLIDESHOW'
                      ? 'bg-white text-gray-950 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Images className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Slideshow</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('GRID')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'GRID'
                      ? 'bg-white text-gray-950 shadow-2xs'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">All Photos</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close projects modal"
              className="p-2 rounded-full text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Horizontal Project Switcher Strip */}
        {projects.length > 1 && (
          <div className="lg:hidden border-b border-gray-200 bg-slate-50/80 px-3 py-2 overflow-x-auto shrink-0">
            <div className="flex items-center gap-2">
              {projects.map((proj, idx) => {
                const isSelected = idx === safeProjectIdx;
                const thumb = proj.coverUrl || proj.photos?.[0]?.url;
                return (
                  <button
                    key={proj.id || idx}
                    type="button"
                    onClick={() => handleSelectProject(idx)}
                    className={`flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl border text-left shrink-0 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white border-primary shadow-2xs ring-1 ring-primary/20'
                        : 'bg-white/70 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {thumb && (
                      <img
                        src={thumb}
                        alt=""
                        className="w-8 h-8 rounded-lg object-cover shrink-0 bg-gray-100"
                      />
                    )}
                    <div className="min-w-0 max-w-[150px]">
                      <p
                        className={`text-xs font-bold truncate ${
                          isSelected ? 'text-primary' : 'text-gray-900'
                        }`}
                      >
                        {proj.title}
                      </p>
                      <p className="text-[10px] text-gray-500 font-medium">
                        {proj.photoCount || proj.photos?.length || 0}{' '}
                        {(proj.photoCount || proj.photos?.length || 0) === 1 ? 'photo' : 'photos'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Body: Desktop Sidebar + Main Project Stage */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          {/* Desktop Left Project Album Sidebar */}
          {projects.length > 1 && (
            <aside className="hidden lg:flex lg:w-72 xl:w-80 border-r border-gray-200 bg-slate-50/60 flex-col shrink-0 overflow-y-auto p-3 space-y-2">
              {projects.map((proj, idx) => {
                const isSelected = idx === safeProjectIdx;
                const thumb = proj.coverUrl || proj.photos?.[0]?.url;
                const count = proj.photoCount || proj.photos?.length || 0;
                return (
                  <button
                    key={proj.id || idx}
                    type="button"
                    onClick={() => handleSelectProject(idx)}
                    className={`w-full flex items-center gap-3 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white border-primary shadow-xs ring-1 ring-primary/20'
                        : 'bg-white/60 border-gray-200/80 hover:bg-white hover:border-gray-300'
                    }`}
                  >
                    {thumb && (
                      <div className="w-16 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                        <img
                          src={thumb}
                          alt={proj.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h4
                        className={`text-xs font-bold line-clamp-2 leading-snug ${
                          isSelected ? 'text-primary' : 'text-gray-900'
                        }`}
                      >
                        {proj.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500">
                        <span className="font-semibold">
                          {count} {count === 1 ? 'photo' : 'photos'}
                        </span>
                        {proj.location && (
                          <>
                            <span>•</span>
                            <span className="truncate">{proj.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </aside>
          )}

          {/* Main Project Details + Photos Stage */}
          <div className="flex-1 min-h-0 flex flex-col overflow-y-auto bg-white">
            {/* Authentic Project Metadata Header */}
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 space-y-2 shrink-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="text-base sm:text-xl font-black text-gray-950 tracking-tight">
                  {activeProject.title}
                </h2>
                {viewMode === 'SLIDESHOW' && activePhotos.length > 0 && (
                  <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full shrink-0">
                    Photo {currentPhotoIdx + 1} of {activePhotos.length}
                  </span>
                )}
              </div>

              {hasMetadata && (
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  {activeProject.location && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-gray-700">
                      <MapPin className="w-3.5 h-3.5 text-gray-500" />
                      {activeProject.location}
                    </span>
                  )}
                  {activeProject.projectYear && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-gray-700">
                      <Calendar className="w-3.5 h-3.5 text-gray-500" />
                      {activeProject.projectYear}
                    </span>
                  )}
                  {activeProject.costRange && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-100">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                      {activeProject.costRange}
                    </span>
                  )}
                  {activeProject.serviceCategory && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-orange-50 text-primary border border-orange-100">
                      {activeProject.serviceCategory}
                    </span>
                  )}
                </div>
              )}

              {activeProject.description && (
                <div className="pt-1">
                  <p
                    className={`text-xs sm:text-sm text-gray-600 leading-relaxed ${
                      descExpanded ? '' : 'line-clamp-2'
                    }`}
                  >
                    {activeProject.description}
                  </p>
                  {activeProject.description.length > 160 && (
                    <button
                      type="button"
                      onClick={() => setDescExpanded((v) => !v)}
                      className="text-xs font-bold text-primary hover:underline mt-0.5 cursor-pointer"
                    >
                      {descExpanded ? 'Show less' : 'Read full project description'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Viewer Body */}
            {viewMode === 'SLIDESHOW' ? (
              <div className="flex-1 min-h-[300px] flex flex-col justify-between bg-slate-950 p-3 sm:p-5 select-none">
                <div className="relative flex-1 min-h-[240px] flex items-center justify-center overflow-hidden">
                  {hasMultiplePhotos && (
                    <button
                      type="button"
                      onClick={() => emblaMainApi?.scrollPrev()}
                      aria-label="Previous project photo"
                      className="absolute left-2 sm:left-4 z-20 p-2 sm:p-2.5 rounded-full bg-black/50 hover:bg-black/75 text-white border border-white/20 backdrop-blur-xs transition-all cursor-pointer active:scale-95"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  )}

                  <div
                    ref={emblaMainRef}
                    className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex h-full items-center touch-pan-y">
                      {activePhotos.map((ph, idx) => (
                        <div
                          key={ph.id || idx}
                          className="flex-[0_0_100%] min-w-0 h-full flex flex-col items-center justify-center px-1 sm:px-12"
                        >
                          <img
                            src={ph.url}
                            alt={ph.caption || `${activeProject.title} — Photo ${idx + 1}`}
                            draggable={false}
                            className="max-h-[46vh] sm:max-h-[54vh] max-w-full object-contain rounded-lg shadow-xl"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {hasMultiplePhotos && (
                    <button
                      type="button"
                      onClick={() => emblaMainApi?.scrollNext()}
                      aria-label="Next project photo"
                      className="absolute right-2 sm:right-4 z-20 p-2 sm:p-2.5 rounded-full bg-black/50 hover:bg-black/75 text-white border border-white/20 backdrop-blur-xs transition-all cursor-pointer active:scale-95"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                </div>

                {currentPhoto?.caption &&
                  currentPhoto.caption.toLowerCase() !== activeProject.title.toLowerCase() && (
                    <p className="text-center text-xs text-white/80 mt-2 line-clamp-1 px-4">
                      {currentPhoto.caption}
                    </p>
                  )}

                {hasMultiplePhotos && (
                  <div className="w-full max-w-3xl mx-auto pt-3">
                    <div ref={emblaThumbsRef} className="overflow-hidden py-1">
                      <div className="flex items-center gap-2">
                        {activePhotos.map((ph, idx) => {
                          const isCurrent = idx === currentPhotoIdx;
                          return (
                            <button
                              key={`proj-thumb-${ph.id || idx}`}
                              type="button"
                              onClick={() => emblaMainApi?.scrollTo(idx)}
                              aria-label={`View photo ${idx + 1}`}
                              className={`shrink-0 w-16 h-12 sm:w-20 sm:h-14 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                                isCurrent
                                  ? 'border-white opacity-100 scale-105 shadow-md'
                                  : 'border-transparent opacity-50 hover:opacity-85'
                              }`}
                            >
                              <img
                                src={ph.url}
                                alt=""
                                draggable={false}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 sm:p-6 grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50/40">
                {activePhotos.map((ph, idx) => (
                  <button
                    key={`grid-${ph.id || idx}`}
                    type="button"
                    onClick={() => {
                      setCurrentPhotoIdx(idx);
                      setViewMode('SLIDESHOW');
                    }}
                    className="group relative aspect-4/3 rounded-xl overflow-hidden border border-gray-200 bg-gray-100 cursor-pointer text-left"
                  >
                    <img
                      src={ph.url}
                      alt={ph.caption || `${activeProject.title} — Photo ${idx + 1}`}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/65 text-white text-[10px] font-bold backdrop-blur-xs">
                      #{idx + 1}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

